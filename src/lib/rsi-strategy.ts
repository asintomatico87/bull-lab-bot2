import { db } from "@/db";
import { rsiCycles, rsiTrades } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { gateSystemLive, getRsiSizes } from "@/lib/settings";
import { normalizeSymbol } from "@/lib/strategy";
import { placeMarket } from "@/lib/hyperliquid";

export const RSI_BAR_MS = 45 * 60 * 1000;
export const RSI_UNITS = [1, 2, 3];
export const LONG_LEVELS = [23, 18, 13];
export const SHORT_LEVELS = [77, 82, 87];
const FEE = Number(process.env.FEE_BPS || 3.5) / 10000;
const MAX_UNITS = 6;

export type RsiSignal = { symbol: string; rsi: number; price: number; bar_time: string; event?: "touch" | "close" | "bar" };

function skipBlocked(lastBar: string, barTime: string) {
  if (!lastBar) return false;
  if (lastBar === barTime) return true;
  const a = Number(lastBar);
  const b = Number(barTime);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  return Math.abs(b - a) < 2 * RSI_BAR_MS;
}

async function openCycle(symbol: string, side: "long" | "short") {
  const [c] = await db.select().from(rsiCycles).where(and(eq(rsiCycles.symbol, symbol), eq(rsiCycles.side, side), eq(rsiCycles.status, "open"))).limit(1);
  return c;
}

async function openUnits(symbol: string) {
  const rows = await db.select().from(rsiCycles).where(and(eq(rsiCycles.symbol, symbol), eq(rsiCycles.status, "open")));
  return rows.reduce((n, r) => n + r.units, 0);
}

async function enter(opts: {
  symbol: "BTC" | "ETH"; side: "long" | "short"; rsi: number; price: number; bar: string;
  cycle: typeof rsiCycles.$inferSelect | undefined;
  live: boolean;
}) {
  const { symbol, side, rsi, price, bar, live } = opts;
  const c = opts.cycle;
  const entries = c?.entries ?? 0;
  if (entries >= 3) return { status: "ignored", reason: `RSI ${side}: ciclo già a 3 scalini` };
  if (c && c.exitStage > 0) return { status: "ignored", reason: `RSI ${side}: in uscita, nuovi ingressi bloccati` };
  if (c && skipBlocked(c.lastEntryBar, bar)) {
    return { status: "ignored", reason: `RSI ${side}: stessa candela o manca la barra vuota (45m di distacco)` };
  }
  const level = side === "long" ? LONG_LEVELS[entries] : SHORT_LEVELS[entries];
  if (side === "long" && rsi > level) return { status: "ignored", reason: `RSI ${rsi.toFixed(2)} > ${level} (long #${entries + 1})` };
  if (side === "short" && rsi < level) return { status: "ignored", reason: `RSI ${rsi.toFixed(2)} < ${level} (short #${entries + 1})` };

  const addUnits = RSI_UNITS[entries];
  const used = await openUnits(symbol);
  if (used + addUnits > MAX_UNITS + 1e-9) {
    return { status: "ignored", reason: `RSI: esposizione ${used}+${addUnits} size > massimo 6` };
  }
  const sizes = await getRsiSizes();
  const usd = (symbol === "ETH" ? sizes.ETH : sizes.BTC) * addUnits;
  let qty = usd / price;
  let px = price;
  if (live) {
    try {
      const fill = await placeMarket({ symbol, isBuy: side === "long", qty, reduceOnly: false });
      qty = fill.qty;
      px = fill.price;
    } catch (e) {
      return { status: "error", reason: `Hyperliquid RSI ${side} fallito: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
  const cost = qty * px * (1 + FEE);
  const tag = live ? "LIVE" : "PAPER";
  const dir = side === "long" ? "LONG" : "SHORT";
  if (!c) {
    const [n] = await db.insert(rsiCycles).values({
      symbol, side, entries: 1, units: addUnits, qty, cost, lastEntryBar: bar,
    }).returning();
    await db.insert(rsiTrades).values({
      cycleId: n.id, symbol, side: dir, level: 1, price: px, qty, rsi, barTime: bar,
      note: `${tag} ${dir} #1 · RSI ${side === "long" ? "≤" : "≥"} ${level} · ${addUnits} size · ${usd} USDT`,
    });
  } else {
    await db.update(rsiCycles).set({
      entries: entries + 1, units: c.units + addUnits, qty: c.qty + qty, cost: c.cost + cost, lastEntryBar: bar,
    }).where(eq(rsiCycles.id, c.id));
    await db.insert(rsiTrades).values({
      cycleId: c.id, symbol, side: dir, level: entries + 1, price: px, qty, rsi, barTime: bar,
      note: `${tag} ${dir} #${entries + 1} · RSI ${side === "long" ? "≤" : "≥"} ${level} · ${addUnits} size · ${usd} USDT`,
    });
  }
  return { status: "executed", reason: `${tag} RSI ${dir} #${entries + 1} ${symbol} ${qty.toFixed(6)} @ ${px}` };
}

async function exitLong(c: typeof rsiCycles.$inferSelect, rsi: number, price: number, bar: string, live: boolean) {
  if (c.exitStage === 0 && rsi >= 70) return closeFrac(c, 1, price, rsi, bar, "RSI≥70 chiude il resto del LONG", 9, live);
  if (c.exitStage === 0 && rsi >= 50) return closeFrac(c, 0.5, price, rsi, bar, "RSI≥50 vende 50% del LONG", 1, live);
  if (c.exitStage === 1 && rsi >= 70) return closeFrac(c, 1, price, rsi, bar, "RSI≥70 chiude il resto del LONG", 9, live);
  return { status: "ignored", reason: `RSI LONG: ${rsi.toFixed(2)}, nessuna uscita (stage ${c.exitStage})` };
}

