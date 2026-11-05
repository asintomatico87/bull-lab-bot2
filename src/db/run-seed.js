const { Pool } = require("pg");
const { randomBytes } = require("node:crypto");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required; no seed data was written.");
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const config = {
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
  ladderState: { buys: 0, sells: 0, lastBuyCandle: null, investedUsdt: 0, positionQty: 0, avgEntry: 0, feesPaidUsdt: 0 },
};

async function seed() {
  const client = await pool.connect();
  try {
    for (const pair of ["BTC/USDT", "ETH/USDT"]) {
      const existing = await client.query(
        "SELECT id FROM trading_bots WHERE strategy_key = $1 AND pair = $2 LIMIT 1",
        ["vapi_ladder", pair]
      );
      if (existing.rowCount) {
        console.log(`${pair}: already exists; preserved.`);
        continue;
      }
      await client.query(
        `INSERT INTO trading_bots
          (name, pair, strategy_key, platform, mode, status, leverage, order_size_usdt, stop_loss_pct,
           take_profit_pct, trailing_stop_pct, timeframe, total_pnl, win_count, loss_count, webhook_secret, config)
         VALUES ($1,$2,'vapi_ladder','paper_trading','paper','active',1,500,0,22,0,'3h',0,0,0,$3,$4::jsonb)`,
        [`Bull Lab VAPI Ladder 3H ${pair.split("/")[0]}`, pair, `BL_${randomBytes(24).toString("hex")}`, JSON.stringify(config)]
      );
      console.log(`${pair}: paper bot created.`);
    }
    console.log("Seed completato. Nessun ordine demo o profilo exchange è stato creato.");
  } finally {
    client.release();
    await pool.end();
  }
}
seed().catch((error) => { console.error("Seed failed:", error); process.exit(1); });
