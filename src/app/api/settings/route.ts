import { NextResponse } from "next/server";
import { getSizes, setSize } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, sizes: await getSizes() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { symbol?: string; usd?: number } | null;
  const symbol = body?.symbol === "ETH" ? "ETH" : body?.symbol === "BTC" ? "BTC" : null;
  if (!symbol) return NextResponse.json({ ok: false, error: "symbol deve essere BTC o ETH" }, { status: 400 });
  try {
    const sizes = await setSize(symbol, Number(body?.usd));
    return NextResponse.json({ ok: true, sizes });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e instanceof Error ? e.message : e) }, { status: 400 });
  }
}
