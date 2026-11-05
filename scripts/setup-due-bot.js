#!/usr/bin/env node
/**
 * Bull Lab — configurazione pulita: SOLO due bot (BTC ed ETH)
 *
 *   DATABASE_URL="postgresql://..." node scripts/setup-due-bot.js
 *
 * Cosa fa, nell'ordine:
 *   1. elimina TUTTI gli ordini e i log del webhook (storico pulito)
 *   2. elimina tutti i bot esistenti
 *   3. crea "Bull Lab VAPI Ladder 3H BTC" su BTC/USDT
 *   4. crea "Bull Lab VAPI Ladder 3H ETH" su ETH/USDT
 *   5. stampa le due secret da usare negli script TradingView
 *
 * Regole applicate (identiche per entrambi):
 *   R1 max 3 acquisti, NESSUNO stop loss
 *   R2 massimo un acquisto per candela 3H
 *   R3 martingala 1x / 1,5x / 2,5x
 *   R4 livelli VAPI <= -25 / -32 / -40
 *   R5 un acquisto per scaglione
 *   R6 uscite: 3 buy -> 50% @>=0, 50% residuo @>=15, chiusura @>=22
 *              2 buy -> 50% @>=5, resto @>=15
 *              1 buy -> 100% @>=12
 */
require("dotenv").config();
const { Client } = require("pg");

const BASE_SIZE = 500;

const LADDER_CONFIG = {
  indicator: "VAPI_LazyBear",
  strategy: "VAPI_LADDER_3H",
  timeframe: "3h",
  baseSizeUsdt: BASE_SIZE,
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

function newSecret() {
  return "BL_" + Math.random().toString(36).slice(2, 9).toUpperCase();
}

async function createBot(client, pair) {
  const asset = pair.startsWith("ETH") ? "ETH" : "BTC";
  const secret = newSecret();

  const { rows } = await client.query(
    `INSERT INTO trading_bots
       (name, pair, strategy_key, platform, mode, status, leverage, order_size_usdt,
        stop_loss_pct, take_profit_pct, trailing_stop_pct, timeframe, total_pnl,
        win_count, loss_count, webhook_secret, config)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id, name, pair, webhook_secret`,
    [
      `Bull Lab VAPI Ladder 3H ${asset}`,
      pair,
      "vapi_ladder",
      "hyperliquid_dex",
      "paper",
      "active",
      1,
      BASE_SIZE,
      0, // nessuno stop loss, per regola
      22, // chiusura totale del piano con 3 buy
      0, // nessun trailing stop
      "3h",
      0,
      0,
      0,
      secret,
      JSON.stringify(LADDER_CONFIG),
    ]
  );

  return rows[0];
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL mancante.");
    console.error('  Uso: DATABASE_URL="postgresql://..." node scripts/setup-due-bot.js');
    process.exit(1);
  }

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });
  await client.connect();

  try {
    await client.query("BEGIN");

    // 1. storico pulito
    const orders = await client.query("DELETE FROM trade_orders");
    const logs = await client.query("DELETE FROM webhook_logs");
    console.log(`✓ Puliti ${orders.rowCount} ordini e ${logs.rowCount} log del webhook`);

    // 2. via i bot vecchi (compresi quelli demo)
    const removed = await client.query("DELETE FROM trading_bots");
    console.log(`✓ Rimossi ${removed.rowCount} bot esistenti`);

    // 3. i due bot definitivi
    const btc = await createBot(client, "BTC/USDT");
    const eth = await createBot(client, "ETH/USDT");

    await client.query("COMMIT");

    console.log("");
    console.log("┌──────────────────────────────────────────────────────────────");
    console.log("│ DUE BOT PRONTI · stesse 6 regole, scale separate");
    console.log("├──────────────────────────────────────────────────────────────");
    console.log(`│ BTC  id ${String(btc.id).padEnd(4)} ${btc.pair.padEnd(9)} secret: ${btc.webhook_secret}`);
    console.log(`│ ETH  id ${String(eth.id).padEnd(4)} ${eth.pair.padEnd(9)} secret: ${eth.webhook_secret}`);
    console.log("├──────────────────────────────────────────────────────────────");
    console.log("│ Livelli  : VAPI <= -25 (1x) / -32 (1,5x) / -40 (2,5x)");
    console.log("│ Uscite   : 3 buy -> 50%@0, 50%@15, 100%@22");
    console.log("│            2 buy -> 50%@5, resto@15");
    console.log("│            1 buy -> 100%@12");
    console.log("│ Stop loss: NESSUNO (regola 1)");
    console.log("│ Base size: 500 USDT (esposizione max 1250 = 5x)");
    console.log("├──────────────────────────────────────────────────────────────");
    console.log("│ URL webhook (identico per entrambi):");
    console.log("│   https://bot.bulllab.one/api/webhook/tradingview");
    console.log("└──────────────────────────────────────────────────────────────");
    console.log("");
    console.log("PROSSIMI PASSI");
    console.log("1. Nel cruscotto apri Ladder 3H, seleziona BTC, copia lo script Pine");
    console.log("   e applicalo sul grafico BTCUSDT 3h di TradingView.");
    console.log("2. Stessa cosa con ETH: seleziona ETH, copia lo script, applicalo su ETHUSDT 3h.");
    console.log("3. Crea un alert per grafico: condizione 'Qualsiasi chiamata della funzione alert()',");
    console.log("   URL webhook come sopra, messaggio VUOTO.");
    console.log("4. Nella scheda TradingView Alert del cruscotto verifica che il menu");
    console.log("   'Bot di Destinazione' elenchi i due nuovi bot.");
    console.log("");
    console.log("NOTA: le secret sono nuove. Gli alert creati prima vanno rifatti");
    console.log("      con lo script aggiornato (che contiene la secret giusta).");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("✗ Errore:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
