// ============================================================================
// BULL LAB — VAPI (Volume Accumulation Percentage Indicator) ENGINE
// Original indicator: "Volume Accumulation Percentage Indicator [LazyBear]"
// Formula: x = (2*close - high - low) / (high - low)
//          TVA = sum(volume * x, length)
//          TV  = sum(volume, length)
//          VAPI = 100 * TVA / TV
// ============================================================================

export type VapiCandle = {
  timestamp: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type VapiConfig = {
  length: number;
  longEntry: number;
  longExit: number;
  shortEntry: number;
  shortExit: number;
  confirmation: number;
  extremeLevel: number;
  stopLossPct: number;
  takeProfitPct: number;
  leverage: number;
  capital: number;
  allocationPct: number;
  feePct: number;
};

export const VAPI_DEFAULTS: VapiConfig = {
  length: 10,
  longEntry: 10,
  longExit: -2,
  shortEntry: -10,
  shortExit: 2,
  confirmation: 1,
  extremeLevel: 45,
  stopLossPct: 2.5,
  takeProfitPct: 6.5,
  leverage: 3,
  capital: 10000,
  allocationPct: 25,
  feePct: 0.035,
};

export const VAPI_TIMEFRAME = "3h";
const TF_MS = 3 * 60 * 60 * 1000;

// Deterministic pseudo-random generator (mulberry32)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pairToAsset(pair: string): "BTC" | "ETH" {
  return pair.toUpperCase().includes("ETH") ? "ETH" : "BTC";
}

export function tickerFromPair(pair: string): string {
  return pairToAsset(pair) === "ETH" ? "ETHUSDT" : "BTCUSDT";
}

/**
 * Builds realistic 3H OHLCV series anchored on the last closed 3H bucket.
 * Deterministic for a given asset + bucket, so backtests are reproducible.
 */
