import { pgTable, serial, text, integer, doublePrecision, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey(),
  btcUsd: doublePrecision("btc_usd").notNull().default(500),
  ethUsd: doublePrecision("eth_usd").notNull().default(500),
  mode: text("mode").notNull().default("paper"),
  killSwitch: boolean("kill_switch").notNull().default(false),
  rsiBtcUsd: doublePrecision("rsi_btc_usd").notNull().default(12),
  rsiEthUsd: doublePrecision("rsi_eth_usd").notNull().default(12),
  liveVapiBtc: boolean("live_vapi_btc").notNull().default(false),
  liveVapiEth: boolean("live_vapi_eth").notNull().default(false),
  liveRsiBtc: boolean("live_rsi_btc").notNull().default(false),
  liveRsiEth: boolean("live_rsi_eth").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rsiCycles = pgTable("rsi_cycles", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  status: text("status").notNull().default("open"),
  entries: integer("entries").notNull().default(0),
  exitStage: integer("exit_stage").notNull().default(0),
  units: doublePrecision("units").notNull().default(0),
  qty: doublePrecision("qty").notNull().default(0),
  cost: doublePrecision("cost").notNull().default(0),
  realizedPnl: doublePrecision("realized_pnl").notNull().default(0),
  lastEntryBar: text("last_entry_bar").notNull().default(""),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const rsiTrades = pgTable("rsi_trades", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  level: integer("level").notNull(),
  price: doublePrecision("price").notNull(),
  qty: doublePrecision("qty").notNull(),
  rsi: doublePrecision("rsi").notNull(),
  barTime: text("bar_time").notNull(),
  note: text("note").notNull(),
  pnl: doublePrecision("pnl").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  raw: text("raw").notNull(),
  status: text("status").notNull(), // accepted | rejected | ignored | executed | error
  reason: text("reason").notNull(),
});

export const cycles = pgTable("cycles", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  status: text("status").notNull().default("open"), // open | closed
  entries: integer("entries").notNull().default(0),
  exitStage: integer("exit_stage").notNull().default(0),
  qty: doublePrecision("qty").notNull().default(0),
  cost: doublePrecision("cost").notNull().default(0), // cost basis of remaining qty
  realizedPnl: doublePrecision("realized_pnl").notNull().default(0),
  lastBuyBars: jsonb("last_buy_bars").$type<Record<string, string>>().notNull().default({}),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  level: integer("level").notNull(),
  price: doublePrecision("price").notNull(),
  qty: doublePrecision("qty").notNull(),
  vapi: doublePrecision("vapi").notNull(),
  barTime: text("bar_time").notNull(),
  note: text("note").notNull(),
  pnl: doublePrecision("pnl").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
