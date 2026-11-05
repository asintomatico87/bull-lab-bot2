import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { tradingBots, tradeOrders, webhookLogs } from "@/db/schema";

const TF_MS = 3 * 60 * 60 * 1000;
const FEE_PCT = 0.035;

type PlanTarget = { level: number; fractionPct: number };
type LadderState = {
  buys: number;
  sells: number;
  lastBuyCandle: number | null;
  investedUsdt: number;
  positionQty: number;
  avgEntry: number;
  feesPaidUsdt: number;
  lastVapi: number | null;
  lastSignalAt: string | null;
};

function assetOf(value: unknown): "BTC" | "ETH" | null {
  const symbol = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (symbol === "BTC" || symbol.endsWith("BTCUSDT") || symbol.endsWith("BTCUSD") || symbol.endsWith("BTCUSDC")) return "BTC";
  if (symbol === "ETH" || symbol.endsWith("ETHUSDT") || symbol.endsWith("ETHUSD") || symbol.endsWith("ETHUSDC")) return "ETH";
  return null;
}

function safePayload(payload: Record<string, unknown>) {
  const safe = { ...payload };
  if ("secret" in safe) safe.secret = "[REDACTED]";
  return JSON.stringify(safe).slice(0, 2000);
}

function validNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ladderState(config: Record<string, any>): LadderState {
  const state = config.ladderState ?? {};
  return {
    buys: Math.max(0, Math.floor(Number(state.buys) || 0)),
    sells: Math.max(0, Math.floor(Number(state.sells) || 0)),
    lastBuyCandle: state.lastBuyCandle !== null && state.lastBuyCandle !== undefined && Number.isFinite(Number(state.lastBuyCandle)) ? Number(state.lastBuyCandle) : null,
    investedUsdt: Math.max(0, Number(state.investedUsdt) || 0),
    positionQty: Math.max(0, Number(state.positionQty ?? state.qty) || 0),
    avgEntry: Math.max(0, Number(state.avgEntry) || 0),
    feesPaidUsdt: Math.max(0, Number(state.feesPaidUsdt) || 0),
    lastVapi: Number.isFinite(Number(state.lastVapi)) ? Number(state.lastVapi) : null,
    lastSignalAt: typeof state.lastSignalAt === "string" ? state.lastSignalAt : null,
  };
}

async function logRejected(payload: Record<string, any>, status: string) {
  await db.insert(webhookLogs).values({
    ticker: String(payload.ticker ?? "UNKNOWN").slice(0, 40),
    action: String(payload.action ?? "UNKNOWN").slice(0, 40),
    price: validNumber(payload.price) ? String(payload.price) : "0",
    rawPayload: safePayload(payload),
    status,
    sourceIp: "tradingview-webhook",
  });
}

