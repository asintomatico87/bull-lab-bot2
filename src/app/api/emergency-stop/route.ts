import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tradingBots } from "@/db/schema";

export async function POST() {
  try {
    await db.update(tradingBots)
      .set({ status: "paused", lastRunAt: new Date() })
      .where(and(eq(tradingBots.strategyKey, "vapi_ladder"), eq(tradingBots.status, "active")));
    return NextResponse.json({
      success: true,
      message: "I due bot paper sono stati messi in pausa. Nessun ordine o posizione exchange è stato modificato.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Emergency pause failed:", error);
    return NextResponse.json({ error: "Impossibile mettere in pausa i bot paper." }, { status: 500 });
  }
}
