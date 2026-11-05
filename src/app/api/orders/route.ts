import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tradeOrders } from "@/db/schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requested = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(requested) ? requested : 50));
    const orders = await db.select().from(tradeOrders)
      .where(eq(tradeOrders.source, "PAPER_TRADINGVIEW"))
      .orderBy(desc(tradeOrders.timestamp))
      .limit(limit);
    return NextResponse.json({ orders, mode: "paper", message: "Nessun ordine reale è stato inviato a un exchange." });
  } catch (error) {
    console.error("Failed to fetch paper orders:", error);
    return NextResponse.json({ error: "Impossibile caricare il log paper." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Gli ordini manuali sono disabilitati in questa fase. Usa i segnali TradingView in modalità paper." }, { status: 405 });
}
