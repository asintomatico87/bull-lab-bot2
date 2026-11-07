import { NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { webhookLogs } from "@/db/schema";
import { processSignal, type Signal } from "@/lib/strategy";
import { WEBHOOK_SECRET } from "@/lib/secret";

export const dynamic = "force-dynamic";
const SECRET = WEBHOOK_SECRET;

async function log(raw: string, status: string, reason: string) {
  await db.insert(webhookLogs).values({ raw: raw.slice(0, 4000), status, reason });
}

export async function POST(req: Request) {
  await ensureSchema();
  const raw = await req.text(); // TradingView invia text/plain: mai req.json()
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    await log(raw, "rejected", "Body non è JSON valido (placeholder non sostituiti o messaggio alert errato)");
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (body.secret !== SECRET) {
    await log(raw, "rejected", "Secret errato o mancante (in TV: input 'Webhook secret' dello script)");
    return NextResponse.json({ ok: false, error: "bad secret" }, { status: 401 });
  }
  const event = String(body.event || "");
  if (event !== "touch" && event !== "close") {
    await log(raw, "rejected", `event deve essere "touch" o "close", ricevuto "${event}"`);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const sig: Signal = {
    symbol: String(body.ticker ?? body.symbol ?? ""),
    event,
    vapi: Number(body.vapi),
    price: Number(body.price),
    bar_time: String(body.bar_time || ""),
  };
    try {
    const forcePaper = body.paper === true;
    const out = await processSignal(sig, { forcePaper });
    await log(raw, out.status, out.reason);
    return NextResponse.json({ ok: out.status !== "error", ...out }, { status: out.status === "error" ? 200 : 200 });
  } catch (e) {
    await log(raw, "error", String(e));
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Webhook attivo. Usa POST da TradingView." });
}
