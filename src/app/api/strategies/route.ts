import { NextResponse } from "next/server";
import { db } from "@/db";
import { customStrategies } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const strategies = await db
      .select()
      .from(customStrategies)
      .orderBy(desc(customStrategies.isBullLabPreset), desc(customStrategies.id));

    return NextResponse.json({ strategies });
  } catch (error) {
    console.error("Failed to fetch strategies:", error);
    return NextResponse.json({ error: "Failed to fetch strategies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      pair = "BTC/USDT",
      timeframe = "1h",
      indicators = [],
      pineScript = "",
      backtestStats = {},
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Nome strategia obbligatorio" }, { status: 400 });
    }

    const [newStrat] = await db
      .insert(customStrategies)
      .values({
        name,
        description,
        pair,
        timeframe,
        indicators,
        pineScript,
        backtestStats,
        isBullLabPreset: false,
      })
      .returning();

    return NextResponse.json({ success: true, strategy: newStrat });
  } catch (error) {
    console.error("Failed to save strategy:", error);
    return NextResponse.json({ error: "Failed to save strategy" }, { status: 500 });
  }
}
