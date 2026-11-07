import { NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { webhookLogs } from "@/db/schema";
import { processRsiBar, type RsiSignal } from "@/lib/rsi-strategy";
import { WEBHOOK_SECRET } from "@/lib/secret";

export const dynamic = "force-dynamic";
const SECRET = WEBHOOK_SECRET;

async function log(raw: string, status: string, reason: string) {
  await db.insert(webhookLogs).values({ raw: raw.slice(0, 4000), status, reason });
}

export async function POST(req: Request) {
  await ensureSchema();
  const raw = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    await log(raw, "rejected", "RSI webhook: JSON non valido");
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (body.secret !== SECRET) {
    await log(raw, "rejected", "RSI webhook: secret errato");
    return NextResponse.json({ ok: false, error: "bad secret" }, { status: 401 });
  }
  const ev = String(body.event || "close");
  const sig: RsiSignal = {
    symbol: String(body.ticker ?? body.symbol ?? ""),
    event: ev === "touch" ? "touch" : "close",
    rsi: Number(body.rsi),
    price: Number(body.price),
    bar_time: String(body.bar_time || ""),
  };
  try {
    const out = await processRsiBar(sig, { forcePaper: body.paper === true });
    await log(raw, out.status, out.reason);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    await log(raw, "error", String(e));
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Webhook RSI 45m attivo." });
}
