import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Prezzi pubblici di Hyperliquid (mainnet): nessuna chiave necessaria.
export async function GET() {
  try {
    const r = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allMids" }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const mids = (await r.json()) as Record<string, string>;
    const btc = Number(mids.BTC);
    const eth = Number(mids.ETH);
    if (!Number.isFinite(btc) || !Number.isFinite(eth)) throw new Error("prezzi non disponibili");
    return NextResponse.json({ ok: true, BTC: btc, ETH: eth, ts: Date.now() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e instanceof Error ? e.message : e) }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
