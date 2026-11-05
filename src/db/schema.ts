import { pgTable, serial, text, numeric, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const tradingBots = pgTable("trading_bots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pair: text("pair").notNull().default("BTC/USDT"),
  strategyKey: text("strategy_key").notNull().default("bull_lab_confluence"),
  platform: text("platform").notNull().default("hyperliquid_dex"),
  mode: text("mode").notNull().default("paper"), // paper | live
  status: text("status").notNull().default("active"), // active | paused | stopped
  leverage: integer("leverage").notNull().default(3),
  orderSizeUsdt: numeric("order_size_usdt").notNull().default("500"),
  stopLossPct: numeric("stop_loss_pct").notNull().default("2.5"),
  takeProfitPct: numeric("take_profit_pct").notNull().default("6.0"),
  trailingStopPct: numeric("trailing_stop_pct").notNull().default("1.5"),
  timeframe: text("timeframe").notNull().default("1h"),
  totalPnL: numeric("total_pnl").notNull().default("0"),
  winCount: integer("win_count").notNull().default(0),
  lossCount: integer("loss_count").notNull().default(0),
  config: jsonb("config").default({}),
  webhookSecret: text("webhook_secret").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastRunAt: timestamp("last_run_at").defaultNow().notNull(),
});

export const tradeOrders = pgTable("trade_orders", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id"),
  pair: text("pair").notNull(),
  type: text("type").notNull(), // BUY_LONG | SELL_SHORT | CLOSE_LONG | CLOSE_SHORT
  price: numeric("price").notNull(),
  amount: numeric("amount").notNull(),
  totalUsdt: numeric("total_usdt").notNull(),
  status: text("status").notNull().default("FILLED"), // FILLED | OPEN | CANCELLED
  pnlUsdt: numeric("pnl_usdt").default("0"),
  pnlPct: numeric("pnl_pct").default("0"),
  source: text("source").notNull().default("BOT_STRATEGY"), // WEBHOOK_TRADINGVIEW | BOT_STRATEGY | MANUAL_ORDER
  notes: text("notes"),
  platform: text("platform").notNull().default("paper_trading"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const customStrategies = pgTable("custom_strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  pair: text("pair").notNull().default("BTC/USDT"),
  indicators: jsonb("indicators").default([]),
  timeframe: text("timeframe").notNull().default("1h"),
  pineScript: text("pine_script"),
  backtestStats: jsonb("backtest_stats").default({}),
  isBullLabPreset: boolean("is_bull_lab_preset").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exchangeProfiles = pgTable("exchange_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  platformKey: text("platform_key").notNull(), // hyperliquid_dex | ourbit_nokyc | bitbase | bybit | binance | paper
  kycType: text("kyc_type").notNull().default("NO_KYC"), // NO_KYC | LOW_KYC | FULL_KYC | DECENTRALIZED
  apiKeyMasked: text("api_key_masked"),
  apiSecretMasked: text("api_secret_masked"),
  walletAddress: text("wallet_address"),
  isTestnet: boolean("is_testnet").default(true),
  balanceUsdt: numeric("balance_usdt").notNull().default("10000"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  action: text("action").notNull(),
  price: numeric("price"),
  rawPayload: text("raw_payload"),
  status: text("status").notNull().default("EXECUTED"), // EXECUTED | REJECTED_BAD_SECRET | ERROR
  sourceIp: text("source_ip"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
