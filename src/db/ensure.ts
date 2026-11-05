import { db } from "@/db";
import { sql } from "drizzle-orm";

let pending: Promise<void> | null = null;

// Idempotent schema bootstrap: rende ogni deploy su Vercel/Neon funzionante
// senza dover eseguire manualmente drizzle-kit push.
export function ensureSchema(): Promise<void> {
  pending ??= (async () => {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS webhook_logs (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      raw TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS cycles (
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      entries INTEGER NOT NULL DEFAULT 0,
      exit_stage INTEGER NOT NULL DEFAULT 0,
      qty DOUBLE PRECISION NOT NULL DEFAULT 0,
      cost DOUBLE PRECISION NOT NULL DEFAULT 0,
      realized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
      last_buy_bars JSONB NOT NULL DEFAULT '{}',
      opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at TIMESTAMPTZ
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      cycle_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      level INTEGER NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      qty DOUBLE PRECISION NOT NULL,
      vapi DOUBLE PRECISION NOT NULL,
      bar_time TEXT NOT NULL,
      note TEXT NOT NULL,
      pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  })();
  return pending;
}
