import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { botSettings, symbolConfig, type BotSettings, type SymbolConfig } from "@/db/schema";
import { SUPPORTED_COINS } from "./strategy";

export type EffectiveSettings = BotSettings & {
  /** Secret realmente usato per autenticare i webhook. */
  effectiveSecret: string;
  secretFromEnv: boolean;
};

export function liveConfigured(): boolean {
  return Boolean(process.env.HL_PRIVATE_KEY?.trim());
}

export function hlNetwork(): "mainnet" | "testnet" {
  return process.env.HL_NETWORK?.trim().toLowerCase() === "testnet" ? "testnet" : "mainnet";
}

export async function getSettings(): Promise<EffectiveSettings> {
  let [row] = await db.select().from(botSettings).where(eq(botSettings.id, 1));
  if (!row) {
    await db
      .insert(botSettings)
      .values({ id: 1, webhookSecret: randomBytes(24).toString("hex") })
      .onConflictDoNothing();
    [row] = await db.select().from(botSettings).where(eq(botSettings.id, 1));
  }
  const envSecret = process.env.WEBHOOK_SECRET?.trim();
  return {
    ...row,
    effectiveSecret: envSecret || row.webhookSecret,
    secretFromEnv: Boolean(envSecret),
  };
}

export async function getSymbolConfigs(): Promise<SymbolConfig[]> {
  let rows = await db.select().from(symbolConfig);
  if (rows.length < SUPPORTED_COINS.length) {
    await db
      .insert(symbolConfig)
      .values(SUPPORTED_COINS.map((coin) => ({ coin, enabled: true, unitUsd: 500 })))
      .onConflictDoNothing();
    rows = await db.select().from(symbolConfig);
  }
  return rows.sort((a, b) => a.coin.localeCompare(b.coin));
}
