import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { tradingBots } from "./schema";

const PAIRS = ["BTC/USDT", "ETH/USDT"] as const;
const DEFAULT_CONFIG = {
  indicator: "VAPI_LazyBear",
  strategy: "VAPI_LADDER_3H",
  timeframe: "3h",
  baseSizeUsdt: 500,
  levels: [-25, -32, -40],
  multipliers: [1, 1.5, 2.5],
  maxBuys: 3,
  plans: {
    "1": [{ level: 12, fractionPct: 100 }],
    "2": [{ level: 5, fractionPct: 50 }, { level: 15, fractionPct: 100 }],
    "3": [{ level: 0, fractionPct: 50 }, { level: 15, fractionPct: 50 }, { level: 22, fractionPct: 100 }],
  },
  feePct: 0.035,
  capital: 10000,
  vapiLength: 10,
  gateLevels: true,
};

/** Idempotently creates only the BTC and ETH paper instances. No demo orders or fake exchange profiles. */
export async function seedInitialData() {
  const created: string[] = [];
  for (const pair of PAIRS) {
    const [existing] = await db.select().from(tradingBots).where(
      and(eq(tradingBots.strategyKey, "vapi_ladder"), eq(tradingBots.pair, pair))
    ).limit(1);
    if (existing) continue;
    await db.insert(tradingBots).values({
      name: `Bull Lab VAPI Ladder 3H ${pair.split("/")[0]}`,
      pair,
      strategyKey: "vapi_ladder",
      platform: "paper_trading",
      mode: "paper",
      status: "active",
      leverage: 1,
      orderSizeUsdt: "500",
      stopLossPct: "0",
      takeProfitPct: "22",
      trailingStopPct: "0",
      timeframe: "3h",
      totalPnL: "0",
      winCount: 0,
      lossCount: 0,
      webhookSecret: `BL_${randomBytes(24).toString("hex")}`,
      config: {
        ...DEFAULT_CONFIG,
        ladderState: { buys: 0, sells: 0, lastBuyCandle: null, investedUsdt: 0, positionQty: 0, avgEntry: 0, feesPaidUsdt: 0 },
      },
    });
    created.push(pair);
  }
  return { message: "Seed paper VAPI Ladder completato", created, pairs: PAIRS };
}
