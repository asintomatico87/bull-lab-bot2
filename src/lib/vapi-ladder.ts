// ============================================================================
// BULL LAB — VAPI LADDER 3H (Martingale Ladder)
// Base oscillator: "Volume Accumulation Percentage [LazyBear]"
// Execution rules implemented 1:1:
//  R1  max 3 buys, no stop loss, stay in market while ladder is full
//  R2  max 1 buy per 3H candle
//  R3  martingale sizes 1x / 1.5x / 2.5x on the base size
//  R4  buy levels VAPI <= -25 / <= -32 / <= -40
//  R5  one buy per level tier — each rung can only fill once per cycle
//  R6  tiered exits depending on how many rungs are filled:
//        3 buys -> 50% @ >= 0, then 50% of the remainder @ >= 15, close all @ >= 22
//        2 buys -> 50% @ >= 5, close the rest @ >= 15
//        1 buy  -> 100% @ >= 12
// ============================================================================

import { computeVapiSeries, generateThreeHourCandles, type VapiPoint } from "./vapi";

export type LadderTarget = {
  level: number;
  /** Percentage of the position CURRENTLY open (so 50 then 50 empties the ladder). */
  fractionPct: number;
  executed?: boolean;
};

export type LadderConfig = {
  baseSizeUsdt: number;
  levels: number[];
  multipliers: number[];
  maxBuys: number;
  plans: Record<string, LadderTarget[]>;
  feePct: number;
  capital: number;
  vapiLength: number;
};

export const VAPI_LADDER_DEFAULTS: LadderConfig = {
  baseSizeUsdt: 500,
  levels: [-25, -32, -40],
  multipliers: [1, 1.5, 2.5],
  maxBuys: 3,
  plans: {
    "1": [{ level: 12, fractionPct: 100 }],
    "2": [
      { level: 5, fractionPct: 50 },
      { level: 15, fractionPct: 100 },
    ],
    "3": [
      { level: 0, fractionPct: 50 },
      { level: 15, fractionPct: 50 },
      { level: 22, fractionPct: 100 },
    ],
  },
  feePct: 0.035,
  capital: 10000,
  vapiLength: 10,
};

export type LadderEvent = {
  id: number;
  type: "BUY" | "SELL";
  time: string;
  price: number;
  va: number;
  rung: number | null;
  level: number;
  sizeUsdt: number;
  qty: number;
  multiplier: number | null;
  pnlUsdt: number | null;
  pnlPct: number | null;
  note: string;
};

export type LadderCycle = {
  id: number;
  status: "CLOSED" | "OPEN";
  buys: number;
  startTime: string;
  endTime: string | null;
  investedUsdt: number;
  avgEntry: number;
  qty: number;
  exitAvg: number | null;
  realizedUsdt: number;
  realizedPct: number;
  durationBars: number;
};

export type LadderState = {
  buys: number;
  sellsStarted: boolean;
  positionQty: number;
  investedUsdt: number;
  avgEntry: number;
  marketValue: number;
  unrealizedUsdt: number;
  unrealizedPct: number;
  realizedUsdt: number;
  nextRung: { index: number; level: number; multiplier: number; sizeUsdt: number } | null;
  nextTarget: { level: number; fractionPct: number } | null;
  lastBuyTime: string | null;
  barsSinceLastBuy: number | null;
  candlesUntilNextBuy: number;
  va: number;
  price: number;
  time: string;
  rungs: { index: number; level: number; multiplier: number; sizeUsdt: number; filled: boolean; filledTime: string | null; filledPrice: number | null }[];
};

export type LadderResult = {
  pair: string;
  timeframe: string;
  config: LadderConfig;
  series: VapiPoint[];
  events: LadderEvent[];
  cycles: LadderCycle[];
  equityCurve: { time: string; equity: number }[];
  state: LadderState;
  stats: {
    initialCapital: number;
    equity: number;
    realizedUsdt: number;
    unrealizedUsdt: number;
    totalPnlUsdt: number;
    totalPnlPct: number;
    totalBuys: number;
    totalSells: number;
    cyclesClosed: number;
    winningCycles: number;
    losingCycles: number;
    winRate: number;
    avgCyclePnl: number;
    bestCycle: number;
    worstCycle: number;
    peakInvested: number;
    maxDrawdown: number;
    avgBuysPerCycle: number;
    openCycle: boolean;
    totalFees: number;
  };
};

