#!/usr/bin/env node
/**
 * Bull Lab — garantisce che il bot "VAPI Ladder 3H" esista nel database.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." node scripts/ensure-ladder-bot.js
 *   (oppure, se il file .env è nella cartella: node scripts/ensure-ladder-bot.js)
 *
 * È idempotente: se il bot c'è già, non tocca niente e mostra la sua secret.
 * NON stampa la secret se non è il proprietario a chiederlo: la mostra perché
 * serve per configurare TradingView.
 */
require("dotenv").config();
const { Client } = require("pg");

const CONFIG = {
  indicator: "VAPI_LazyBear",
  strategy: "VAPI_LADDER_3H",
  timeframe: "3h",
  baseSizeUsdt: 500,
  levels: [-25, -32, -40],
  multipliers: [1, 1.5, 2.5],
  maxBuys: 3,
  plans: {
    1: [{ level: 12, fractionPct: 100 }],
    2: [
      { level: 5, fractionPct: 50 },
      { level: 15, fractionPct: 100 },
    ],
    3: [
      { level: 0, fractionPct: 50 },
      { level: 15, fractionPct: 50 },
      { level: 22, fractionPct: 100 },
    ],
  },
  feePct: 0.035,
  capital: 10000,
  vapiLength: 10,
  gateLevels: true,
  buyTrigger: "intrabar",
  sellTrigger: "close",
  ladderState: {
    buys: 0,
    sells: 0,
    lastBuyCandle: null,
    lastSellEvalCandle: null,
    investedUsdt: 0,
    avgEntry: 0,
    positionQty: 0,
  },
};

function randomSecret() {
  return "BL_" + Math.random().toString(36).slice(2, 9).toUpperCase();
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL mancante. Esempio:");
    console.error('  DATABASE_URL="postgresql://..." node scripts/ensure-ladder-bot.js');
    process.exit(1);
  }

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 12000 });
  await client.connect();

  try {
    const found = await client.query(
      "select id, name, webhook_secret, status from trading_bots where strategy_key = 'vapi_ladder' limit 1"
    );

    if (found.rows.length > 0) {
      const bot = found.rows[0];
      console.log("✓ Il bot VAPI Ladder esiste già");
      console.log("  id:      " + bot.id);
      console.log("  nome:    " + bot.name);
      console.log("  stato:   " + bot.status);
      console.log("  secret:  " + bot.webhook_secret);
      console.log("");
      console.log("  URL webhook per TradingView:");
      console.log("  https://bot.bulllab.one/api/webhook/tradingview");
      return;
    }

    const secret = randomSecret();
    const inserted = await client.query(
      `insert into trading_bots
        (name, pair, strategy_key, platform, mode, status, leverage, order_size_usdt,
         stop_loss_pct, take_profit_pct, trailing_stop_pct, timeframe, total_pnl,
         win_count, loss_count, webhook_secret, config)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       returning id, name, webhook_secret`,
      [
        "Bull Lab VAPI Ladder 3H",
        "BTC/USDT",
        "vapi_ladder",
        "hyperliquid_dex",
        "paper",
        "active",
        1,
        500,
        0, // NESSUNO stop loss, per regola
        22,
        0,
        "3h",
        0,
        0,
        0,
        secret,
        JSON.stringify(CONFIG),
      ]
    );

    console.log("✓ Bot VAPI Ladder creato");
    console.log("  id:      " + inserted.rows[0].id);
    console.log("  secret:  " + inserted.rows[0].webhook_secret);
    console.log("");
    console.log("  URL webhook per TradingView:");
    console.log("  https://bot.bulllab.one/api/webhook/tradingview");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("✗ Errore:", err.message);
  process.exit(1);
});
