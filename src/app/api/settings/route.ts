import { NextResponse } from "next/server";
import { getRuntime, setKill, setMode, setSize } from "@/lib/settings";
import { hlOverview } from "@/lib/hyperliquid";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = await getRuntime();
  const hl = runtime.hlAddress ? await hlOverview() : null;
  return NextResponse.json({ ok: true, runtime, hl });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as {
    action?: string; symbol?: string; usd?: number; mode?: string; confirm?: string; kill?: boolean;
  } | null;
  try {
    if (body?.action === "mode") {
      const mode = body.mode === "live" ? "live" : "paper";
      return NextResponse.json({ ok: true, runtime: await setMode(mode, body.confirm) });
    }
    if (body?.action === "kill") {
      return NextResponse.json({ ok: true, runtime: await setKill(Boolean(body.kill)) });
    }
    const symbol = body?.symbol === "ETH" ? "ETH" : body?.symbol === "BTC" ? "BTC" : null;
    if (!symbol) return NextResponse.json({ ok: false, error: "Richiesta non valida" }, { status: 400 });
    const sizes = await setSize(symbol, Number(body?.usd));
    return NextResponse.json({ ok: true, sizes });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e instanceof Error ? e.message : e) }, { status: 400 });
  }
}
