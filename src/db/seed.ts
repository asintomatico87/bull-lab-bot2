import { db } from "./index";
import { tradingBots, tradeOrders, customStrategies, exchangeProfiles, webhookLogs } from "./schema";
import { generateVapiPineScript } from "@/lib/vapi-pine";

export async function seedInitialData() {
  const existingBots = await db.select().from(tradingBots).limit(1);
  if (existingBots.length > 0) {
    return { message: "Already seeded" };
  }

  // 1. Exchange Profiles
  await db.insert(exchangeProfiles).values([
    {
      name: "Hyperliquid Perp L1 (DEX)",
      platformKey: "hyperliquid_dex",
      kycType: "DECENTRALIZED",
      apiKeyMasked: "0x7a3...c91d",
      walletAddress: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
      balanceUsdt: "12500.00",
      isTestnet: true,
      isActive: true,
    },
    {
      name: "OurBit Futures (No-KYC)",
      platformKey: "ourbit_nokyc",
      kycType: "NO_KYC",
      apiKeyMasked: "ourbit_ak_98124f...7a",
      balanceUsdt: "5400.00",
      isTestnet: true,
      isActive: true,
    },
    {
      name: "Bitbase Affiliate Pro",
      platformKey: "bitbase",
      kycType: "LOW_KYC",
      apiKeyMasked: "bitbase_live_3309...0b",
      balanceUsdt: "3200.00",
      isTestnet: true,
      isActive: true,
    },
    {
      name: "Bybit V5 Unified (CEX)",
      platformKey: "bybit",
      kycType: "FULL_KYC",
      apiKeyMasked: "byb_live_key_9182...44",
      balanceUsdt: "18400.00",
      isTestnet: true,
      isActive: true,
    },
    {
      name: "Paper Trading Simulator",
      platformKey: "paper_trading",
      kycType: "NO_KYC",
      apiKeyMasked: "PAPER_VIRTUAL_ACCOUNT",
      balanceUsdt: "25000.00",
      isTestnet: true,
      isActive: true,
    },
  ]);

  // 2. Custom Strategies with PineScript templates
  const pineScriptBullLab = `//@version=5
strategy("Bull Lab Confluence Matrix [TradingView]", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=20)

// Inputs
fastEMA = ta.ema(close, 21)
slowEMA = ta.ema(close, 200)
rsiVal = ta.rsi(close, 14)
[supertrend, direction] = ta.supertrend(3.0, 10)

// Confluence Logic
longCondition = ta.crossover(close, supertrend) and close > slowEMA and rsiVal > 45 and rsiVal < 68
shortCondition = ta.crossunder(close, supertrend) and close < slowEMA and rsiVal < 55 and rsiVal > 32

// Execute Strategy
if (longCondition)
    strategy.entry("BullLab_LONG", strategy.long)
    alert('{"secret":"BULL_LAB_SEC_77","ticker":"BTCUSDT","action":"BUY_LONG","size":0.1,"strategy":"BullLab_Matrix"}', alert.freq_once_per_bar_close)

if (shortCondition)
    strategy.entry("BullLab_SHORT", strategy.short)
    alert('{"secret":"BULL_LAB_SEC_77","ticker":"BTCUSDT","action":"SELL_SHORT","size":0.1,"strategy":"BullLab_Matrix"}', alert.freq_once_per_bar_close)

plot(fastEMA, "EMA 21", color=color.aqua, linewidth=2)
plot(slowEMA, "EMA 200", color=color.orange, linewidth=2)
plot(supertrend, "Supertrend", color=direction < 0 ? color.green : color.red, linewidth=2)
`;

  const pineScriptEMACross = `//@version=5
strategy("Bull Lab Dynamic EMA Cross 9/21/50", overlay=true, initial_capital=10000)

emaFast = ta.ema(close, 9)
emaMid = ta.ema(close, 21)
emaTrend = ta.ema(close, 50)

bullCross = ta.crossover(emaFast, emaMid) and close > emaTrend
bearCross = ta.crossunder(emaFast, emaMid) and close < emaTrend

if (bullCross)
    strategy.entry("EMA_LONG", strategy.long)
    alert('{"secret":"BULL_LAB_SEC_77","ticker":"ETHUSDT","action":"BUY_LONG","size":1.5,"strategy":"EMA_Pulse"}', alert.freq_once_per_bar_close)

if (bearCross)
    strategy.entry("EMA_SHORT", strategy.short)
    alert('{"secret":"BULL_LAB_SEC_77","ticker":"ETHUSDT","action":"SELL_SHORT","size":1.5,"strategy":"EMA_Pulse"}', alert.freq_once_per_bar_close)

plot(emaFast, "EMA 9", color=color.blue)
plot(emaMid, "EMA 21", color=color.orange)
plot(emaTrend, "EMA 50", color=color.purple)
`;

  await db.insert(customStrategies).values([
    {
      name: "Bull Lab Confluence Matrix (Asintomatico Formula)",
      description: "Strategia proprietaria con filtro trend EMA 200, Supertrend direction reversal, RSI momentum band e volume confirmation. Altissima affidabilità su timeframe 1h/4h.",
      pair: "BTC/USDT",
      timeframe: "1h",
      indicators: [
        { name: "Supertrend", params: { period: 10, multiplier: 3.0 } },
        { name: "EMA Filter", params: { period: 200 } },
        { name: "RSI Momentum", params: { length: 14, min: 45, max: 68 } },
        { name: "ATR Trailing Stop", params: { multiplier: 2.0 } },
      ],
      pineScript: pineScriptBullLab,
      backtestStats: {
        winRate: 68.4,
        profitFactor: 2.34,
        maxDrawdown: 6.8,
        totalTrades: 92,
        netProfitUsdt: 8420,
        netProfitPct: 84.2,
      },
      isBullLabPreset: true,
    },
    {
      name: "Dynamic EMA Golden Pulse (9/21/50)",
      description: "Strategia di trend following scalping veloce per Ethereum. Incrocio EMA 9/21 con filtro direzionale a 50 periodi.",
      pair: "ETH/USDT",
      timeframe: "15m",
      indicators: [
        { name: "EMA Fast", params: { period: 9 } },
        { name: "EMA Mid", params: { period: 21 } },
        { name: "EMA Baseline", params: { period: 50 } },
      ],
      pineScript: pineScriptEMACross,
      backtestStats: {
        winRate: 61.2,
        profitFactor: 1.88,
        maxDrawdown: 9.2,
        totalTrades: 148,
        netProfitUsdt: 5120,
        netProfitPct: 51.2,
      },
      isBullLabPreset: true,
    },
    {
      name: "Bollinger Bands Squeeze & Breakout",
      description: "Rileva la contrazione di volatilità (Squeeze) tra le Bande di Bollinger e spara ordini sui breakout con volumi in aumento.",
      pair: "BTC/USDT",
      timeframe: "4h",
      indicators: [
        { name: "Bollinger Bands", params: { length: 20, mult: 2.0 } },
        { name: "Bandwidth Squeeze Threshold", params: { value: 0.04 } },
        { name: "Volume SMA", params: { length: 20 } },
      ],
      pineScript: `//@version=5\nstrategy("Bull Lab Bollinger Squeeze", overlay=true)\n[mid, upper, lower] = ta.bb(close, 20, 2)\nbw = (upper - lower) / mid\n// alert setup...`,
      backtestStats: {
        winRate: 58.7,
        profitFactor: 1.74,
        maxDrawdown: 8.1,
        totalTrades: 63,
        netProfitUsdt: 4230,
        netProfitPct: 42.3,
      },
      isBullLabPreset: true,
    },
    {
      name: "RSI Divergence & Mean Reversion Scalper",
      description: "Identifica esaurimento trend con divergenze RSI su supporti/resistenze chiave per catturare rimbalzi rapidi.",
      pair: "ETH/USDT",
      timeframe: "1h",
      indicators: [
        { name: "RSI Divergence Engine", params: { length: 14, overbought: 72, oversold: 28 } },
        { name: "VWAP Anchor", params: { session: "Daily" } },
      ],
      pineScript: `//@version=5\nstrategy("Bull Lab RSI Mean Reversion", overlay=true)\n// alert setup...`,
      backtestStats: {
        winRate: 64.0,
        profitFactor: 1.95,
        maxDrawdown: 7.5,
        totalTrades: 86,
        netProfitUsdt: 3890,
        netProfitPct: 38.9,
      },
      isBullLabPreset: true,
    },
    {
      name: "Bull Lab VAPI 3H Pressure Matrix [LazyBear]",
      description:
        "Strategia principale a soglie sul Volume Accumulation Percentage di LazyBear. LONG sull'attraversamento della soglia di accumulazione, SHORT sulla distribuzione, uscite sui livelli di esaurimento con conferme e filtro estremo. Timeframe 3H.",
      pair: "BTC/USDT",
      timeframe: "3h",
      indicators: [
        { name: "VAPI (LazyBear)", params: { length: 10 } },
        { name: "LONG entry level", params: { value: 10 } },
        { name: "SHORT entry level", params: { value: -10 } },
        { name: "Confirmations", params: { bars: 1 } },
      ],
      pineScript: generateVapiPineScript({
        secret: "BULL_LAB_VAPI_3H",
        ticker: "BTCUSDT",
        length: 10,
        longEntry: 10,
        longExit: -2,
        shortEntry: -10,
        shortExit: 2,
        confirmation: 1,
        stopLossPct: 2.5,
        takeProfitPct: 6.5,
        trailingStopPct: 1.5,
        qty: 0.05,
        capital: 10000,
        leverage: 3,
      }),
      backtestStats: {
        winRate: 64.7,
        profitFactor: 2.12,
        maxDrawdown: 7.4,
        totalTrades: 34,
        netProfitUsdt: 6480,
        netProfitPct: 64.8,
        indicator: "VAPI_LazyBear",
      },
      isBullLabPreset: true,
    },
  ]);

  // 3. Trading Bots
  const insertedBots = await db.insert(tradingBots).values([
    {
      name: "Bull Lab BTC Alpha Trend",
      pair: "BTC/USDT",
      strategyKey: "bull_lab_confluence",
      platform: "hyperliquid_dex",
      mode: "paper",
      status: "active",
      leverage: 5,
      orderSizeUsdt: "750",
      stopLossPct: "2.5",
      takeProfitPct: "6.5",
      trailingStopPct: "1.5",
      timeframe: "1h",
      totalPnL: "1420.50",
      winCount: 14,
      lossCount: 4,
      webhookSecret: "BULL_LAB_SEC_77",
      config: { fastEma: 21, slowEma: 200, rsiMin: 45, rsiMax: 68 },
    },
    {
      name: "ETH Dynamic EMA Pulse",
      pair: "ETH/USDT",
      strategyKey: "ema_cross",
      platform: "ourbit_nokyc",
      mode: "paper",
      status: "active",
      leverage: 3,
      orderSizeUsdt: "500",
      stopLossPct: "2.0",
      takeProfitPct: "5.0",
      trailingStopPct: "1.2",
      timeframe: "15m",
      totalPnL: "890.20",
      winCount: 19,
      lossCount: 8,
      webhookSecret: "BULL_LAB_ETH_88",
      config: { fastEma: 9, midEma: 21, trendEma: 50 },
    },
    {
      name: "BTC Squeeze Breakout 4H",
      pair: "BTC/USDT",
      strategyKey: "bollinger_breakout",
      platform: "bitbase",
      mode: "paper",
      status: "paused",
      leverage: 2,
      orderSizeUsdt: "600",
      stopLossPct: "3.0",
      takeProfitPct: "7.0",
      trailingStopPct: "2.0",
      timeframe: "4h",
      totalPnL: "430.00",
      winCount: 7,
      lossCount: 3,
      webhookSecret: "BULL_LAB_SQUEEZE_99",
      config: { bbLength: 20, bbMult: 2.0 },
    },
    {
      name: "ETH RSI Mean Reversion",
      pair: "ETH/USDT",
      strategyKey: "rsi_mean_reversion",
      platform: "hyperliquid_dex",
      mode: "paper",
      status: "active",
      leverage: 3,
      orderSizeUsdt: "450",
      stopLossPct: "2.2",
      takeProfitPct: "4.8",
      trailingStopPct: "1.0",
      timeframe: "1h",
      totalPnL: "612.80",
      winCount: 11,
      lossCount: 5,
      webhookSecret: "BULL_LAB_REVERSION_33",
      config: { rsiPeriod: 14, ob: 72, os: 28 },
    },
    {
      name: "Bull Lab VAPI 3H BTC Core",
      pair: "BTC/USDT",
      strategyKey: "vapi_lazybear",
      platform: "hyperliquid_dex",
      mode: "paper",
      status: "active",
      leverage: 3,
      orderSizeUsdt: "750",
      stopLossPct: "2.5",
      takeProfitPct: "6.5",
      trailingStopPct: "1.5",
      timeframe: "3h",
      totalPnL: "0",
      winCount: 0,
      lossCount: 0,
      webhookSecret: "BULL_LAB_VAPI_3H",
      config: {
        indicator: "VAPI_LazyBear",
        timeframe: "3h",
        length: 10,
        longEntry: 10,
        longExit: -2,
        shortEntry: -10,
        shortExit: 2,
        confirmation: 1,
        extremeLevel: 45,
        allocationPct: 25,
        gateLevels: true,
        qty: 0.05,
      },
    },
  ]).returning();

  const bot1 = insertedBots[0]?.id ?? 1;
  const bot2 = insertedBots[1]?.id ?? 2;

  // 4. Trade Orders
  await db.insert(tradeOrders).values([
    {
      botId: bot1,
      pair: "BTC/USDT",
      type: "BUY_LONG",
      price: "81200.00",
      amount: "0.046",
      totalUsdt: "3735.20",
      status: "FILLED",
      pnlUsdt: "385.50",
      pnlPct: "10.32",
      source: "WEBHOOK_TRADINGVIEW",
      notes: "TradingView Webhook BullLab_Matrix alert executed via Hyperliquid DEX API",
      platform: "hyperliquid_dex",
    },
    {
      botId: bot1,
      pair: "BTC/USDT",
      type: "CLOSE_LONG",
      price: "83550.00",
      amount: "0.046",
      totalUsdt: "3843.30",
      status: "FILLED",
      pnlUsdt: "235.00",
      pnlPct: "6.11",
      source: "BOT_STRATEGY",
      notes: "Take Profit Target 1 reached (+2.89% price move x 5x leverage)",
      platform: "hyperliquid_dex",
    },
    {
      botId: bot2,
      pair: "ETH/USDT",
      type: "BUY_LONG",
      price: "2410.50",
      amount: "0.62",
      totalUsdt: "1494.51",
      status: "FILLED",
      pnlUsdt: "164.20",
      pnlPct: "10.98",
      source: "BOT_STRATEGY",
      notes: "EMA 9/21 bullish cross confirmed above EMA 50",
      platform: "ourbit_nokyc",
    },
    {
      botId: bot2,
      pair: "ETH/USDT",
      type: "SELL_SHORT",
      price: "2540.00",
      amount: "0.58",
      totalUsdt: "1473.20",
      status: "FILLED",
      pnlUsdt: "98.40",
      pnlPct: "6.67",
      source: "WEBHOOK_TRADINGVIEW",
      notes: "TradingView alert bear pullback trigger",
      platform: "ourbit_nokyc",
    },
    {
      botId: bot1,
      pair: "BTC/USDT",
      type: "BUY_LONG",
      price: "83100.00",
      amount: "0.045",
      totalUsdt: "3739.50",
      status: "OPEN",
      pnlUsdt: "94.50",
      pnlPct: "2.52",
      source: "WEBHOOK_TRADINGVIEW",
      notes: "Open position with Trailing Stop active at $82,450",
      platform: "hyperliquid_dex",
    },
  ]);

  // 5. Webhook Logs
  await db.insert(webhookLogs).values([
    {
      ticker: "BTCUSDT",
      action: "BUY_LONG",
      price: "83100.00",
      rawPayload: '{"secret":"BULL_LAB_SEC_77","ticker":"BTCUSDT","action":"BUY_LONG","size":0.1,"strategy":"BullLab_Matrix"}',
      status: "EXECUTED",
      sourceIp: "52.89.214.238",
    },
    {
      ticker: "ETHUSDT",
      action: "SELL_SHORT",
      price: "2540.00",
      rawPayload: '{"secret":"BULL_LAB_ETH_88","ticker":"ETHUSDT","action":"SELL_SHORT","size":1.5,"strategy":"EMA_Pulse"}',
      status: "EXECUTED",
      sourceIp: "52.89.214.239",
    },
    {
      ticker: "SOLUSDT",
      action: "BUY_LONG",
      price: "192.50",
      rawPayload: '{"secret":"INVALID_KEY","ticker":"SOLUSDT"}',
      status: "REJECTED_BAD_SECRET",
      sourceIp: "185.122.4.19",
    },
  ]);

  return { message: "Seeding complete" };
}
