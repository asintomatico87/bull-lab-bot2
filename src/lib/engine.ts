import { timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { barActions, cycles, orders, webhookEvents, type Cycle } from "@/db/schema";
import { executeOrder } from "./exchange";
import { parsePayload, isSupportedCoin, redactRawBody, type ParsedSignal } from "./payload";
import { getMid } from "./prices";
import { getSettings, getSymbolConfigs, type EffectiveSettings } from "./settings";
import {
  MAX_BUYS_PER_CYCLE,
  TIMEFRAME_MINUTES,
  floorToBar,
  isNearBarClose,
  nextBuyTier,
  nextExitStep,
  pnlPct,
  tierDef,
  upcomingExit,
  type ExitStep,
} from "./strategy";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SignalStatus = "executed" | "ignored" | "rejected" | "error";

export type SignalResult = {
  httpStatus: number;
  ok: boolean;
  status: SignalStatus;
  code: string;
  message: string;
  /** Salvato nel log ma NON restituito al chiamante. */
  detail?: Record<string, unknown>;
};

export type SignalInput = {
  source: "tradingview" | "simulator" | "selftest";
  rawBody: string;
  query: URLSearchParams;
  ip?: string | null;
  contentType?: string | null;
  userAgent?: string | null;
  headerSecret?: string | null;
  now?: Date;
};

type EventMeta = { coin?: string; action?: string; tier?: number; parsed?: unknown };

const res = (
  httpStatus: number,
  status: SignalStatus,
  code: string,
  message: string,
  detail?: Record<string, unknown>,
): SignalResult => ({
  httpStatus,
  ok: status === "executed" || status === "ignored",
  status,
  code,
  message,
  detail,
});

const safeEqual = (a: string, b: string) => {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
};

const fmt = (n: number, d = 2) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtQty = (n: number) => Number(n.toFixed(6)).toString();

async function lockCoin(tx: Tx, coin: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"bulllab:" + coin}))`);
}

async function getOpenCycle(tx: Tx, coin: string): Promise<Cycle | undefined> {
  const [c] = await tx
    .select()
    .from(cycles)
    .where(and(eq(cycles.coin, coin), eq(cycles.status, "open")))
    .limit(1);
  return c;
}

/** Reclama (coin, tipo, candela). Ritorna null se già presente = duplicato. */
async function claim(tx: Tx, coin: string, kind: string, barTime: Date): Promise<number | null> {
  const rows = await tx
    .insert(barActions)
    .values({ coin, kind, barTime })
    .onConflictDoNothing()
    .returning({ id: barActions.id });
  return rows[0]?.id ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

export async function handleSignal(input: SignalInput): Promise<SignalResult> {
  const started = Date.now();
  const meta: EventMeta = {};
  let result: SignalResult;
  try {
    result = await processSignal(input, meta);
  } catch (e) {
    result = res(500, "error", "EXCEPTION", e instanceof Error ? e.message : String(e), {
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 4) : undefined,
    });
  }

  const durationMs = Date.now() - started;
  console.log(
    `[webhook:${input.source}] ${result.status.toUpperCase()} ${result.code} ${meta.coin ?? "-"} ${meta.action ?? "-"} — ${result.message} (${durationMs}ms)`,
  );

  try {
    await db.insert(webhookEvents).values({
      source: input.source,
      ip: input.ip ?? null,
      contentType: input.contentType ?? null,
      userAgent: input.userAgent ?? null,
      rawBody: redactRawBody(input.rawBody).slice(0, 4000),
      parsed: (meta.parsed as object | undefined) ?? null,
      status: result.status,
      code: result.code,
      message: result.message,
      coin: meta.coin ?? null,
      action: meta.action ?? null,
      tier: meta.tier ?? null,
      detail: result.detail ?? null,
      durationMs,
    });
  } catch (e) {
    console.error("[webhook] impossibile salvare il log evento", e);
  }
  return result;
}

async function processSignal(input: SignalInput, meta: EventMeta): Promise<SignalResult> {
  const now = input.now ?? new Date();

  if (input.rawBody.length > 20_000) {
    return res(413, "rejected", "BODY_TOO_LARGE", "Body troppo grande.");
  }

  const parsed = parsePayload(input.rawBody, input.query, input.headerSecret);
  if (!parsed.ok) {
    meta.parsed = parsed.parsed;
    return res(400, "rejected", parsed.code, parsed.message);
  }
  const sig = parsed.signal;
  meta.parsed = parsed.parsed;
  meta.coin = sig.coin;
  meta.action = sig.action;
  meta.tier = sig.tier;

  const settings = await getSettings();

  // 1) Autenticazione
  if (input.source !== "simulator") {
    if (!sig.secret) {
      return res(401, "rejected", "AUTH_MISSING", "Secret mancante nel messaggio dell'alert.", {
        hint: 'Aggiungi "secret":"…" al JSON (vedi pagina Setup).',
      });
    }
    if (!safeEqual(sig.secret, settings.effectiveSecret)) {
      return res(401, "rejected", "AUTH_FAILED", "Secret non valido.", {
        hint: `Ricevuto ${sig.secret.length} caratteri (inizia con "${sig.secret.slice(0, 3)}…"), atteso ${settings.effectiveSecret.length} caratteri. ${
          settings.secretFromEnv
            ? "Il bot usa la variabile d'ambiente WEBHOOK_SECRET (che ha priorità sul secret in DB)."
            : "Il bot usa il secret salvato nel DB (pagina Setup)."
        }`,
      });
    }
  }

  if (sig.action === "PING") {
    return res(200, "ignored", "PING_OK", "Connessione e secret OK. Nessun ordine eseguito (azione PING).");
  }

  // 2) Simbolo e timeframe
  if (!sig.coin) {
    return res(422, "rejected", "MISSING_SYMBOL", "Manca il simbolo (campo 'symbol').");
  }
  if (!isSupportedCoin(sig.coin)) {
    return res(
      422,
      "rejected",
      "SYMBOL_UNSUPPORTED",
      `Simbolo '${sig.rawSymbol}' → '${sig.coin}' non supportato (solo BTC ed ETH).`,
    );
  }
  const coin = sig.coin;
  if (sig.tfMinutes !== undefined && sig.tfMinutes !== TIMEFRAME_MINUTES) {
    return res(
      422,
      "rejected",
      "TF_MISMATCH",
      `Timeframe '${sig.rawTf}' ≠ 3H. Il grafico su cui hai creato l'alert non è a 3H (l'interval di TradingView per 3H è "180").`,
    );
  }

  const configs = await getSymbolConfigs();
  const cfg = configs.find((c) => c.coin === coin);
  if (!cfg || !cfg.enabled) {
    return res(200, "ignored", "COIN_DISABLED", `${coin} è disattivato nelle impostazioni.`);
  }

  // 3) Prezzo e candela
  let price = sig.price;
  let priceSource = "alert";
  if (!(price && price > 0)) {
    const mid = await getMid(coin);
    if (!mid) {
      return res(
        422,
        "rejected",
        "NO_PRICE",
        "Nessun prezzo nel messaggio e prezzo Hyperliquid non raggiungibile. Aggiungi \"price\":{{close}}.",
      );
    }
    price = mid;
    priceSource = "hyperliquid-mid";
  }
  const barTime = floorToBar(sig.barTime ?? now);
  const ctx: Ctx = { coin, price, barTime, sig, settings, unitUsd: cfg.unitUsd, now, priceSource };

  if (sig.action === "BUY") return handleBuy(ctx);
  return handleSell(ctx, input.source);
}

type Ctx = {
  coin: string;
  price: number;
  barTime: Date;
  sig: ParsedSignal;
  settings: EffectiveSettings;
  unitUsd: number;
  now: Date;
  priceSource: string;
};

/* -------------------------------------------------------------------------- */
/*  BUY                                                                       */
/* -------------------------------------------------------------------------- */

async function handleBuy(ctx: Ctx): Promise<SignalResult> {
  const { sig, settings, coin } = ctx;

  if (settings.killSwitch) {
    return res(200, "ignored", "KILL_SWITCH", "Kill-switch attivo: nuovi acquisti sospesi.");
  }
  if (sig.vapi === undefined && sig.tier === undefined) {
    return res(
      422,
      "rejected",
      "MISSING_VAPI",
      'BUY senza "vapi" né "rung": il bot non può verificare il livello VAPI. Aggiungi "vapi":{{plot("VAPI")}} o "rung":1|2|3.',
    );
  }

  return db.transaction(async (tx) => {
    await lockCoin(tx, coin);
    let cycle = await getOpenCycle(tx, coin);
    const buyCount = cycle?.buyCount ?? 0;

    // R1 — massimo 3 BUY per ciclo
    if (buyCount >= MAX_BUYS_PER_CYCLE) {
      return res(200, "ignored", "MAX_BUYS_REACHED", `Già ${MAX_BUYS_PER_CYCLE} BUY nel ciclo: il ladder è pieno.`);
    }
    // R5 — in uscita il ladder non si incrementa (come `sells == 0` nel Pine)
    if (cycle && cycle.exitStage > 0 && !settings.allowBuyAfterPartial) {
      return res(
        200,
        "ignored",
        "CYCLE_IN_EXIT",
        "Il ciclo ha già eseguito una vendita: nuovi BUY non consentiti (R5, impostazione).",
      );
    }

    const expected = nextBuyTier(buyCount)!;
    // R5 — ladder in ordine: si riempie solo lo scaglione atteso
    if (sig.tier !== undefined && sig.tier !== expected.tier) {
      if (cycle?.filledTiers.includes(sig.tier)) {
        return res(200, "ignored", "TIER_ALREADY_FILLED", `Scaglione ${sig.tier} già eseguito in questo ciclo.`);
      }
      return res(
        200,
        "ignored",
        "RUNG_OUT_OF_ORDER",
        `Il payload indica lo scaglione ${sig.tier}, ma il ladder è allo scaglione ${expected.tier}: nel codice Pine si riempie solo il prossimo scaglione (R5).`,
        { buyCount, expectedTier: expected.tier },
      );
    }
    // R4 — livello VAPI
    if (sig.vapi !== undefined && sig.vapi > expected.vapi) {
      return res(
        200,
        "ignored",
        "VAPI_ABOVE_LEVEL",
        `VAPI ${fmt(sig.vapi)} non ha toccato il livello ${expected.vapi} dello scaglione ${expected.tier}.`,
      );
    }

    // R2 — un solo BUY per candela 3H
    const claimId = await claim(tx, coin, "BUY", ctx.barTime);
    if (claimId === null) {
      return res(
        200,
        "ignored",
        "DUPLICATE_BAR",
        `Esiste già un BUY su questa candela 3H (R2: massimo un acquisto per candela).`,
        { barTime: ctx.barTime.toISOString() },
      );
    }

    try {
      if (!cycle) {
        [cycle] = await tx.insert(cycles).values({ coin, mode: settings.mode }).returning();
      }
      const mode = cycle.mode as "paper" | "live";
      const notional = ctx.unitUsd * expected.size;
      const exec = await executeOrder({
        mode,
        coin,
        side: "BUY",
        qty: notional / ctx.price,
        refPrice: ctx.price,
      });

      const cost = exec.qty * exec.price;
      const newQty = cycle.qty + exec.qty;
      const newAvg = (cycle.qty * cycle.avgEntry + cost) / newQty;

      await tx.insert(orders).values({
        cycleId: cycle.id,
        coin,
        side: "BUY",
        tier: expected.tier,
        reason: `BUY scaglione ${expected.tier} · VAPI ≤ ${expected.vapi} · ${expected.size}×`,
        mode,
        price: exec.price,
        qty: exec.qty,
        notionalUsd: cost,
        barTime: ctx.barTime,
        exchange: {
          ...exec.raw,
          vapi: sig.vapi ?? null,
          priceSource: ctx.priceSource,
          payloadSize: sig.sizeHint ?? null,
        },
      });
      const [updated] = await tx
        .update(cycles)
        .set({
          qty: newQty,
          avgEntry: newAvg,
          buyCount: cycle.buyCount + 1,
          filledTiers: [...cycle.filledTiers, expected.tier],
          totalCostUsd: cycle.totalCostUsd + cost,
        })
        .where(eq(cycles.id, cycle.id))
        .returning();
      cycle = updated;

      return res(
        200,
        "executed",
        "BUY_EXECUTED",
        `BUY T${expected.tier} ${coin} ${fmtQty(exec.qty)} @ ${fmt(exec.price)} ($${fmt(cost)}, ${expected.size}×, VAPI ${sig.vapi !== undefined ? fmt(sig.vapi) : "n/d"}) [${mode}]`,
        {
          cycleId: cycle.id,
          buyCount: cycle.buyCount,
          avgEntry: cycle.avgEntry,
          tier: expected.tier,
          vapi: sig.vapi ?? null,
          payloadSize: sig.sizeHint ?? null,
        },
      );
    } catch (e) {
      await tx.delete(barActions).where(eq(barActions.id, claimId));
      throw e;
    }
  });
}

/* -------------------------------------------------------------------------- */
/*  SELL (chiusura 3H)                                                        */
/* -------------------------------------------------------------------------- */

const MIN_ORDER_USD = 11; // minimo Hyperliquid ≈ $10

async function exitCycle(
  tx: Tx,
  cycle: Cycle,
  step: ExitStep,
  stageIndex: number,
  price: number,
  barTime: Date | null,
  reason: string,
): Promise<{ cycle: Cycle; text: string }> {
  let closeAll = step.sellFraction >= 1;
  let qty = closeAll ? cycle.qty : cycle.qty * step.sellFraction;
  if (!closeAll && (cycle.qty - qty) * price < MIN_ORDER_USD) {
    qty = cycle.qty; // il residuo sarebbe sotto il minimo d'ordine → chiude tutto
    closeAll = true;
  }
  const mode = cycle.mode as "paper" | "live";
  const exec = await executeOrder({ mode, coin: cycle.coin, side: "SELL", qty, refPrice: price, reduceOnly: true });

  const remaining = Math.max(0, cycle.qty - exec.qty);
  const closed = remaining <= 0 || (closeAll && remaining * exec.price < 1);
  const pnlUsd = (exec.price - cycle.avgEntry) * exec.qty;
  const pct = pnlPct(exec.price, cycle.avgEntry);

  await tx.insert(orders).values({
    cycleId: cycle.id,
    coin: cycle.coin,
    side: "SELL",
    exitStage: stageIndex + 1,
    reason,
    mode,
    price: exec.price,
    qty: exec.qty,
    notionalUsd: exec.qty * exec.price,
    pnlUsd,
    pnlPct: pct,
    barTime,
    exchange: exec.raw,
  });

  const [updated] = await tx
    .update(cycles)
    .set({
      qty: closed ? 0 : remaining,
      exitStage: stageIndex + 1,
      proceedsUsd: cycle.proceedsUsd + exec.qty * exec.price,
      realizedPnlUsd: cycle.realizedPnlUsd + pnlUsd,
      ...(closed ? { status: "closed", closedAt: new Date(), closeReason: reason } : {}),
    })
    .where(eq(cycles.id, cycle.id))
    .returning();

  return {
    cycle: updated,
    text: `SELL ${cycle.coin} ${fmtQty(exec.qty)} @ ${fmt(exec.price)} (${pct >= 0 ? "+" : ""}${fmt(pct)}%, ${pnlUsd >= 0 ? "+" : ""}$${fmt(pnlUsd)}) — ${reason}${closed ? " — CICLO CHIUSO" : ""} [${mode}]`,
  };
}

async function handleSell(ctx: Ctx, source: SignalInput["source"]): Promise<SignalResult> {
  const { coin, price, settings } = ctx;

  if (source !== "simulator" && settings.enforceCloseWindow && !isNearBarClose(ctx.now)) {
    return res(
      200,
      "ignored",
      "NOT_AT_BAR_CLOSE",
      "SELL ricevuto a metà candela: le uscite sono valide solo alla chiusura 3H. L'alert di uscita deve essere 'Una volta per chiusura barra' (Once Per Bar Close).",
      { receivedAt: ctx.now.toISOString() },
    );
  }

  const vapi = ctx.sig.vapi;
  if (vapi === undefined) {
    return res(
      422,
      "rejected",
      "MISSING_VAPI",
      'CLOSE_LONG/BAR_CLOSE senza "vapi": le uscite dipendono dai livelli VAPI (0/5/12/15/22). Aggiungi "vapi" al messaggio dell\'alert.',
    );
  }

  return db.transaction(async (tx) => {
    await lockCoin(tx, coin);
    let cycle = await getOpenCycle(tx, coin);
    if (!cycle) {
      return res(200, "ignored", "NO_OPEN_CYCLE", `Nessun ciclo aperto su ${coin}: niente da vendere.`);
    }

    const pct = pnlPct(price, cycle.avgEntry);
    let hit = nextExitStep(cycle.buyCount, cycle.exitStage, vapi);
    if (!hit) {
      const up = upcomingExit(cycle.buyCount, cycle.exitStage);
      return res(
        200,
        "ignored",
        "TARGET_NOT_REACHED",
        `VAPI ${fmt(vapi)} — ${up ? `serve ${up.label}` : "piano di uscita esaurito"} (BUY nel ciclo: ${cycle.buyCount}, uscite già fatte: ${cycle.exitStage}).`,
        {
          vapi,
          pnlPct: pct,
          buyCount: cycle.buyCount,
          exitStage: cycle.exitStage,
          payloadClosePct: ctx.sig.closePct ?? null,
        },
      );
    }

    const claimId = await claim(tx, coin, "EXIT", ctx.barTime);
    if (claimId === null) {
      return res(200, "ignored", "DUPLICATE_BAR", "Uscita già eseguita su questa candela 3H.");
    }

    const done: string[] = [];
    let failure: unknown = null;
    while (hit && cycle.status === "open") {
      try {
        const out = await exitCycle(tx, cycle, hit.step, hit.stageIndex, price, ctx.barTime, hit.step.label);
        cycle = out.cycle;
        done.push(out.text);
      } catch (e) {
        failure = e;
        break;
      }
      if (!settings.multiStagePerBar) break;
      hit = cycle.status === "open" ? nextExitStep(cycle.buyCount, cycle.exitStage, vapi) : null;
    }

    if (!done.length) {
      await tx.delete(barActions).where(eq(barActions.id, claimId));
      throw failure ?? new Error("Uscita non eseguita");
    }
    return res(200, "executed", "SELL_EXECUTED", done.join(" | "), {
      cycleId: cycle.id,
      error: failure ? String(failure) : undefined,
    });
  });
}

/* -------------------------------------------------------------------------- */
/*  Azioni manuali                                                            */
/* -------------------------------------------------------------------------- */

export async function manualCloseCycle(cycleId: number): Promise<{ ok: boolean; message: string }> {
  const [c] = await db.select().from(cycles).where(eq(cycles.id, cycleId));
  if (!c || c.status !== "open") return { ok: false, message: "Ciclo non trovato o già chiuso." };
  const price = await getMid(c.coin);
  if (!price) return { ok: false, message: "Prezzo Hyperliquid non raggiungibile: impossibile chiudere." };

  try {
    const text = await db.transaction(async (tx) => {
      await lockCoin(tx, c.coin);
      const cycle = await getOpenCycle(tx, c.coin);
      if (!cycle) throw new Error("Ciclo già chiuso.");
      const step: ExitStep = { minVapi: -Infinity, sellFraction: 1, label: "Chiusura manuale" };
      const out = await exitCycle(tx, cycle, step, cycle.exitStage, price, null, "Chiusura manuale");
      return out.text;
    });
    return { ok: true, message: text };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
