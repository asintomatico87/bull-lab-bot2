const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    const existing = await client.query("SELECT COUNT(*) FROM exchange_profiles");
    if (parseInt(existing.rows[0].count) > 0) {
      console.log("Already seeded.");
      return;
    }

    console.log("Seeding exchange profiles...");
    await client.query(`
      INSERT INTO exchange_profiles (name, platform_key, kyc_type, api_key_masked, wallet_address, balance_usdt, is_testnet, is_active)
      VALUES 
      ('Hyperliquid Perp L1 (DEX)', 'hyperliquid_dex', 'DECENTRALIZED', '0x7a3...c91d', '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db', 12500.00, true, true),
      ('OurBit Futures (No-KYC)', 'ourbit_nokyc', 'NO_KYC', 'ourbit_ak_98124f...7a', NULL, 5400.00, true, true),
      ('Bitbase Affiliate Pro', 'bitbase', 'LOW_KYC', 'bitbase_live_3309...0b', NULL, 3200.00, true, true),
      ('Bybit V5 Unified (CEX)', 'bybit', 'FULL_KYC', 'byb_live_key_9182...44', NULL, 18400.00, true, true),
      ('Binance USD-M Futures', 'binance', 'FULL_KYC', 'binance_f_981...ef', NULL, 15000.00, true, true),
      ('Paper Trading Virtual Engine', 'paper_trading', 'NO_KYC', 'PAPER_SIM_ACCOUNT', NULL, 25000.00, true, true);
    `);

    console.log("Seeding custom strategies...");
    const pineScript1 = `//@version=5\\nstrategy("Bull Lab Confluence Matrix [TradingView]", overlay=true, initial_capital=10000)\\nfastEMA = ta.ema(close, 21)\\nslowEMA = ta.ema(close, 200)\\nrsiVal = ta.rsi(close, 14)\\n[supertrend, direction] = ta.supertrend(3.0, 10)\\nlongCond = ta.crossover(close, supertrend) and close > slowEMA and rsiVal > 45\\nshortCond = ta.crossunder(close, supertrend) and close < slowEMA and rsiVal < 55\\nif (longCond)\\n    strategy.entry("BullLab_LONG", strategy.long)\\nif (shortCond)\\n    strategy.entry("BullLab_SHORT", strategy.short)`;
    
    await client.query(`
      INSERT INTO custom_strategies (name, description, pair, timeframe, pine_script, backtest_stats, is_bull_lab_preset)
      VALUES 
      ('Bull Lab Confluence Matrix (Asintomatico Formula)', 'Strategia multi-indicatore di alta precisione basata su trend following con Supertrend, filtro direzionale EMA 200, momentum RSI 14 e trailing stop ATR.', 'BTC/USDT', '1h', $1, '{"winRate": 68.4, "profitFactor": 2.34, "maxDrawdown": 6.8, "totalTrades": 92, "netProfitUsdt": 8420, "netProfitPct": 84.2}', true),
      ('Dynamic EMA Golden Pulse (9/21/50)', 'Sistema ad alta frequenza per scalp rapido su Ethereum basato sull incrocio delle medie mobili esponenziali con conferme sui volumi.', 'ETH/USDT', '15m', $2, '{"winRate": 61.2, "profitFactor": 1.88, "maxDrawdown": 9.2, "totalTrades": 148, "netProfitUsdt": 5120, "netProfitPct": 51.2}', true),
      ('Bollinger Bands Volatility Squeeze', 'Rileva la compressione della deviazione standard ed entra sul breakout esplosivo delle bande con trailing stop dinamico.', 'BTC/USDT', '4h', '// Bollinger Squeeze', '{"winRate": 58.7, "profitFactor": 1.74, "maxDrawdown": 8.1, "totalTrades": 63, "netProfitUsdt": 4230, "netProfitPct": 42.3}', true),
      ('RSI Extreme Divergence & Reversal', 'Identifica condizioni estreme di ipervenduto (<28) o ipercomprato (>72) con divergenze su supporti/resistenze chiave.', 'ETH/USDT', '1h', '// RSI Divergence', '{"winRate": 64.0, "profitFactor": 1.95, "maxDrawdown": 7.5, "totalTrades": 86, "netProfitUsdt": 3890, "netProfitPct": 38.9}', true);
    `, [pineScript1, pineScript1]);

    await client.query(`
      INSERT INTO custom_strategies (name, description, pair, timeframe, pine_script, backtest_stats, is_bull_lab_preset)
      VALUES (
        'Bull Lab VAPI 3H Pressure Matrix [LazyBear]',
        'Strategia principale a soglie sul Volume Accumulation Percentage di LazyBear: LONG su accumulazione, SHORT su distribuzione, uscite sui livelli di esaurimento. Timeframe 3H.',
        'BTC/USDT', '3h',
        '// Bull Lab VAPI 3H [LazyBear] — Pine Script v5 generato dalla dashboard',
        '{"winRate": 64.7, "profitFactor": 2.12, "maxDrawdown": 7.4, "totalTrades": 34, "netProfitUsdt": 6480, "netProfitPct": 64.8, "indicator": "VAPI_LazyBear"}',
        true
      );
    `);

    console.log("Seeding trading bots...");
    const botsResult = await client.query(`
      INSERT INTO trading_bots (name, pair, strategy_key, platform, mode, status, leverage, order_size_usdt, stop_loss_pct, take_profit_pct, trailing_stop_pct, timeframe, total_pnl, win_count, loss_count, webhook_secret, config)
      VALUES 
      ('Bull Lab BTC Alpha Trend', 'BTC/USDT', 'bull_lab_confluence', 'hyperliquid_dex', 'paper', 'active', 5, 750, 2.5, 6.5, 1.5, '1h', 1420.50, 14, 4, 'BULL_LAB_SEC_77', '{"fastEma": 21, "slowEma": 200, "rsiMin": 45, "rsiMax": 68}'),
      ('ETH Dynamic EMA Pulse', 'ETH/USDT', 'ema_cross', 'ourbit_nokyc', 'paper', 'active', 3, 500, 2.0, 5.0, 1.2, '15m', 890.20, 19, 8, 'BULL_LAB_ETH_88', '{"fastEma": 9, "midEma": 21, "trendEma": 50}'),
      ('BTC Squeeze Breakout 4H', 'BTC/USDT', 'bollinger_breakout', 'bitbase', 'paper', 'paused', 2, 600, 3.0, 7.0, 2.0, '4h', 430.00, 7, 3, 'BULL_LAB_SQUEEZE_99', '{"bbLength": 20, "bbMult": 2.0}'),
      ('ETH RSI Mean Reversion', 'ETH/USDT', 'rsi_mean_reversion', 'hyperliquid_dex', 'paper', 'active', 3, 450, 2.2, 4.8, 1.0, '1h', 612.80, 11, 5, 'BULL_LAB_REVERSION_33', '{"rsiPeriod": 14, "ob": 72, "os": 28}'),
      ('Bull Lab VAPI 3H BTC Core', 'BTC/USDT', 'vapi_lazybear', 'hyperliquid_dex', 'paper', 'active', 3, 750, 2.5, 6.5, 1.5, '3h', 0, 0, 0, 'BULL_LAB_VAPI_3H', '{"indicator": "VAPI_LazyBear", "timeframe": "3h", "length": 10, "longEntry": 10, "longExit": -2, "shortEntry": -10, "shortExit": 2, "confirmation": 1, "extremeLevel": 45, "allocationPct": 25, "gateLevels": true, "qty": 0.05}')
      RETURNING id;
    `);

    const bot1 = botsResult.rows[0].id;
    const bot2 = botsResult.rows[1].id;

    console.log("Seeding trade orders...");
    await client.query(`
      INSERT INTO trade_orders (bot_id, pair, type, price, amount, total_usdt, status, pnl_usdt, pnl_pct, source, notes, platform)
      VALUES 
      ($1, 'BTC/USDT', 'BUY_LONG', 81200.00, 0.046, 3735.20, 'FILLED', 385.50, 10.32, 'WEBHOOK_TRADINGVIEW', 'TradingView Webhook BullLab_Matrix alert via Hyperliquid DEX API', 'hyperliquid_dex'),
      ($1, 'BTC/USDT', 'CLOSE_LONG', 83550.00, 0.046, 3843.30, 'FILLED', 235.00, 6.11, 'BOT_STRATEGY', 'Take Profit Target 1 hit (+2.89% move x 5x leverage)', 'hyperliquid_dex'),
      ($2, 'ETH/USDT', 'BUY_LONG', 2410.50, 0.62, 1494.51, 'FILLED', 164.20, 10.98, 'BOT_STRATEGY', 'EMA 9/21 cross confirmed above baseline 50', 'ourbit_nokyc'),
      ($2, 'ETH/USDT', 'SELL_SHORT', 2540.00, 0.58, 1473.20, 'FILLED', 98.40, 6.67, 'WEBHOOK_TRADINGVIEW', 'TradingView alert bear pullback trigger', 'ourbit_nokyc'),
      ($1, 'BTC/USDT', 'BUY_LONG', 83100.00, 0.045, 3739.50, 'OPEN', 94.50, 2.52, 'WEBHOOK_TRADINGVIEW', 'Open position with Trailing Stop active at $82,450', 'hyperliquid_dex');
    `, [bot1, bot2]);

    console.log("Seeding webhook logs...");
    await client.query(`
      INSERT INTO webhook_logs (ticker, action, price, raw_payload, status, source_ip)
      VALUES 
      ('BTCUSDT', 'BUY_LONG', 83100.00, '{"secret":"BULL_LAB_SEC_77","ticker":"BTCUSDT","action":"BUY_LONG","size":0.1,"strategy":"BullLab_Matrix"}', 'EXECUTED', '52.89.214.238'),
      ('ETHUSDT', 'SELL_SHORT', 2540.00, '{"secret":"BULL_LAB_ETH_88","ticker":"ETHUSDT","action":"SELL_SHORT","size":1.5,"strategy":"EMA_Pulse"}', 'EXECUTED', '52.89.214.239'),
      ('SOLUSDT', 'BUY_LONG', 192.50, '{"secret":"INVALID_KEY","ticker":"SOLUSDT"}', 'REJECTED_BAD_SECRET', '185.122.4.19');
    `);

    console.log("Database seeded successfully!");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