export async function POST(request: Request) {
  let payload: Record<string, any>;
  try {
    payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("JSON object required");
  } catch {
    return NextResponse.json({ error: "Il body del webhook deve essere un oggetto JSON valido." }, { status: 400 });
  }

  const secret = typeof payload.secret === "string" ? payload.secret : "";
  const ticker = String(payload.ticker ?? "");
  const action = String(payload.action ?? "").toUpperCase();
  const phase = String(payload.phase ?? "").toLowerCase();
  const vapi = validNumber(payload.vapi);
  const price = validNumber(payload.price);
  const size = validNumber(payload.size);
  const symbolAsset = assetOf(ticker);
  const eventId = String(payload.eventId ?? createHash("sha256").update(JSON.stringify(payload)).digest("hex")).slice(0, 200);

  if (!secret) {
    await logRejected(payload, "REJECTED_MISSING_SECRET");
    return NextResponse.json({ error: "Secret webhook mancante." }, { status: 401 });
  }

  const [matchedBot] = await db
    .select()
    .from(tradingBots)
    .where(eq(tradingBots.webhookSecret, secret))
    .limit(1);

  if (!matchedBot) {
    await logRejected(payload, "REJECTED_BAD_SECRET");
    return NextResponse.json({ error: "Secret sconosciuta." }, { status: 403 });
  }

  const botAsset = assetOf(matchedBot.pair);
  if (!botAsset || symbolAsset !== botAsset) {
    await logRejected(payload, "REJECTED_SYMBOL_MISMATCH");
    return NextResponse.json({ error: "Il ticker dell'alert non corrisponde all'asset del bot." }, { status: 409 });
  }
  if (matchedBot.strategyKey !== "vapi_ladder" || String(payload.strategy ?? "").toUpperCase() !== "VAPI_LADDER_3H" || String(payload.timeframe ?? "").toUpperCase() !== "3H") {
    await logRejected(payload, "REJECTED_STRATEGY_DISABLED");
    return NextResponse.json({ error: "Sono accettati solo alert VAPI_LADDER_3H sul timeframe 3H." }, { status: 409 });
  }
  if (!["BUY_LONG", "CLOSE_LONG"].includes(action)) {
    await logRejected(payload, "REJECTED_ACTION");
    return NextResponse.json({ error: "Azione non ammessa per VAPI Ladder: usa BUY_LONG o CLOSE_LONG." }, { status: 422 });
  }
  if (price === null || price <= 0 || vapi === null || size === null || size <= 0) {
    await logRejected(payload, "REJECTED_INVALID_FIELDS");
    return NextResponse.json({ error: "price, size e vapi devono essere numeri validi e positivi (vapi può essere negativo)." }, { status: 422 });
  }
  if ((action === "BUY_LONG" && phase !== "intrabar") || (action === "CLOSE_LONG" && phase !== "close")) {
    await logRejected(payload, "REJECTED_INVALID_PHASE");
    return NextResponse.json({ error: "Fase non valida: gli acquisti devono essere intrabar e le chiusure a candle close." }, { status: 422 });
  }

  const incomingState = (matchedBot.config ?? {}) as Record<string, unknown>;
  const levels = [-25, -32, -40];
  const multipliers = [1, 1.5, 2.5];
  const baseSize = Number(incomingState.baseSizeUsdt ?? matchedBot.orderSizeUsdt ?? 500);
  const plans: Record<string, PlanTarget[]> = {
    "1": [{ level: 12, fractionPct: 100 }],
    "2": [{ level: 5, fractionPct: 50 }, { level: 15, fractionPct: 100 }],
    "3": [{ level: 0, fractionPct: 50 }, { level: 15, fractionPct: 50 }, { level: 22, fractionPct: 100 }],
  };
  if (!Number.isFinite(baseSize) || baseSize < 10 || baseSize > 1_000_000_000) {
    await logRejected(payload, "REJECTED_INVALID_BOT_CONFIG");
    return NextResponse.json({ error: "Size base del bot non valida; nessun fill paper creato." }, { status: 409 });
  }
  const candleTimestamp = validNumber(payload.barTimestamp);
  const candleBucket = Math.floor((candleTimestamp ?? Date.now()) / TF_MS);
  const safeRaw = safePayload(payload);

  try {
    const outcome = await db.transaction(async (tx) => {
      // Serialize signals for this bot so two simultaneous alerts cannot both fill the same rung.
      await tx.execute(sql`select pg_advisory_xact_lock(${matchedBot.id})`);

      const [bot] = await tx.select().from(tradingBots).where(eq(tradingBots.id, matchedBot.id)).limit(1);
      if (!bot) return { error: "Bot non trovato.", status: 404 } as const;
      const config = { ...((bot.config ?? {}) as Record<string, any>) };
      const state = ladderState(config);

      // Claim a stable event id inside the transaction; a TradingView retry becomes a no-op.
      const claimed = await tx.insert(webhookLogs).values({
        eventId,
        ticker: ticker.slice(0, 40),
        action,
        price: String(price),
        rawPayload: safeRaw,
        status: "PROCESSING",
        sourceIp: "tradingview-webhook",
      }).onConflictDoNothing({ target: webhookLogs.eventId }).returning({ id: webhookLogs.id });
      if (claimed.length === 0) return { duplicate: true } as const;

      const reject = async (message: string, status: string, httpStatus = 409) => {
        await tx.update(webhookLogs).set({ status }).where(eq(webhookLogs.id, claimed[0].id));
        return { error: message, status: httpStatus } as const;
      };

      if (bot.status !== "active") return await reject("Bot in pausa: segnale registrato ma non simulato.", "IGNORED_BOT_PAUSED", 409);
      if (bot.mode !== "paper") return await reject("Esecuzione live disabilitata: il progetto non è ancora collegato a un exchange.", "REJECTED_LIVE_DISABLED", 409);

      const currentPlans: PlanTarget[] = plans[String(state.buys)] ?? [];
      let orderQty = 0;
      let notional = 0;
      let pnl = 0;
      let note = "";

      if (action === "BUY_LONG") {
        if (state.buys >= levels.length) return await reject("Scala piena: non sono ammessi altri acquisti.", "REJECTED_LADDER_FULL");
        if (state.sells > 0) return await reject("Dopo la prima vendita non sono ammessi nuovi acquisti nel ciclo.", "REJECTED_BUY_AFTER_SELL");
        if (state.lastBuyCandle === candleBucket) return await reject("È già stato effettuato un acquisto in questa candela 3H.", "REJECTED_CANDLE_DUPLICATE");
        const rung = state.buys;
        const expectedLevel = levels[rung];
        if (!Number.isFinite(expectedLevel) || vapi > expectedLevel) return await reject(`Il prossimo gradino richiede VAPI ≤ ${expectedLevel}.`, "REJECTED_VAPI_LEVEL", 422);
        const expectedNotional = baseSize * (multipliers[rung] ?? 1);
        notional = size * price;
        if (Math.abs(notional - expectedNotional) > Math.max(2, expectedNotional * 0.03)) {
          return await reject(`Size non coerente con il gradino: attesi circa ${expectedNotional} USDT.`, "REJECTED_SIZE_MISMATCH", 422);
        }
        orderQty = size;
        const buyFee = notional * FEE_PCT / 100;
        state.positionQty += orderQty;
        state.investedUsdt += notional;
        state.avgEntry = state.positionQty > 0 ? state.investedUsdt / state.positionQty : 0;
        state.feesPaidUsdt += buyFee;
        state.buys += 1;
        state.lastBuyCandle = candleBucket;
        note = `PAPER TradingView VAPI Ladder: gradino ${rung + 1}, ${multipliers[rung] ?? 1}x, VAPI ${vapi}. Nessun ordine inviato a un exchange.`;
      } else {
        if (state.buys < 1 || state.positionQty <= 0 || state.avgEntry <= 0) return await reject("Non risulta una posizione paper aperta da chiudere.", "REJECTED_NO_POSITION");
        const target = currentPlans[state.sells];
        if (!target) return await reject("Il piano di uscita per questo ciclo è già completato.", "REJECTED_NO_TARGET");
        if (vapi < target.level) return await reject(`Il target corrente richiede VAPI ≥ ${target.level}.`, "REJECTED_VAPI_TARGET", 422);
        const closePct = validNumber(payload.closePct);
        const targetLevel = validNumber(payload.targetLevel);
        if (closePct === null || Math.abs(closePct - target.fractionPct) > 0.01) return await reject(`Percentuale di chiusura non valida: il target richiede ${target.fractionPct}%.`, "REJECTED_CLOSE_PERCENT", 422);
        if (targetLevel === null || Math.abs(targetLevel - target.level) > 0.01) return await reject("targetLevel non corrisponde al target corrente.", "REJECTED_TARGET_MISMATCH", 422);
        orderQty = target.fractionPct >= 100 ? state.positionQty : state.positionQty * target.fractionPct / 100;
        if (Math.abs(size - orderQty) > Math.max(1e-8, orderQty * 0.02)) return await reject("La quantità da chiudere non corrisponde alla percentuale prevista del residuo.", "REJECTED_CLOSE_SIZE", 422);
        orderQty = Math.min(orderQty, state.positionQty);
        notional = orderQty * price;
        const allocatedEntryFees = state.positionQty > 0 ? state.feesPaidUsdt * (orderQty / state.positionQty) : 0;
        const exitFee = notional * FEE_PCT / 100;
        const costBasis = orderQty * state.avgEntry;
        pnl = (notional - costBasis) - allocatedEntryFees - exitFee;
        state.positionQty = Math.max(0, state.positionQty - orderQty);
        state.investedUsdt = Math.max(0, state.investedUsdt - costBasis);
        state.feesPaidUsdt = Math.max(0, state.feesPaidUsdt - allocatedEntryFees);
        state.sells += 1;
        note = `PAPER TradingView VAPI Ladder: chiuso ${target.fractionPct}% del residuo a VAPI ${vapi} (target ${target.level}); PnL simulato da prezzi e fee, non da exchange.`;
        if (target.fractionPct >= 100 || state.sells >= currentPlans.length || state.positionQty <= 1e-10) {
          state.buys = 0;
          state.sells = 0;
          state.lastBuyCandle = null;
          state.investedUsdt = 0;
          state.positionQty = 0;
          state.avgEntry = 0;
          state.feesPaidUsdt = 0;
        } else {
          state.avgEntry = state.positionQty > 0 ? state.investedUsdt / state.positionQty : 0;
        }
      }

      state.lastVapi = vapi;
      state.lastSignalAt = new Date().toISOString();
      config.ladderState = state;
      const [order] = await tx.insert(tradeOrders).values({
        botId: bot.id,
        pair: bot.pair,
        type: action,
        price: String(price),
        amount: String(orderQty),
        totalUsdt: String(notional),
        status: "PAPER_FILLED",
        pnlUsdt: String(pnl),
        pnlPct: notional > 0 ? String((pnl / notional) * 100) : "0",
        source: "PAPER_TRADINGVIEW",
        notes: note,
        platform: "paper_trading",
      }).returning();

      await tx.update(tradingBots).set({
        config,
        totalPnL: String((Number(bot.totalPnL) + pnl).toFixed(2)),
        winCount: action === "CLOSE_LONG" && pnl > 0 ? bot.winCount + 1 : bot.winCount,
        lossCount: action === "CLOSE_LONG" && pnl < 0 ? bot.lossCount + 1 : bot.lossCount,
        lastRunAt: new Date(),
      }).where(eq(tradingBots.id, bot.id));
      await tx.update(webhookLogs).set({ status: "PAPER_FILLED" }).where(eq(webhookLogs.id, claimed[0].id));
      return { order, ladderState: state } as const;
    });

    if ("duplicate" in outcome) return NextResponse.json({ success: true, duplicate: true, message: "Alert già ricevuto: nessuna seconda simulazione." });
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    return NextResponse.json({
      success: true,
      mode: "paper",
      message: "Segnale validato e simulato. Nessun ordine inviato a Hyperliquid o ad altri exchange.",
      order: outcome.order,
      ladderState: outcome.ladderState,
    });
  } catch (error) {
    console.error("TradingView webhook error:", error);
    return NextResponse.json({ error: "Errore interno durante la validazione del webhook." }, { status: 500 });
  }
}

// Deliberately no public log listing here: TradingView posts to this route unauthenticated.
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/webhook/tradingview",
    method: "POST",
    description: "TradingView VAPI Ladder webhook; logs are not exposed on this public route.",
  }, { status: 405, headers: { Allow: "POST" } });
}
