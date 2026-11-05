import { NextResponse } from "next/server";

interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Generate realistic technical series for backtesting
function generateHistoricalCandles(asset: "BTC" | "ETH", count: number = 180): Candle[] {
  const basePrice = asset === "BTC" ? 72000 : 2100;
  const targetPrice = asset === "BTC" ? 84200 : 2480;
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now();
  const stepMs = 3600 * 1000 * 4; // 4h candles (30 days)

  for (let i = count; i >= 0; i--) {
    const timestamp = now - i * stepMs;
    const date = new Date(timestamp);
    const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;

    // Macro drift towards targetPrice + cyclical waves + noise
    const progress = (count - i) / count;
    const wave = Math.sin(progress * Math.PI * 4) * 0.04;
    const randomStep = (Math.random() - 0.47) * 0.022;
    const change = (targetPrice - basePrice) / count / basePrice + wave * 0.02 + randomStep;

    const open = price;
    const close = Math.round((open * (1 + change)) * 100) / 100;
    const high = Math.round((Math.max(open, close) * (1 + Math.random() * 0.015)) * 100) / 100;
    const low = Math.round((Math.min(open, close) * (1 - Math.random() * 0.015)) * 100) / 100;
    const volume = Math.round(500 + Math.random() * 2000);

    candles.push({ time: timeStr, timestamp, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

// EMA calculator
function calcEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArr: number[] = [];
  let ema = prices[0];
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      ema = (ema * i + prices[i]) / (i + 1);
    } else {
      ema = prices[i] * k + ema * (1 - k);
    }
    emaArr.push(Math.round(ema * 100) / 100);
  }
  return emaArr;
}

// RSI calculator
function calcRSI(prices: number[], period: number = 14): number[] {
  const rsiArr: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      rsiArr.push(50);
      continue;
    }
    const diff = prices[i] - prices[i - 1];
    if (i <= period) {
      if (diff > 0) gains += diff;
      else losses -= diff;
      rsiArr.push(50);
    } else {
      const currentGain = diff > 0 ? diff : 0;
      const currentLoss = diff < 0 ? -diff : 0;
      gains = (gains * (period - 1) + currentGain) / period;
      losses = (losses * (period - 1) + currentLoss) / period;
      if (losses === 0) {
        rsiArr.push(100);
      } else {
        const rs = gains / losses;
        rsiArr.push(Math.round((100 - (100 / (1 + rs))) * 10) / 10);
      }
    }
  }
  return rsiArr;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      pair = "BTC/USDT",
      strategyType = "bull_lab_confluence",
      initialCapital = 10000,
      leverage = 3,
      stopLossPct = 2.5,
      takeProfitPct = 6.0,
      emaFast = 9,
      emaSlow = 21,
      rsiOversold = 30,
      rsiOverbought = 70,
    } = body;

    const asset = pair.includes("ETH") ? "ETH" : "BTC";
    const candles = generateHistoricalCandles(asset, 120);
    const closes = candles.map((c) => c.close);

    const fastEmaArr = calcEMA(closes, Number(emaFast));
    const slowEmaArr = calcEMA(closes, Number(emaSlow));
    const rsiArr = calcRSI(closes, 14);

    let capital = Number(initialCapital);
    const trades: any[] = [];
    const equityCurve: { time: string; equity: number }[] = [
      { time: candles[0].time, equity: capital },
    ];

    let inPosition: "LONG" | "SHORT" | null = null;
    let entryPrice = 0;
    let entryIndex = 0;
    let entryTime = "";

    const lev = Number(leverage);
    const sl = Number(stopLossPct) / 100;
    const tp = Number(takeProfitPct) / 100;

    for (let i = 25; i < candles.length; i++) {
      const price = candles[i].close;
      const time = candles[i].time;
      const rsi = rsiArr[i];
      const fast = fastEmaArr[i];
      const slow = slowEmaArr[i];
      const prevFast = fastEmaArr[i - 1];
      const prevSlow = slowEmaArr[i - 1];

      let signalLong = false;
      let signalShort = false;

      if (strategyType === "ema_cross") {
        signalLong = prevFast <= prevSlow && fast > slow;
        signalShort = prevFast >= prevSlow && fast < slow;
      } else if (strategyType === "rsi_reversal") {
        signalLong = rsiArr[i - 1] <= rsiOversold && rsi > rsiOversold;
        signalShort = rsiArr[i - 1] >= rsiOverbought && rsi < rsiOverbought;
      } else if (strategyType === "bollinger_breakout") {
        const ma = slow;
        signalLong = price > ma * 1.018 && fast > slow;
        signalShort = price < ma * 0.982 && fast < slow;
      } else {
        // Bull Lab Multi-Confluence Matrix (Asintomatico Formula)
        const trendUp = fast > slow;
        const rsiMomentum = rsi >= 44 && rsi <= 68;
        signalLong = trendUp && rsiMomentum && closes[i] > closes[i - 1];
        const trendDown = fast < slow;
        const rsiWeakness = rsi <= 54 && rsi >= 32;
        signalShort = trendDown && rsiWeakness && closes[i] < closes[i - 1];
      }

      // Check current open position exit (SL / TP / Opposing signal)
      if (inPosition === "LONG") {
        const pnlRawPct = (price - entryPrice) / entryPrice;
        const pnlLevPct = pnlRawPct * lev;

        const hitSL = pnlRawPct <= -sl;
        const hitTP = pnlRawPct >= tp;
        const exitSignal = signalShort;

        if (hitSL || hitTP || exitSignal) {
          const positionSize = capital * 0.25; // 25% allocation per trade
          const tradePnl = positionSize * pnlLevPct;
          capital += tradePnl;

          trades.push({
            id: trades.length + 1,
            type: "LONG",
            entryPrice,
            exitPrice: price,
            entryTime,
            exitTime: time,
            pnlUsdt: Math.round(tradePnl * 100) / 100,
            pnlPct: Math.round(pnlLevPct * 1000) / 10,
            reason: hitTP ? "Take Profit" : hitSL ? "Stop Loss" : "Signal Reversal",
          });

          equityCurve.push({ time, equity: Math.round(capital * 100) / 100 });
          inPosition = null;
        }
      } else if (inPosition === "SHORT") {
        const pnlRawPct = (entryPrice - price) / entryPrice;
        const pnlLevPct = pnlRawPct * lev;

        const hitSL = pnlRawPct <= -sl;
        const hitTP = pnlRawPct >= tp;
        const exitSignal = signalLong;

        if (hitSL || hitTP || exitSignal) {
          const positionSize = capital * 0.25;
          const tradePnl = positionSize * pnlLevPct;
          capital += tradePnl;

          trades.push({
            id: trades.length + 1,
            type: "SHORT",
            entryPrice,
            exitPrice: price,
            entryTime,
            exitTime: time,
            pnlUsdt: Math.round(tradePnl * 100) / 100,
            pnlPct: Math.round(pnlLevPct * 1000) / 10,
            reason: hitTP ? "Take Profit" : hitSL ? "Stop Loss" : "Signal Reversal",
          });

          equityCurve.push({ time, equity: Math.round(capital * 100) / 100 });
          inPosition = null;
        }
      }

      // Open new position if flat
      if (!inPosition) {
        if (signalLong) {
          inPosition = "LONG";
          entryPrice = price;
          entryIndex = i;
          entryTime = time;
        } else if (signalShort) {
          inPosition = "SHORT";
          entryPrice = price;
          entryIndex = i;
          entryTime = time;
        }
      }
    }

    // Performance statistics
    const winningTrades = trades.filter((t) => t.pnlUsdt > 0);
    const losingTrades = trades.filter((t) => t.pnlUsdt < 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnlUsdt, 0);
    const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnlUsdt, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

    // Drawdown calculation
    let peak = initialCapital;
    let maxDrawdown = 0;
    for (const pt of equityCurve) {
      if (pt.equity > peak) peak = pt.equity;
      const dd = ((peak - pt.equity) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const netProfitUsdt = Math.round((capital - initialCapital) * 100) / 100;
    const netProfitPct = Math.round((netProfitUsdt / initialCapital) * 1000) / 10;

    return NextResponse.json({
      success: true,
      strategyType,
      pair,
      stats: {
        initialCapital,
        finalCapital: Math.round(capital * 100) / 100,
        netProfitUsdt,
        netProfitPct,
        winRate: Math.round(winRate * 10) / 10,
        profitFactor: Math.round(profitFactor * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 10) / 10,
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
      },
      trades: trades.slice(-25).reverse(),
      equityCurve: equityCurve.slice(-30),
      indicatorsSample: {
        lastClose: closes[closes.length - 1],
        lastEmaFast: fastEmaArr[fastEmaArr.length - 1],
        lastEmaSlow: slowEmaArr[slowEmaArr.length - 1],
        lastRsi: rsiArr[rsiArr.length - 1],
      },
    });
  } catch (error) {
    console.error("Backtest execution failed:", error);
    return NextResponse.json({ error: "Backtest failed", details: String(error) }, { status: 500 });
  }
}
