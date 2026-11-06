import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hlConfigured, hlPublicAddress } from "@/lib/hyperliquid";

const FALLBACK = Number(process.env.BASE_USD || 500);

export type Sizes = { BTC: number; ETH: number };
export type LiveMap = { vapi: { BTC: boolean; ETH: boolean }; rsi: { BTC: boolean; ETH: boolean } };
export type SystemId = "vapi-btc" | "vapi-eth" | "rsi-btc" | "rsi-eth";
export type Runtime = {
  sizes: Sizes;
  rsiSizes: Sizes;
  mode: "paper" | "live";
  live: LiveMap;
  killSwitch: boolean;
  hlReady: boolean;
  hlTestnet: boolean;
  hlAddress: string | null;
};

async function row() {
  await ensureSchema();
  const [r] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (r) return r;
  await db.insert(appSettings).values({ id: 1, btcUsd: FALLBACK, ethUsd: FALLBACK });
  const [n] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  return n!;
}

export async function getSizes(): Promise<Sizes> {
  const r = await row();
  return { BTC: r.btcUsd, ETH: r.ethUsd };
}

export async function getRuntime(): Promise<Runtime> {
  const r = await row();
  const pub = hlPublicAddress();
  return {
    sizes: { BTC: r.btcUsd, ETH: r.ethUsd },
    rsiSizes: { BTC: r.rsiBtcUsd ?? 12, ETH: r.rsiEthUsd ?? 12 },
    mode: r.mode === "live" ? "live" : "paper",
    live: {
      vapi: { BTC: Boolean(r.liveVapiBtc), ETH: Boolean(r.liveVapiEth) },
      rsi: { BTC: Boolean(r.liveRsiBtc), ETH: Boolean(r.liveRsiEth) },
    },
    killSwitch: r.killSwitch,
    hlReady: hlConfigured(),
    hlTestnet: pub.testnet,
    hlAddress: pub.address,
  };
}

export async function getRsiSizes(): Promise<Sizes> {
  const r = await row();
  return { BTC: r.rsiBtcUsd ?? 12, ETH: r.rsiEthUsd ?? 12 };
}

export async function isLive(forcePaper?: boolean) {
  if (forcePaper) return false;
  const r = await getRuntime();
  return (r.live.vapi.BTC || r.live.vapi.ETH || r.live.rsi.BTC || r.live.rsi.ETH) && !r.killSwitch && r.hlReady;
}

export async function gateSystemLive(kind: "vapi" | "rsi", symbol: "BTC" | "ETH", forcePaper?: boolean) {
  if (forcePaper) return { live: false as const };
  const r = await getRuntime();
  if (r.killSwitch) return { live: false as const, block: "Kill switch attivo: nessun ordine inviato" };
  if (!r.live[kind][symbol]) return { live: false as const };
  if (!r.hlReady) return { live: false as const, block: `LIVE ${kind.toUpperCase()} ${symbol}: mancano le chiavi Hyperliquid su Vercel` };
  return { live: true as const };
}

const LIVE_COL: Record<SystemId, "liveVapiBtc" | "liveVapiEth" | "liveRsiBtc" | "liveRsiEth"> = {
  "vapi-btc": "liveVapiBtc",
  "vapi-eth": "liveVapiEth",
  "rsi-btc": "liveRsiBtc",
  "rsi-eth": "liveRsiEth",
};

export async function setSystemLive(system: SystemId, on: boolean, confirm?: string) {
  if (on) {
    if (confirm !== "LIVE") throw new Error("Per attivare il LIVE scrivi LIVE nel campo di conferma");
    if (!hlConfigured()) throw new Error("Prima configura HL_AGENT_PRIVATE_KEY e HL_ACCOUNT_ADDRESS su Vercel");
  }
  await row();
  await db.update(appSettings).set({ [LIVE_COL[system]]: on, updatedAt: new Date() }).where(eq(appSettings.id, 1));
  return getRuntime();
}

export async function setSize(symbol: "BTC" | "ETH", usd: number): Promise<Sizes> {
  if (!Number.isFinite(usd) || usd < 10 || usd > 1_000_000) {
    throw new Error("La size deve essere un numero tra 10 e 1.000.000 USDT");
  }
  const rounded = Math.round(usd * 100) / 100;
  await row();
  await db.update(appSettings).set({
    ...(symbol === "BTC" ? { btcUsd: rounded } : { ethUsd: rounded }),
    updatedAt: new Date(),
  }).where(eq(appSettings.id, 1));
  return getSizes();
}

export async function setRsiSize(symbol: "BTC" | "ETH", usd: number): Promise<Sizes> {
  if (!Number.isFinite(usd) || usd < 1 || usd > 1_000_000) {
    throw new Error("La size RSI deve essere un numero tra 1 e 1.000.000 USDT");
  }
  const rounded = Math.round(usd * 100) / 100;
  await row();
  await db.update(appSettings).set({
    ...(symbol === "BTC" ? { rsiBtcUsd: rounded } : { rsiEthUsd: rounded }),
    updatedAt: new Date(),
  }).where(eq(appSettings.id, 1));
  return getRsiSizes();
}

export async function setMode(mode: "paper" | "live", confirm?: string) {
  if (mode === "live") {
    if (confirm !== "LIVE") throw new Error("Per attivare il LIVE scrivi LIVE nel campo di conferma");
    if (!hlConfigured()) throw new Error("Prima configura HL_AGENT_PRIVATE_KEY e HL_ACCOUNT_ADDRESS su Vercel");
  }
  await row();
  await db.update(appSettings).set({ mode, updatedAt: new Date() }).where(eq(appSettings.id, 1));
  return getRuntime();
}

export async function setKill(on: boolean) {
  await row();
  await db.update(appSettings).set({ killSwitch: on, updatedAt: new Date() }).where(eq(appSettings.id, 1));
  return getRuntime();
}
