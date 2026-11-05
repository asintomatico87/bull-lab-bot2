import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Impostazioni globali (una sola riga, id = 1). */
export const botSettings = pgTable("bot_settings", {
  id: integer("id").primaryKey().default(1),
  /** 'paper' | 'live' */
  mode: text("mode").notNull().default("paper"),
  /** true = nessun NUOVO acquisto (le vendite restano attive). */
  killSwitch: boolean("kill_switch").notNull().default(false),
  /** Secret generato al primo avvio (sovrascritto da env WEBHOOK_SECRET se presente). */
  webhookSecret: text("webhook_secret").notNull(),
  /** Consente nuovi BUY dopo che il ciclo ha già venduto una parte. */
  allowBuyAfterPartial: boolean("allow_buy_after_partial").notNull().default(false),
  /** Consente più scaglioni di uscita nella stessa chiusura 3H. */
  multiStagePerBar: boolean("multi_stage_per_bar").notNull().default(false),
  /** Accetta i SELL solo in prossimità della chiusura di una candela 3H. */
  enforceCloseWindow: boolean("enforce_close_window").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Configurazione per simbolo (BTC, ETH). */
export const symbolConfig = pgTable("symbol_config", {
  coin: text("coin").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  /** Dollari corrispondenti a 1× di size. */
  unitUsd: doublePrecision("unit_usd").notNull().default(500),
});

/** Ogni richiesta arrivata al webhook, con esito e motivo. */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: serial("id").primaryKey(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    /** 'tradingview' | 'simulator' */
    source: text("source").notNull().default("tradingview"),
    ip: text("ip"),
    contentType: text("content_type"),
    userAgent: text("user_agent"),
    rawBody: text("raw_body"),
    parsed: jsonb("parsed"),
    /** 'executed' | 'ignored' | 'rejected' | 'error' */
    status: text("status").notNull(),
    code: text("code").notNull(),
    message: text("message").notNull(),
    coin: text("coin"),
    action: text("action"),
    tier: integer("tier"),
    detail: jsonb("detail"),
    durationMs: integer("duration_ms"),
  },
  (t) => [index("webhook_events_received_idx").on(t.receivedAt)],
);

/** Un ciclo = da primo BUY fino alla chiusura completa della posizione. */
export const cycles = pgTable(
  "cycles",
  {
    id: serial("id").primaryKey(),
    coin: text("coin").notNull(),
    /** 'open' | 'closed' */
    status: text("status").notNull().default("open"),
    mode: text("mode").notNull().default("paper"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    buyCount: integer("buy_count").notNull().default(0),
    filledTiers: integer("filled_tiers").array().notNull().default(sql`'{}'::integer[]`),
    avgEntry: doublePrecision("avg_entry").notNull().default(0),
    /** Quantità residua (in coin). */
    qty: doublePrecision("qty").notNull().default(0),
    totalCostUsd: doublePrecision("total_cost_usd").notNull().default(0),
    proceedsUsd: doublePrecision("proceeds_usd").notNull().default(0),
    realizedPnlUsd: doublePrecision("realized_pnl_usd").notNull().default(0),
    /** Numero di scaglioni di uscita già eseguiti. */
    exitStage: integer("exit_stage").notNull().default(0),
    closeReason: text("close_reason"),
  },
  (t) => [
    uniqueIndex("one_open_cycle_per_coin")
      .on(t.coin)
      .where(sql`${t.status} = 'open'`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    cycleId: integer("cycle_id").notNull(),
    coin: text("coin").notNull(),
    /** 'BUY' | 'SELL' */
    side: text("side").notNull(),
    tier: integer("tier"),
    exitStage: integer("exit_stage"),
    reason: text("reason").notNull(),
    mode: text("mode").notNull(),
    price: doublePrecision("price").notNull(),
    qty: doublePrecision("qty").notNull(),
    notionalUsd: doublePrecision("notional_usd").notNull(),
    pnlUsd: doublePrecision("pnl_usd"),
    pnlPct: doublePrecision("pnl_pct"),
    barTime: timestamp("bar_time", { withTimezone: true }),
    exchange: jsonb("exchange"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_created_idx").on(t.createdAt)],
);

/** Anti-duplicati: una sola azione per (coin, tipo, candela). */
export const barActions = pgTable(
  "bar_actions",
  {
    id: serial("id").primaryKey(),
    coin: text("coin").notNull(),
    /** 'BUY:1' | 'BUY:2' | 'BUY:3' | 'EXIT' */
    kind: text("kind").notNull(),
    barTime: timestamp("bar_time", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("bar_actions_unique").on(t.coin, t.kind, t.barTime)],
);

export type BotSettings = typeof botSettings.$inferSelect;
export type SymbolConfig = typeof symbolConfig.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type Cycle = typeof cycles.$inferSelect;
export type Order = typeof orders.$inferSelect;