async function exitShort(c: typeof rsiCycles.$inferSelect, rsi: number, price: number, bar: string, live: boolean) {
  if (c.exitStage === 0 && rsi <= 30) return closeFrac(c, 1, price, rsi, bar, "RSI≤30 chiude il resto dello SHORT", 9, live);
  if (c.exitStage === 0 && rsi <= 38) return closeFrac(c, 0.5, price, rsi, bar, "RSI≤38 copre 50% dello SHORT", 1, live);
  if (c.exitStage === 1 && rsi <= 30) return closeFrac(c, 1, price, rsi, bar, "RSI≤30 chiude il resto dello SHORT", 9, live);
  return { status: "ignored", reason: `RSI SHORT: ${rsi.toFixed(2)}, nessuna uscita (stage ${c.exitStage})` };
}

async function closeFrac(
  c: typeof rsiCycles.$inferSelect, frac: number, price: number, rsi: number, bar: string, note: string, stage: number, live: boolean,
) {
  let soldQty = c.qty * frac;
  let px = price;
  if (live) {
    try {
      const fill = await placeMarket({
        symbol: c.symbol === "ETH" ? "ETH" : "BTC",
        isBuy: c.side !== "long",
        qty: soldQty,
        reduceOnly: true,
      });
      soldQty = fill.qty;
      px = fill.price;
    } catch (e) {
      return { status: "error", reason: `Hyperliquid RSI uscita fallita: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
  const soldCost = c.cost * (c.qty ? soldQty / c.qty : frac);
  const soldUnits = c.units * (c.qty ? soldQty / c.qty : frac);
  const proceeds = c.side === "long"
    ? soldQty * px * (1 - FEE)
    : soldCost * (1 - FEE);
  const pnl = c.side === "long"
    ? proceeds - soldCost
    : soldQty * (c.qty ? c.cost / c.qty : 0) - soldQty * px * (1 + FEE);
  const qty = c.qty - soldQty;
  const cost = c.cost - soldCost;
  const units = c.units - soldUnits;
  const closed = stage === 9 || qty < 1e-12;
  await db.insert(rsiTrades).values({
    cycleId: c.id, symbol: c.symbol, side: c.side === "long" ? "SELL" : "COVER",
    level: stage, price: px, qty: soldQty, rsi, barTime: bar, note: `${live ? "LIVE" : "PAPER"} ${note}`, pnl,
  });
  await db.update(rsiCycles).set({
    qty: closed ? 0 : qty, cost: closed ? 0 : cost, units: closed ? 0 : units,
    realizedPnl: c.realizedPnl + pnl, exitStage: stage,
    status: closed ? "closed" : "open", closedAt: closed ? new Date() : null,
  }).where(eq(rsiCycles.id, c.id));
  return { status: "executed", reason: `${live ? "LIVE" : "PAPER"} RSI ${note}` };
}

export async function processRsiBar(s: RsiSignal, opts?: { forcePaper?: boolean }): Promise<{ status: string; reason: string }> {
  const raw = normalizeSymbol(s.symbol);
  if (raw !== "BTC" && raw !== "ETH") return { status: "ignored", reason: `Ticker RSI non gestito: ${s.symbol}` };
  if (!Number.isFinite(s.rsi) || !Number.isFinite(s.price) || s.price <= 0) {
    return { status: "rejected", reason: "rsi/price non numerici" };
  }
  const symbol = raw;
  const gate = await gateSystemLive("rsi", symbol, opts?.forcePaper);
  if (gate.block) return { status: "error", reason: gate.block };
  const live = gate.live;
  const event = s.event === "touch" ? "touch" : "close";
  const notes: string[] = [];
  let did = false;

  if (event === "close") {
    const long = await openCycle(symbol, "long");
    const short = await openCycle(symbol, "short");
    if (long) {
      const r = await exitLong(long, s.rsi, s.price, s.bar_time, live);
      notes.push(r.reason);
      if (r.status === "executed") did = true;
      if (r.status === "error") return r;
    }
    if (short) {
      const r = await exitShort(short, s.rsi, s.price, s.bar_time, live);
      notes.push(r.reason);
      if (r.status === "executed") did = true;
      if (r.status === "error") return r;
    }
    if (!long && !short) notes.push("Chiusura candela RSI: nessun ciclo aperto");
  } else {
    const longNow = await openCycle(symbol, "long");
    const shortNow = await openCycle(symbol, "short");
    const longIn = await enter({ symbol, side: "long", rsi: s.rsi, price: s.price, bar: s.bar_time, cycle: longNow, live });
    notes.push(longIn.reason);
    if (longIn.status === "executed") did = true;
    if (longIn.status === "error") return longIn;
    const shortIn = await enter({ symbol, side: "short", rsi: s.rsi, price: s.price, bar: s.bar_time, cycle: shortNow, live });
    notes.push(shortIn.reason);
    if (shortIn.status === "executed") did = true;
    if (shortIn.status === "error") return shortIn;
  }

  if (did) return { status: "executed", reason: notes.filter((n) => n.startsWith("PAPER") || n.startsWith("LIVE")).join(" · ") || notes.join(" · ") };
  const skip = notes.find((n) => n.includes("barra vuota") || n.includes("esposizione"));
  return { status: "ignored", reason: skip || notes[0] || `RSI ${s.rsi.toFixed(2)}: nessuna operazione` };
}
