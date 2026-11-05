"use server";

import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { barActions, botSettings, cycles, orders, symbolConfig, webhookEvents } from "@/db/schema";
import { handleSignal, manualCloseCycle } from "@/lib/engine";
import { getSettings, liveConfigured } from "@/lib/settings";
import { floorToBar, TIMEFRAME_MS } from "@/lib/strategy";

export type ActionResult = { ok: boolean; message: string };

const refresh = () => revalidatePath("/", "layout");

export async function setMode(mode: "paper" | "live"): Promise<ActionResult> {
  if (mode !== "paper" && mode !== "live") return { ok: false, message: "Modalità non valida." };
  await getSettings();
  if (mode === "live" && !liveConfigured()) {
    return {
      ok: false,
      message: "Per passare a LIVE imposta prima HL_PRIVATE_KEY (e opzionalmente HL_NETWORK) nelle variabili d'ambiente.",
    };
  }
  const [open] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cycles)
    .where(eq(cycles.status, "open"));
  if (open.n > 0) {
    return { ok: false, message: "Ci sono cicli aperti: chiudili prima di cambiare modalità (paper ↔ live)." };
  }
  await db.update(botSettings).set({ mode, updatedAt: new Date() }).where(eq(botSettings.id, 1));
  refresh();
  return { ok: true, message: `Modalità impostata su ${mode.toUpperCase()}.` };
}

export async function setKillSwitch(on: boolean): Promise<ActionResult> {
  await getSettings();
  await db.update(botSettings).set({ killSwitch: on, updatedAt: new Date() }).where(eq(botSettings.id, 1));
  refresh();
  return { ok: true, message: on ? "Nuovi acquisti sospesi." : "Acquisti riattivati." };
}

export async function saveFlags(flags: {
  allowBuyAfterPartial: boolean;
  multiStagePerBar: boolean;
  enforceCloseWindow: boolean;
}): Promise<ActionResult> {
  await getSettings();
  await db
    .update(botSettings)
    .set({ ...flags, updatedAt: new Date() })
    .where(eq(botSettings.id, 1));
  refresh();
  return { ok: true, message: "Impostazioni salvate." };
}

export async function saveSymbol(coin: string, enabled: boolean, unitUsd: number): Promise<ActionResult> {
  if (!Number.isFinite(unitUsd) || unitUsd < 5) return { ok: false, message: "L'unità 1× deve essere almeno $5." };
  await db
    .insert(symbolConfig)
    .values({ coin, enabled, unitUsd })
    .onConflictDoUpdate({ target: symbolConfig.coin, set: { enabled, unitUsd } });
  refresh();
  return { ok: true, message: `${coin}: unità 1× = $${unitUsd}.` };
}

export async function regenerateSecret(): Promise<ActionResult> {
  await getSettings();
  await db
    .update(botSettings)
    .set({ webhookSecret: randomBytes(24).toString("hex"), updatedAt: new Date() })
    .where(eq(botSettings.id, 1));
  refresh();
  return { ok: true, message: "Nuovo secret generato: aggiorna lo script/alert su TradingView." };
}

export async function closeCycleAction(id: number): Promise<ActionResult> {
  const r = await manualCloseCycle(id);
  refresh();
  return r;
}

export async function resetPaperData(): Promise<ActionResult> {
  await db.delete(orders).where(eq(orders.mode, "paper"));
  await db.delete(cycles).where(eq(cycles.mode, "paper"));
  await db.delete(barActions);
  await db.delete(webhookEvents);
  refresh();
  return { ok: true, message: "Dati paper e log azzerati." };
}

export type SimInput = {
  coin: "BTC" | "ETH";
  action: "BUY" | "BAR_CLOSE";
  tier?: number;
  vapi?: number;
  price: number;
  /** Candela relativa a quella corrente (0 = corrente, 1 = prossima, -1 = precedente). */
  barOffset: number;
};

/** Simula un webhook passando dal motore reale (salta secret e finestra di chiusura). */
export async function simulateSignal(input: SimInput): Promise<ActionResult> {
  if (!(input.price > 0)) return { ok: false, message: "Prezzo non valido." };
  const barTime = new Date(floorToBar(new Date()).getTime() + input.barOffset * TIMEFRAME_MS);
  const body: Record<string, unknown> = {
    action: input.action,
    symbol: `${input.coin}USDT.P`,
    tf: "180",
    price: input.price,
    barTime: barTime.toISOString(),
  };
  if (input.action === "BUY" && input.tier) body.tier = input.tier;
  if (input.vapi !== undefined && Number.isFinite(input.vapi)) body.vapi = input.vapi;

  const r = await handleSignal({
    source: "simulator",
    rawBody: JSON.stringify(body),
    query: new URLSearchParams(),
    contentType: "application/json",
    userAgent: "bulllab-simulator",
  });
  refresh();
  return { ok: r.ok, message: `${r.status.toUpperCase()} · ${r.code} — ${r.message}` };
}

/** Test reale via HTTP sull'URL pubblico del webhook (verifica redirect, protezioni, secret). */
export async function runSelfTest(): Promise<ActionResult & { steps: string[] }> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const steps: string[] = [];
  if (!host) return { ok: false, message: "Host non determinabile.", steps };
  const url = `${proto}://${host}/api/webhook/tradingview`;
  steps.push(`URL testato: ${url}`);
  const settings = await getSettings();

  try {
    const g = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000), cache: "no-store" });
    steps.push(`GET → HTTP ${g.status}${g.status >= 300 && g.status < 400 ? ` (REDIRECT a ${g.headers.get("location")}: TradingView NON segue i redirect!)` : ""}`);
    if (g.status !== 200) {
      return { ok: false, message: `L'URL pubblico risponde ${g.status} invece di 200.`, steps };
    }
    const p = await fetch(url, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/json", "x-bulllab-selftest": "1" },
      body: JSON.stringify({ secret: settings.effectiveSecret, action: "PING" }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const text = await p.text();
    steps.push(`POST PING → HTTP ${p.status} · ${text.slice(0, 200)}`);
    refresh();
    const okPing = p.status === 200 && text.includes("PING_OK");
    return {
      ok: okPing,
      message: okPing
        ? "Catena OK: dominio raggiungibile, nessun redirect, secret valido, DB scrivibile."
        : "Il POST non è stato accettato: vedi i passi sotto.",
      steps,
    };
  } catch (e) {
    steps.push(`Errore di rete: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, message: "Impossibile raggiungere l'URL pubblico dal server.", steps };
  }
}
