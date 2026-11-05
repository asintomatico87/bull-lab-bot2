import { NextRequest } from "next/server";
import { handleSignal } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Webhook TradingView → Bull Lab.
 * TradingView: solo porta 80/443, nessun redirect seguito, timeout 3s, POST con
 * Content-Type application/json (se il messaggio è JSON valido) oppure text/plain.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const fwd = req.headers.get("x-forwarded-for");
  const result = await handleSignal({
    source: req.headers.get("x-bulllab-selftest") ? "selftest" : "tradingview",
    rawBody,
    query: req.nextUrl.searchParams,
    ip: fwd?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip"),
    contentType: req.headers.get("content-type"),
    userAgent: req.headers.get("user-agent"),
    headerSecret: req.headers.get("x-webhook-secret"),
  });

  return Response.json(
    { ok: result.ok, status: result.status, code: result.code, message: result.message },
    { status: result.httpStatus },
  );
}

/** Apri questo URL nel browser per verificare che il dominio risponda senza redirect/401. */
export async function GET() {
  return Response.json({
    ok: true,
    service: "Bull Lab Trading System — webhook TradingView",
    method: "POST",
    hint: "L'endpoint è raggiungibile. TradingView deve inviare un POST con il JSON dell'alert (vedi /setup).",
    time: new Date().toISOString(),
  });
}
