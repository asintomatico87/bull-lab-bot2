import { NextResponse } from "next/server";
import {
  VAPI_LADDER_DEFAULTS,
  runVapiLadder,
  type LadderConfig,
  type LadderTarget,
} from "@/lib/vapi-ladder";

function num(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: unknown, fallback: number[]): number[] {
  if (Array.isArray(value)) {
    const parsed = value.map((v) => num(v, NaN)).filter((v) => Number.isFinite(v));
    return parsed.length === fallback.length ? parsed : fallback;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = value
      .split(",")
      .map((v) => num(v.trim(), NaN))
      .filter((v) => Number.isFinite(v));
    return parsed.length === fallback.length ? parsed : fallback;
  }
  return fallback;
}

function parseTargets(value: unknown, fallback: LadderTarget[]): LadderTarget[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const parsed = value
    .map((target: Record<string, unknown>) => ({
      level: Number(target.level),
      fractionPct: Number(target.fractionPct),
    }))
    .filter((t) => Number.isFinite(t.level) && Number.isFinite(t.fractionPct) && t.fractionPct > 0);
  return parsed.length ? parsed : fallback;
}

export function normalizeLadderConfig(input: Record<string, unknown>): LadderConfig {
  const defaults = VAPI_LADDER_DEFAULTS;
  const rawPlans = (input.plans ?? {}) as Record<string, unknown>;

  return {
    baseSizeUsdt: Math.max(10, num(input.baseSizeUsdt, defaults.baseSizeUsdt)),
    levels: parseList(input.levels, defaults.levels),
    multipliers: parseList(input.multipliers, defaults.multipliers),
    maxBuys: Math.min(5, Math.max(1, Math.round(num(input.maxBuys, defaults.maxBuys)))),
    plans: {
      "1": parseTargets(rawPlans["1"], defaults.plans["1"]),
      "2": parseTargets(rawPlans["2"], defaults.plans["2"]),
      "3": parseTargets(rawPlans["3"], defaults.plans["3"]),
    },
    feePct: Math.max(0, num(input.feePct, defaults.feePct)),
    capital: Math.max(100, num(input.capital, defaults.capital)),
    vapiLength: Math.min(100, Math.max(1, Math.round(num(input.vapiLength, defaults.vapiLength)))),
  };
}

function fromQuery(searchParams: URLSearchParams): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  searchParams.forEach((value, key) => {
    if (key === "pair" || key === "bars") return;
    if (key === "levels" || key === "multipliers") {
      input[key] = value;
      return;
    }
    if (key.startsWith("plan")) {
      const match = /^plan(\d)Levels?/.exec(key);
      if (match) input[key] = value;
      return;
    }
    input[key] = value;
  });

  // Compact plan notation from query string: p1=12:100&p2=5:50,15:100&p3=0:50,15:50,22:100
  const plans: Record<string, LadderTarget[]> = {};
  for (const key of ["p1", "p2", "p3"]) {
    const raw = searchParams.get(key);
    if (!raw) continue;
    const targets = raw
      .split(",")
      .map((chunk) => chunk.split(":").map((v) => Number(v.trim())))
      .filter((pair) => pair.length === 2 && pair.every((v) => Number.isFinite(v)))
      .map(([level, fractionPct]) => ({ level, fractionPct }));
    if (targets.length) plans[key.slice(1)] = targets;
  }
  if (Object.keys(plans).length) input.plans = plans;

  return input;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pair = searchParams.get("pair") || "BTC/USDT";
    const bars = Math.min(400, Math.max(60, Math.round(num(searchParams.get("bars"), 180))));
    const config = normalizeLadderConfig(fromQuery(searchParams));
    const result = runVapiLadder(pair, config, bars);

    return NextResponse.json({
      success: true,
      indicator: {
        name: "Volume Accumulation Percentage Indicator [LazyBear]",
        shortName: "VAPI_LB",
        author: "LazyBear",
        timeframe: "3H",
        source: "https://it.tradingview.com/v/kVk6pN9z/",
      },
      strategy: "VAPI_LADDER_3H",
      rules: {
        maxBuys: config.maxBuys,
        oneBuyPerCandle: true,
        oneBuyPerRung: true,
        martingale: config.multipliers,
        buyLevels: config.levels,
        sellPlans: config.plans,
        stopLoss: "disabled (rule 1)",
      },
      config: result.config,
      series: result.series.slice(-96),
      events: result.events,
      cycles: result.cycles,
      equityCurve: result.equityCurve,
      state: result.state,
      stats: result.stats,
    });
  } catch (error) {
    console.error("VAPI ladder GET error:", error);
    return NextResponse.json({ error: "Impossibile eseguire la scala VAPI", details: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pair = typeof body.pair === "string" ? body.pair : "BTC/USDT";
    const bars = Math.min(400, Math.max(60, Math.round(num(body.bars, 180))));
    const config = normalizeLadderConfig(body ?? {});
    const result = runVapiLadder(pair, config, bars);

    return NextResponse.json({ success: true, strategy: "VAPI_LADDER_3H", ...result });
  } catch (error) {
    console.error("VAPI ladder POST error:", error);
    return NextResponse.json({ error: "Backtest scala VAPI fallito", details: String(error) }, { status: 500 });
  }
}
