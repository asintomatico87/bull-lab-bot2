import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const FALLBACK = Number(process.env.BASE_USD || 500);

export type Sizes = { BTC: number; ETH: number };

export async function getSizes(): Promise<Sizes> {
  await ensureSchema();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (!row) return { BTC: FALLBACK, ETH: FALLBACK };
  return { BTC: row.btcUsd, ETH: row.ethUsd };
}

export async function setSize(symbol: "BTC" | "ETH", usd: number): Promise<Sizes> {
  if (!Number.isFinite(usd) || usd < 10 || usd > 1_000_000) {
    throw new Error("La size deve essere un numero tra 10 e 1.000.000 USDT");
  }
  const rounded = Math.round(usd * 100) / 100;
  await ensureSchema();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (!row) {
    await db.insert(appSettings).values({
      id: 1,
      btcUsd: symbol === "BTC" ? rounded : FALLBACK,
      ethUsd: symbol === "ETH" ? rounded : FALLBACK,
    });
  } else {
    await db.update(appSettings).set({
      ...(symbol === "BTC" ? { btcUsd: rounded } : { ethUsd: rounded }),
      updatedAt: new Date(),
    }).where(eq(appSettings.id, 1));
  }
  return getSizes();
}
