import { NextResponse } from "next/server";
import { getRuntime, setKill, setMode, setRsiSize, setSize, setSystemLive, type SystemId } from "@/lib/settings";
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
    if (body?.action === "systemLive") {
      const system = String((body as { system?: string }).system) as SystemId;
      const allowed: SystemId[] = ["vapi-btc", "vapi-eth", "rsi-btc", "rsi-eth"];
      if (!allowed.includes(system)) return NextResponse.json({ ok: false, error: "sistema non valido" }, { status: 400 });
      const on = Boolean((body as { live?: boolean }).live);
      return NextResponse.json({ ok: true, runtime: await setSystemLive(system, on, body.confirm) });
    }
    const symbol = body?.symbol === "ETH" ? "ETH" : body?.symbol === "BTC" ? "BTC" : null;
    if (!symbol) return NextResponse.json({ ok: false, error: "Richiesta non valida" }, { status: 400 });
    if ((body as { book?: string })?.book === "rsi") {
      const sizes = await setRsiSize(symbol, Number(body?.usd));
      return NextResponse.json({ ok: true, sizes });
    }
    const sizes = await setSize(symbol, Number(body?.usd));
    return NextResponse.json({ ok: true, sizes });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e instanceof Error ? e.message : e) }, { status: 400 });
  }
}
