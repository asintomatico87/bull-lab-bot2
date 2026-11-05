import { hlNetwork } from "./settings";

const cache: { at: number; mids: Record<string, number> | null } = { at: 0, mids: null };

/** Prezzi mid pubblici di Hyperliquid (nessuna chiave richiesta). Null se non raggiungibile. */
export async function getMids(maxAgeMs = 5000): Promise<Record<string, number> | null> {
  if (cache.mids && Date.now() - cache.at < maxAgeMs) return cache.mids;
  const url =
    hlNetwork() === "testnet"
      ? "https://api.hyperliquid-testnet.xyz/info"
      : "https://api.hyperliquid.xyz/info";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "allMids" }),
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return cache.mids;
    const raw = (await res.json()) as Record<string, string>;
    const mids: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      const n = Number(v);
      if (Number.isFinite(n)) mids[k] = n;
    }
    cache.at = Date.now();
    cache.mids = mids;
    return mids;
  } catch {
    return cache.mids;
  }
}

export async function getMid(coin: string): Promise<number | null> {
  const mids = await getMids();
  return mids?.[coin] ?? null;
}
