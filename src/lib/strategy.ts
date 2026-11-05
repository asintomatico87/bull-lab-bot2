import { db } from "@/db";
import { cycles, trades } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSizes } from "@/lib/settings";

// ============================================================
// BULL LAB — VAPI LADDER 3H (Martingale ladder on LazyBear VAPI)
// R1  max 3 buys, NO stop loss, hold while the ladder is full
// R2  max 1 buy per 3H candle
// R3  size ladder 1x / 1.5x / 2.5x on base size (default 500 USDT)
// R4  buy levels VAPI <= -25 / <= -32 / <= -40
// R5  one buy per level rung (each rung fills once per cycle)
// R6  exits: 3 buys -> 50% @ >= 0, 50% of remainder @ >= 15, close all @ >= 22
//              2 buys -> 50% @ >= 5, close rest @ >= 15
//              1 buy  -> 100% @ >= 12
// BUY  trigger: INTRABAR (touch) — SELL trigger: BAR CLOSE only
// ============================================================
export const LEVELS = [-25, -32, -40];
export const SIZES = [1, 1.5, 2.5];
export const SYMBOLS = ["BTC", "ETH"];
export const BASE_USD = Number(process.env.BASE_USD || 500); // R3: base size 500 USDT
export const FEE = Number(process.env.FEE_BPS || 3.5) / 10000; // 0.035% come nel backtest

export type Signal = {
  symbol: string;
  event: "touch" | "close";
  vapi: number;
  price: number;
  bar_time: string;
};

export function normalizeSymbol(s: string): string {
  const u = s.toUpperCase().replace(/^(BINANCE|HYPERLIQUID):?/, "").replace(/USDT.*/, "");
  if (u === "BTC" || u === "XBT") return "BTC";
  if (u === "ETH") return "ETH";
  return u;
}

async function getOpenCycle(symbol: string) {
  const [c] = await db.select().from(cycles).where(and(eq(cycles.symbol, symbol), eq(cycles.status, "open"))).limit(1);
  return c;
}

export async function processSignal(s: Signal): Promise<{ status: string; reason: string }> {
  const symbol = normalizeSymbol(s.symbol);
  if (!SYMBOLS.includes(symbol)) return { status: "ignored", reason: `Ticker non gestito: ${s.symbol}` };
  if (!Number.isFinite(s.vapi) || !Number.isFinite(s.price) || s.price <= 0)
    return { status: "rejected", reason: "vapi/price non numerici: controlla i placeholder nel messaggio alert" };

  const c = await getOpenCycle(symbol);

  if (s.event === "touch") {
    const entries = c?.entries ?? 0;
    if (entries >= 3) return { status: "ignored", reason: "Scala già completa (3 BUY)" };
    if (c && c.exitStage > 0) return { status: "ignored", reason: "Ciclo in fase di uscita: nuovi BUY bloccati (sells>0)" };
    const level = LEVELS[entries]; // R4 + R5: solo lo scalino successivo, una volta per ciclo
    if (s.vapi > level) return { status: "ignored", reason: `VAPI ${s.vapi.toFixed(2)} > ${level} (scalino #${entries + 1})` };
    const key = String(entries + 1);
    if (c && Object.values(c.lastBuyBars).includes(s.bar_time)) return { status: "ignored", reason: "R2: già 1 BUY su questa candela 3H" };

    const sizes = await getSizes();
    const usd = (symbol === "ETH" ? sizes.ETH : sizes.BTC) * SIZES[entries];
    const qty = usd / s.price;
    const cost = usd * (1 + FEE);
    let cycleId: number;
    if (!c) {
      const [n] = await db.insert(cycles).values({ symbol, entries: 1, qty, cost, lastBuyBars: { [key]: s.bar_time } }).returning();
      cycleId = n.id;
    } else {
      await db.update(cycles).set({ entries: entries + 1, qty: c.qty + qty, cost: c.cost + cost, lastBuyBars: { ...c.lastBuyBars, [key]: s.bar_time } }).where(eq(cycles.id, c.id));
      cycleId = c.id;
    }
    await db.insert(trades).values({ cycleId, symbol, side: "BUY", level: entries + 1, price: s.price, qty, vapi: s.vapi, barTime: s.bar_time, note: `BUY rung ${key} @VAPI≤${level} · ${usd} USDT (${SIZES[entries]}×)` });
    return { status: "executed", reason: `PAPER BUY rung ${key} ${symbol} ${qty.toFixed(6)} @ ${s.price}` };
  }

  // ---- SELL: solo a chiusura candela (barstate.isconfirmed) ----
  if (!c) return { status: "ignored", reason: "Chiusura candela: nessun ciclo aperto" };
  // Come nel Pine originale: UNA sola tappa di vendita per chiusura di candela,
  // anche se VAPI supera più target nello stesso istante.
  const [alreadySold] = await db.select({ id: trades.id }).from(trades)
    .where(and(eq(trades.cycleId, c.id), eq(trades.side, "SELL"), eq(trades.barTime, s.bar_time))).limit(1);
  if (alreadySold) return { status: "ignored", reason: "SELL già eseguito su questa candela 3H" };
  const v = s.vapi;
  let step: { frac: number; note: string; stage: number } | null = null;
  if (c.entries === 1) {
    if (v >= 12) step = { frac: 1, note: "R6 · 1 BUY: VAPI≥12 chiude 100%", stage: 9 };
  } else if (c.entries === 2) {
    if (c.exitStage === 0 && v >= 5) step = { frac: 0.5, note: "R6 · 2 BUY: VAPI≥5 vende 50%", stage: 1 };
    else if (c.exitStage === 1 && v >= 15) step = { frac: 1, note: "R6 · 2 BUY: VAPI≥15 chiude il resto", stage: 9 };
  } else if (c.entries === 3) {
    if (c.exitStage === 0 && v >= 0) step = { frac: 0.5, note: "R6 · 3 BUY: VAPI≥0 vende 50%", stage: 1 };
    else if (c.exitStage === 1 && v >= 15) step = { frac: 0.5, note: "R6 · 3 BUY: VAPI≥15 vende metà del rimanente", stage: 2 };
    else if (c.exitStage === 2 && v >= 22) step = { frac: 1, note: "R6 · 3 BUY: VAPI≥22 chiude tutto", stage: 9 };
  }
  if (!step) return { status: "ignored", reason: `Chiusura: VAPI ${v.toFixed(2)}, nessuna uscita (BUY=${c.entries}, stage=${c.exitStage})` };

  const soldQty = c.qty * step.frac;
  const soldCost = c.cost * step.frac;
  const proceeds = soldQty * s.price * (1 - FEE);
  const qty = c.qty - soldQty;
  const cost = c.cost - soldCost;
  const pnl = c.realizedPnl + proceeds - soldCost;
  await db.insert(trades).values({ cycleId: c.id, symbol, side: "SELL", level: step.stage, price: s.price, qty: soldQty, vapi: v, barTime: s.bar_time, note: step.note, pnl: proceeds - soldCost });
  const closed = step.stage === 9 || qty < 1e-12;
  await db.update(cycles).set({ qty: closed ? 0 : qty, cost: closed ? 0 : cost, realizedPnl: pnl, exitStage: step.stage, status: closed ? "closed" : "open", closedAt: closed ? new Date() : null }).where(eq(cycles.id, c.id));
  return { status: "executed", reason: `PAPER SELL ${symbol}: ${step.note}` };
}
