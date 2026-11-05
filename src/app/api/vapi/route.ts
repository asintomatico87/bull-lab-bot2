import { NextResponse } from "next/server";
import { runVapiBacktest, VAPI_DEFAULTS, generateThreeHourCandles, computeVapiSeries, classifyVapi, type VapiConfig } from "@/lib/vapi";

function num(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseConfig(input: Record<string, unknown>): VapiConfig {
  return {
    length: Math.min(100, Math.max(1, Math.round(num(input.length, VAPI_DEFAULTS.length)))),
    longEntry: num(input.longEntry, VAPI_DEFAULTS.longEntry),
    longExit: num(input.longExit, VAPI_DEFAULTS.longExit),
    shortEntry: num(input.shortEntry, VAPI_DEFAULTS.shortEntry),
    shortExit: num(input.shortExit, VAPI_DEFAULTS.shortExit),
    confirmation: Math.min(5, Math.max(1, Math.round(num(input.confirmation, VAPI_DEFAULTS.confirmation)))),
    extremeLevel: num(input.extremeLevel, VAPI_DEFAULTS.extremeLevel),
    stopLossPct: Math.min(50, Math.max(0.1, num(input.stopLossPct, VAPI_DEFAULTS.stopLossPct))),
    takeProfitPct: Math.min(100, Math.max(0.1, num(input.takeProfitPct, VAPI_DEFAULTS.takeProfitPct))),
    leverage: Math.min(50, Math.max(1, num(input.leverage, VAPI_DEFAULTS.leverage))),
    capital: Math.max(100, num(input.capital, VAPI_DEFAULTS.capital)),
    allocationPct: Math.min(100, Math.max(1, num(input.allocationPct, VAPI_DEFAULTS.allocationPct))),
    feePct: Math.max(0, num(input.feePct, VAPI_DEFAULTS.feePct)),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pair = searchParams.get("pair") || "BTC/USDT";
    const bars = Math.min(300, Math.max(60, Math.round(num(searchParams.get("bars"), 132))));

    const input: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      input[key] = value;
    });

    const config = parseConfig(input);
    const result = runVapiBacktest(pair, config, bars);

    // Lightweight live series (last 72 candles) + derived regime for the gauge
    const candles = generateThreeHourCandles(pair, bars);
    const liveSeries = computeVapiSeries(candles, config.length).slice(-72);
    const livePoint = result.series[result.series.length - 1];

    return NextResponse.json({
      success: true,
      indicator: {
        name: "Volume Accumulation Percentage Indicator [LazyBear]",
        shortName: "VAPI_LB",
        author: "LazyBear",
        timeframe: "3H",
        formula: "VAPI = 100 × Σ(volume × x, length) / Σ(volume, length) — x = (2·close − high − low) / (high − low)",
        source: "https://it.tradingview.com/v/kVk6pN9z/",
      },
      pair,
      config,
      series: result.series,
      liveSeries,
      crossings: result.crossings.slice(0, 20),
      current: result.current,
      zone: classifyVapi(livePoint?.va ?? 0, config),
      stats: result.stats,
      trades: result.trades.slice(0, 30),
      equityCurve: result.equityCurve,
      lastCandle: candles[candles.length - 1],
    });
  } catch (error) {
    console.error("VAPI GET error:", error);
    return NextResponse.json({ error: "Impossibile calcolare il VAPI", details: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pair = typeof body.pair === "string" ? body.pair : "BTC/USDT";
    const bars = Math.min(300, Math.max(60, Math.round(num(body.bars, 132))));
    const config = parseConfig(body ?? {});
    const result = runVapiBacktest(pair, config, bars);

    return NextResponse.json({
      success: true,
      indicator: "VAPI_LB (LazyBear)",
      ...result,
    });
  } catch (error) {
    console.error("VAPI POST error:", error);
    return NextResponse.json({ error: "Backtest VAPI fallito", details: String(error) }, { status: 500 });
  }
}