export function generateThreeHourCandles(pair: string, bars = 132): VapiCandle[] {
  const asset = pairToAsset(pair);
  const isEth = asset === "ETH";
  const basePrice = isEth ? 2140 : 71800;
  const anchorPrice = isEth ? 2484 : 84250;

  const bucket = Math.floor(Date.now() / TF_MS);
  const seedBase = isEth ? 90210 : 14057;
  const random = mulberry32(seedBase + bucket);

  const candles: VapiCandle[] = [];
  let price = basePrice;

  for (let i = bars - 1; i >= 0; i--) {
    const timestamp = (bucket - i) * TF_MS;
    const progress = (bars - 1 - i) / (bars - 1);

    // macro drift from basePrice to anchorPrice + cyclical pressure waves
    const drift = (anchorPrice - basePrice) / bars / basePrice;
    const cycle = Math.sin(progress * Math.PI * 9) * 0.006;
    const noise = (random() - 0.5) * 0.022;
    const change = drift + cycle + noise;

    const open = price;
    const close = open * (1 + change);
    // Symmetric wicks keep the money-flow multiplier balanced around zero, so
    // the oscillator crosses both the accumulation and distribution levels.
    const bullish = close >= open;
    const wickUp = (0.0012 + random() * 0.0072) * open;
    const wickDown = (0.0012 + random() * 0.0072) * open;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;

    // Volume expands on strong pressure candles but stays direction-neutral
    const moneyFlowMultiplier = (2 * close - high - low) / Math.max(1e-9, high - low);
    const volumeBase = isEth ? 26000 : 1800;
    const volume =
      volumeBase *
      (0.55 + random() * 1.05) *
      (0.85 + Math.abs(moneyFlowMultiplier) * 0.55) *
      (bullish === (random() > 0.5) ? 1.12 : 1);

    const date = new Date(timestamp);
    const timeLabel = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:00`;

    candles.push({
      timestamp,
      time: timeLabel,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume: Math.round(volume),
    });

    price = close;
  }

  return candles;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type VapiPoint = {
  index: number;
  timestamp: number;
  time: string;
  close: number;
  volume: number;
  moneyFlow: number;
  tva: number;
  tv: number;
  va: number;
};

/** Computes the VAPI oscillator exactly as the LazyBear Pine study does. */
export function computeVapiSeries(candles: VapiCandle[], length: number): VapiPoint[] {
  const len = Math.max(1, Math.round(length));
  const points: VapiPoint[] = [];
  const mf: number[] = [];
  const volumeX: number[] = [];

  for (const candle of candles) {
    const range = candle.high - candle.low;
    const raw = range > 0 ? (2 * candle.close - candle.high - candle.low) / range : 0;
    const moneyFlow = Math.max(-1, Math.min(1, raw));
    mf.push(moneyFlow);
    volumeX.push(candle.volume * moneyFlow);
  }

  for (let i = 0; i < candles.length; i++) {
    let tva = 0;
    let tv = 0;
    for (let j = Math.max(0, i - len + 1); j <= i; j++) {
      tva += volumeX[j];
      tv += candles[j].volume;
    }
    const va = tv > 0 ? (100 * tva) / tv : 0;

    points.push({
      index: i,
      timestamp: candles[i].timestamp,
      time: candles[i].time,
      close: candles[i].close,
      volume: candles[i].volume,
      moneyFlow: round4(mf[i]),
      tva: Math.round(tva),
      tv: Math.round(tv),
      va: round2(va),
    });
  }

  return points;
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

export type VapiZone = {
  key: "EXTREME_ACCUMULATION" | "ACCUMULATION" | "NEUTRAL" | "DISTRIBUTION" | "EXTREME_DISTRIBUTION";
  label: string;
  color: string;
  description: string;
};

export function classifyVapi(value: number, config: Pick<VapiConfig, "longEntry" | "shortEntry" | "extremeLevel">): VapiZone {
  const extreme = Math.max(Math.abs(config.longEntry), Math.abs(config.shortEntry), config.extremeLevel);

  if (value >= extreme) {
    return {
      key: "EXTREME_ACCUMULATION",
      label: "Accumulazione Estrema",
      color: "#22c55e",
      description: "Pressione d'acquisto dominante: rischio di esaurimento, valuta trailing stop aggressivo.",
    };
  }
  if (value >= config.longEntry) {
    return {
      key: "ACCUMULATION",
      label: "Accumulazione",
      color: "#00d2ff",
      description: "Volume in accumulo confermato: la strategia 3H apre e mantiene posizioni LONG.",
    };
  }
  if (value <= -extreme) {
    return {
      key: "EXTREME_DISTRIBUTION",
      label: "Distribuzione Estrema",
      color: "#ef4444",
      description: "Pressione di vendita estrema: possibile capitolazione, attenzione ai rimbalzi violenti.",
    };
  }
  if (value <= config.shortEntry) {
    return {
      key: "DISTRIBUTION",
      label: "Distribuzione",
      color: "#ff6b00",
      description: "Volume in distribuzione: la strategia 3H apre e mantiene posizioni SHORT.",
    };
  }
  return {
    key: "NEUTRAL",
    label: "Neutrale / Transizione",
    color: "#94a3b8",
    description: "Nessuna pressione volumetrica netta: il bot resta flat e attende un livello.",
  };
}

export type VapiTrade = {
  id: number;
  side: "LONG" | "SHORT";
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  vaAtEntry: number;
  vaAtExit: number;
  pnlUsdt: number;
  pnlPct: number;
  roiOnCapitalPct: number;
  reason: "TAKE PROFIT" | "STOP LOSS" | "LIVELLO VAPI" | "FINE DATI";
};

export type VapiCrossing = {
  id: number;
  time: string;
  price: number;
  va: number;
  previousVa: number;
  direction: "UP" | "DOWN";
  crossedLevel: number;
  type: "LONG_ENTRY" | "LONG_EXIT" | "SHORT_ENTRY" | "SHORT_EXIT";
  label: string;
};

export type VapiBacktestResult = {
  config: VapiConfig;
  pair: string;
  timeframe: string;
  stats: {
    initialCapital: number;
    finalCapital: number;
    netProfitUsdt: number;
    netProfitPct: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgVaAtEntry: number;
    totalFees: number;
    exposureUsdt: number;
  };
  trades: VapiTrade[];
  equityCurve: { time: string; equity: number }[];
  series: VapiPoint[];
  crossings: VapiCrossing[];
  current: {
    va: number;
    close: number;
    time: string;
    zone: VapiZone;
    distanceToLongEntry: number;
    distanceToShortEntry: number;
  };
};

export function runVapiBacktest(pair: string, rawConfig: Partial<VapiConfig>, bars = 132): VapiBacktestResult {
  const config: VapiConfig = { ...VAPI_DEFAULTS, ...rawConfig };
  const candles = generateThreeHourCandles(pair, bars);
  const series = computeVapiSeries(candles, config.length);
  const confirmation = Math.max(1, Math.round(config.confirmation));

  const exposureUsdt = (config.capital * config.allocationPct) / 100 * config.leverage;
  const fee = (amount: number) => (amount * config.feePct) / 100;

  let capital = config.capital;
  let totalFees = 0;
  let position: {
    side: "LONG" | "SHORT";
    entryPrice: number;
    entryTime: string;
    vaAtEntry: number;
  } | null = null;
  // Pending-signal counters: a level crossing must HOLD for `confirmation`
  // consecutive 3H candles before the order is fired (state machine).
  let pendingLongBars = 0;
  let pendingShortBars = 0;

  const trades: VapiTrade[] = [];
  const crossings: VapiCrossing[] = [];
  const equityCurve: { time: string; equity: number }[] = [
    { time: series[0]?.time ?? "", equity: capital },
  ];

  const addCrossing = (
    type: VapiCrossing["type"],
    point: VapiPoint,
    previousVa: number,
    crossedLevel: number,
    label: string
  ) => {
    crossings.push({
      id: crossings.length + 1,
      time: point.time,
      price: point.close,
      va: point.va,
      previousVa: round2(previousVa),
      direction: point.va > previousVa ? "UP" : "DOWN",
      crossedLevel,
      type,
      label,
    });
  };

  const closePosition = (point: VapiPoint, reason: VapiTrade["reason"]) => {
    if (!position) return;
    const move =
      position.side === "LONG"
        ? (point.close - position.entryPrice) / position.entryPrice
        : (position.entryPrice - point.close) / position.entryPrice;

    const gross = exposureUsdt * move;
    const fees = fee(exposureUsdt) * 2;
    totalFees += fees;

    const pnl = gross - fees;
    capital += pnl;

    trades.push({
      id: trades.length + 1,
      side: position.side,
      entryTime: position.entryTime,
      exitTime: point.time,
      entryPrice: position.entryPrice,
      exitPrice: point.close,
      vaAtEntry: position.vaAtEntry,
      vaAtExit: point.va,
      pnlUsdt: round2(pnl),
      pnlPct: round2(move * 100),
      roiOnCapitalPct: round2((pnl / config.capital) * 100),
      reason,
    });

    equityCurve.push({ time: point.time, equity: round2(capital) });
    position = null;
  };

  for (let i = Math.max(config.length, confirmation); i < series.length; i++) {
    const point = series[i];
    const previous = series[i - 1];
    const prevVa = previous.va;
    const va = point.va;

    // ---- Level crossing audit (all four levels, for the dashboard log) ----
    if (prevVa < config.longEntry && va >= config.longEntry) {
      addCrossing("LONG_ENTRY", point, prevVa, config.longEntry, "LONG TRIGGER — accumulo sopra soglia");
    }
    if (prevVa > config.longExit && va <= config.longExit) {
      addCrossing("LONG_EXIT", point, prevVa, config.longExit, "LONG EXIT — pressione in esaurimento");
    }
    if (prevVa > config.shortEntry && va <= config.shortEntry) {
      addCrossing("SHORT_ENTRY", point, prevVa, config.shortEntry, "SHORT TRIGGER — distribuzione sotto soglia");
    }
    if (prevVa < config.shortExit && va >= config.shortExit) {
      addCrossing("SHORT_EXIT", point, prevVa, config.shortExit, "SHORT EXIT — vendita in esaurimento");
    }

    // ---- Position management ----
    if (position) {
      const move =
        position.side === "LONG"
          ? (point.close - position.entryPrice) / position.entryPrice
          : (position.entryPrice - point.close) / position.entryPrice;
      const movePct = move * 100;

      if (movePct <= -config.stopLossPct) {
        closePosition(point, "STOP LOSS");
      } else if (movePct >= config.takeProfitPct) {
        closePosition(point, "TAKE PROFIT");
      } else if (position.side === "LONG" && prevVa > config.longExit && va <= config.longExit) {
        closePosition(point, "LIVELLO VAPI");
      } else if (position.side === "SHORT" && prevVa < config.shortExit && va >= config.shortExit) {
        closePosition(point, "LIVELLO VAPI");
      }
    }

    if (!position) {
      // Count how many consecutive candles the VAPI held beyond each level.
      if (va >= config.longEntry) {
        pendingLongBars = prevVa < config.longEntry ? 1 : pendingLongBars + 1;
      } else {
        pendingLongBars = 0;
      }

      if (va <= config.shortEntry) {
        pendingShortBars = prevVa > config.shortEntry ? 1 : pendingShortBars + 1;
      } else {
        pendingShortBars = 0;
      }

      const longConfirmed =
        pendingLongBars === confirmation && va <= config.extremeLevel;
      const shortConfirmed =
        pendingShortBars === confirmation && va >= -config.extremeLevel;

      if (longConfirmed) {
        position = { side: "LONG", entryPrice: point.close, entryTime: point.time, vaAtEntry: va };
        pendingLongBars = 0;
        pendingShortBars = 0;
      } else if (shortConfirmed) {
        position = { side: "SHORT", entryPrice: point.close, entryTime: point.time, vaAtEntry: va };
        pendingLongBars = 0;
        pendingShortBars = 0;
      }
    }
  }

  // Close residual position at last price (marked to market)
  if (position) {
    const last = series[series.length - 1];
    closePosition(last, "FINE DATI");
  }

  const winning = trades.filter((t) => t.pnlUsdt > 0);
  const losing = trades.filter((t) => t.pnlUsdt < 0);
  const grossProfit = winning.reduce((acc, t) => acc + t.pnlUsdt, 0);
  const grossLoss = Math.abs(losing.reduce((acc, t) => acc + t.pnlUsdt, 0));

  let peak = config.capital;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    const dd = ((peak - point.equity) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, dd);
  }

  const netProfitUsdt = round2(capital - config.capital);
  const lastPoint = series[series.length - 1];

  return {
    config,
    pair,
    timeframe: VAPI_TIMEFRAME,
    stats: {
      initialCapital: config.capital,
      finalCapital: round2(capital),
      netProfitUsdt,
      netProfitPct: round2((netProfitUsdt / config.capital) * 100),
      winRate: trades.length ? round2((winning.length / trades.length) * 100) : 0,
      profitFactor: grossLoss > 0 ? round2(grossProfit / grossLoss) : grossProfit > 0 ? 99 : 0,
      maxDrawdown: round2(maxDrawdown),
      totalTrades: trades.length,
      winningTrades: winning.length,
      losingTrades: losing.length,
      avgVaAtEntry: trades.length ? round2(trades.reduce((a, t) => a + t.vaAtEntry, 0) / trades.length) : 0,
      totalFees: round2(totalFees),
      exposureUsdt: round2(exposureUsdt),
    },
    trades: trades.slice().reverse(),
    equityCurve,
    series,
    crossings: crossings.slice().reverse(),
    current: {
      va: lastPoint?.va ?? 0,
      close: lastPoint?.close ?? 0,
      time: lastPoint?.time ?? "",
      zone: classifyVapi(lastPoint?.va ?? 0, config),
      distanceToLongEntry: round2(config.longEntry - (lastPoint?.va ?? 0)),
      distanceToShortEntry: round2((lastPoint?.va ?? 0) - config.shortEntry),
    },
  };
}