export function pairTickSize(pair: string): number {
  return pair.toUpperCase().includes("ETH") ? 4 : 2;
}

export function runVapiLadder(pair: string, raw: Partial<LadderConfig> = {}, bars = 180): LadderResult {
  const config: LadderConfig = {
    ...VAPI_LADDER_DEFAULTS,
    ...raw,
    levels: (raw.levels ?? VAPI_LADDER_DEFAULTS.levels).map(Number),
    multipliers: (raw.multipliers ?? VAPI_LADDER_DEFAULTS.multipliers).map(Number),
    plans: raw.plans ?? VAPI_LADDER_DEFAULTS.plans,
  };

  const candles = generateThreeHourCandles(pair, bars);
  const series = computeVapiSeries(candles, config.vapiLength);
  const fee = (notional: number) => (notional * config.feePct) / 100;

  let cash = config.capital;
  let realized = 0;
  let totalFees = 0;
  let peakInvested = 0;

  // --- cycle state ---
  let rungFilled = config.levels.map(() => false);
  let rungTime: (string | null)[] = config.levels.map(() => null);
  let rungPrice: (number | null)[] = config.levels.map(() => null);
  let buys = 0;
  let positionQty = 0;
  let investedUsdt = 0;
  let planTargets: LadderTarget[] = [];
  let lastBuyCandle = -99;
  let cycleStartTime: string | null = null;
  let cycleStartIndex = 0;
  let lastBuyTime: string | null = null;
  let cycleExitNotional = 0;
  let cycleExitQty = 0;

  const events: LadderEvent[] = [];
  const cycles: LadderCycle[] = [];
  const equityCurve: { time: string; equity: number }[] = [];

  const avgEntry = () => (positionQty > 0 ? investedUsdt / positionQty : 0);

  const resetCycle = () => {
    rungFilled = config.levels.map(() => false);
    rungTime = config.levels.map(() => null);
    rungPrice = config.levels.map(() => null);
    buys = 0;
    positionQty = 0;
    investedUsdt = 0;
    planTargets = [];
    lastBuyCandle = -99;
    cycleStartTime = null;
    cycleExitNotional = 0;
    cycleExitQty = 0;
  };

  const resolvePlan = () => {
    const plan = config.plans[String(buys)] ?? config.plans[String(Math.max(1, buys))] ?? [];
    planTargets = plan.map((target) => ({ ...target, executed: false }));
  };

  const pushCycle = (status: "CLOSED" | "OPEN", endTime: string | null, endIndex: number) => {
    const qty = positionQty;
    const realizedPnl = Math.round((cycleExitNotional - cycleExitQty * avgEntry()) * 100) / 100;
    cycles.push({
      id: cycles.length + 1,
      status,
      buys,
      startTime: cycleStartTime ?? series[0]?.time ?? "",
      endTime,
      investedUsdt: Math.round(investedUsdt * 100) / 100,
      avgEntry: Math.round(avgEntry() * 100) / 100,
      qty: Math.round(qty * 1e6) / 1e6,
      exitAvg: cycleExitQty > 0 ? Math.round((cycleExitNotional / cycleExitQty) * 100) / 100 : null,
      realizedUsdt: status === "CLOSED" ? realizedPnl : Math.round((cycleExitNotional - cycleExitQty * avgEntry()) * 100) / 100,
      realizedPct:
        status === "CLOSED" && investedUsdt > 0
          ? Math.round((realizedPnl / investedUsdt) * 10000) / 100
          : 0,
      durationBars: endIndex - cycleStartIndex,
    });
  };

  for (let i = 1; i < series.length; i++) {
    const point = series[i];
    const va = point.va;
    const price = point.close;

    // ---------------------------------------------------------------- SELLS
    if (buys > 0 && positionQty > 0) {
      if (planTargets.length === 0) resolvePlan();

      for (const target of planTargets) {
        if (target.executed) continue;
        if (va < target.level) continue;

        const qtyToSell =
          target.fractionPct >= 100 ? positionQty : positionQty * (target.fractionPct / 100);
        if (qtyToSell <= 0) continue;

        const notional = qtyToSell * price;
        const fees = fee(notional);
        const costBasis = qtyToSell * avgEntry();
        const pnl = notional - costBasis - fees;

        realized += pnl;
        totalFees += fees;
        cash += pnl;
        cycleExitNotional += notional;
        cycleExitQty += qtyToSell;

        positionQty = Math.max(0, positionQty - qtyToSell);
        investedUsdt = Math.max(0, investedUsdt - costBasis);

        events.push({
          id: events.length + 1,
          type: "SELL",
          time: point.time,
          price: Math.round(price * 100) / 100,
          va,
          rung: null,
          level: target.level,
          sizeUsdt: Math.round(notional * 100) / 100,
          qty: Math.round(qtyToSell * 1e6) / 1e6,
          multiplier: null,
          pnlUsdt: Math.round(pnl * 100) / 100,
          pnlPct: Math.round((pnl / Math.max(1, costBasis)) * 10000) / 100,
          note: `${target.fractionPct}% della posizione chiuso al livello VAPI ${target.level}`,
        });

        target.executed = true;

        if (positionQty <= 1e-9) {
          pushCycle("CLOSED", point.time, i);
          const savedCycle = cycles[cycles.length - 1];
          if (savedCycle) savedCycle.exitAvg = Math.round((cycleExitNotional / Math.max(1e-9, cycleExitQty)) * 100) / 100;
          resetCycle();
          break;
        }
      }
    }

    // ----------------------------------------------------------------- BUYS
    const sellsStarted = planTargets.some((t) => t.executed);

    // R5: only the next unfilled rung can trigger, and only if no sell happened yet
    if (buys < config.maxBuys && !sellsStarted && i !== lastBuyCandle) {
      const rungIndex = buys;
      const level = config.levels[rungIndex];
      const multiplier = config.multipliers[rungIndex];

      if (level !== undefined && va <= level) {
        const sizeUsdt = config.baseSizeUsdt * multiplier;
        const qty = sizeUsdt / price;
        const fees = fee(sizeUsdt);

        cash -= sizeUsdt + fees;
        totalFees += fees;
        realized -= fees;
        positionQty += qty;
        investedUsdt += sizeUsdt;
        peakInvested = Math.max(peakInvested, investedUsdt);
        rungFilled[rungIndex] = true;
        rungTime[rungIndex] = point.time;
        rungPrice[rungIndex] = Math.round(price * 100) / 100;
        buys += 1;
        lastBuyCandle = i;
        lastBuyTime = point.time;
        if (!cycleStartTime) {
          cycleStartTime = point.time;
          cycleStartIndex = i;
        }
        cycleExitNotional = 0;
        cycleExitQty = 0;
        resolvePlan();

        events.push({
          id: events.length + 1,
          type: "BUY",
          time: point.time,
          price: Math.round(price * 100) / 100,
          va,
          rung: rungIndex + 1,
          level,
          sizeUsdt: Math.round(sizeUsdt * 100) / 100,
          qty: Math.round(qty * 1e6) / 1e6,
          multiplier,
          pnlUsdt: null,
          pnlPct: null,
          note: `Scaglione ${rungIndex + 1}/${config.maxBuys} — size ${multiplier}x (${Math.round(sizeUsdt)} USDT)`,
        });
      }
    }

    const unrealized = positionQty > 0 ? positionQty * price - investedUsdt : 0;
    equityCurve.push({
      time: point.time,
      equity: Math.round((config.capital + realized + unrealized) * 100) / 100,
    });
  }

  // mark open cycle
  const last = series[series.length - 1];
  if (buys > 0 && positionQty > 0) {
    pushCycle("OPEN", null, series.length - 1);
  }

  const lastPoint = last ?? series[0];
  const avg = avgEntry();
  const marketValue = positionQty * (lastPoint?.close ?? 0);
  const unrealized = positionQty > 0 ? marketValue - investedUsdt : 0;
  const sellsStarted = planTargets.some((t) => t.executed);
  const nextTarget = positionQty > 0 ? planTargets.find((t) => !t.executed) ?? null : null;
  const nextRungIndex = buys < config.maxBuys && !sellsStarted ? buys : null;

  // drawdown on marked equity
  let peak = config.capital;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    const dd = ((peak - point.equity) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, dd);
  }

  const closedCycles = cycles.filter((c) => c.status === "CLOSED");
  const winningCycles = closedCycles.filter((c) => c.realizedUsdt > 0).length;
  const cyclePnls = closedCycles.map((c) => c.realizedUsdt);
  const totalPnl = realized + unrealized;

  const state: LadderState = {
    buys,
    sellsStarted,
    positionQty: Math.round(positionQty * 1e6) / 1e6,
    investedUsdt: Math.round(investedUsdt * 100) / 100,
    avgEntry: Math.round(avg * 100) / 100,
    marketValue: Math.round(marketValue * 100) / 100,
    unrealizedUsdt: Math.round(unrealized * 100) / 100,
    unrealizedPct: investedUsdt > 0 ? Math.round((unrealized / investedUsdt) * 10000) / 100 : 0,
    realizedUsdt: Math.round(realized * 100) / 100,
    nextRung:
      nextRungIndex !== null && config.levels[nextRungIndex] !== undefined
        ? {
            index: nextRungIndex,
            level: config.levels[nextRungIndex],
            multiplier: config.multipliers[nextRungIndex],
            sizeUsdt: Math.round(config.baseSizeUsdt * config.multipliers[nextRungIndex]),
          }
        : null,
    nextTarget: nextTarget ? { level: nextTarget.level, fractionPct: nextTarget.fractionPct } : null,
    lastBuyTime,
    barsSinceLastBuy: lastBuyCandle >= 0 ? series.length - 1 - lastBuyCandle : null,
    candlesUntilNextBuy: lastBuyCandle >= 0 && lastBuyCandle === series.length - 1 ? 1 : 0,
    va: lastPoint?.va ?? 0,
    price: lastPoint?.close ?? 0,
    time: lastPoint?.time ?? "",
    rungs: config.levels.map((level, index) => ({
      index,
      level,
      multiplier: config.multipliers[index] ?? 1,
      sizeUsdt: Math.round(config.baseSizeUsdt * (config.multipliers[index] ?? 1)),
      filled: rungFilled[index],
      filledTime: rungTime[index],
      filledPrice: rungPrice[index],
    })),
  };

  return {
    pair,
    timeframe: "3H",
    config,
    series,
    events: events.slice().reverse(),
    cycles: cycles.slice().reverse(),
    equityCurve,
    state,
    stats: {
      initialCapital: config.capital,
      equity: Math.round((config.capital + totalPnl) * 100) / 100,
      realizedUsdt: Math.round(realized * 100) / 100,
      unrealizedUsdt: Math.round(unrealized * 100) / 100,
      totalPnlUsdt: Math.round(totalPnl * 100) / 100,
      totalPnlPct: Math.round((totalPnl / config.capital) * 10000) / 100,
      totalBuys: events.filter((e) => e.type === "BUY").length,
      totalSells: events.filter((e) => e.type === "SELL").length,
      cyclesClosed: closedCycles.length,
      winningCycles,
      losingCycles: closedCycles.length - winningCycles,
      winRate: closedCycles.length ? Math.round((winningCycles / closedCycles.length) * 1000) / 10 : 0,
      avgCyclePnl: cyclePnls.length
        ? Math.round((cyclePnls.reduce((a, b) => a + b, 0) / cyclePnls.length) * 100) / 100
        : 0,
      bestCycle: cyclePnls.length ? Math.max(...cyclePnls) : 0,
      worstCycle: cyclePnls.length ? Math.min(...cyclePnls) : 0,
      peakInvested: Math.round(peakInvested * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      avgBuysPerCycle: cycles.length
        ? Math.round((cycles.reduce((a, c) => a + c.buys, 0) / cycles.length) * 100) / 100
        : 0,
      openCycle: buys > 0 && positionQty > 0,
      totalFees: Math.round(totalFees * 100) / 100,
    },
  };
}
