import { NextResponse } from "next/server";
import { db } from "@/db";
import { tradingBots, tradeOrders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    // 1. Pause all active bots
    await db
      .update(tradingBots)
      .set({
        status: "paused",
        lastRunAt: new Date(),
      })
      .where(eq(tradingBots.status, "active"));

    // 2. Mark any open orders as CLOSED / CANCELLED
    await db
      .update(tradeOrders)
      .set({
        status: "CANCELLED",
        notes: "Emergency Kill-Switch triggered by Operator",
      })
      .where(eq(tradeOrders.status, "OPEN"));

    return NextResponse.json({
      success: true,
      message: "🚨 KILL-SWITCH ATTIVATO: Tutti i bot sono stati messi in pausa e le posizioni aperte sono state bloccate/chiuse.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Emergency stop failed:", error);
    return NextResponse.json({ error: "Failed to trigger emergency stop" }, { status: 500 });
  }
}
