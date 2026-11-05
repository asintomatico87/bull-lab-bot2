import { NextResponse } from "next/server";
import { db } from "@/db";
import { tradingBots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const bots = await db.select().from(tradingBots).orderBy(desc(tradingBots.id));
    return NextResponse.json({ bots });
  } catch (error) {
    console.error("Failed to fetch bots:", error);
    return NextResponse.json({ error: "Failed to fetch bots" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      pair = "BTC/USDT",
      strategyKey = "bull_lab_confluence",
      platform = "hyperliquid_dex",
      mode = "paper",
      leverage = 3,
      orderSizeUsdt = 500,
      stopLossPct = 2.5,
      takeProfitPct = 6.0,
      trailingStopPct = 1.5,
      timeframe = "1h",
      config = {},
    } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Nome bot obbligatorio" }, { status: 400 });
    }

    const uniqueSecret = "BL_" + Math.random().toString(36).substring(2, 9).toUpperCase();

    const [newBot] = await db.insert(tradingBots).values({
      name: name.trim(),
      pair,
      strategyKey,
      platform,
      mode,
      status: "active",
      leverage: Number(leverage),
      orderSizeUsdt: String(orderSizeUsdt),
      stopLossPct: String(stopLossPct),
      takeProfitPct: String(takeProfitPct),
      trailingStopPct: String(trailingStopPct),
      timeframe,
      webhookSecret: uniqueSecret,
      config,
    }).returning();

    return NextResponse.json({ success: true, bot: newBot });
  } catch (error) {
    console.error("Failed to create bot:", error);
    return NextResponse.json({ error: "Failed to create bot" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      leverage,
      orderSizeUsdt,
      stopLossPct,
      takeProfitPct,
      trailingStopPct,
      mode,
      name,
      pair,
      platform,
      strategyKey,
      timeframe,
      config,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID bot mancante" }, { status: 400 });
    }

    const updateData: any = {
      lastRunAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (leverage !== undefined) updateData.leverage = Number(leverage);
    if (orderSizeUsdt !== undefined) updateData.orderSizeUsdt = String(orderSizeUsdt);
    if (stopLossPct !== undefined) updateData.stopLossPct = String(stopLossPct);
    if (takeProfitPct !== undefined) updateData.takeProfitPct = String(takeProfitPct);
    if (trailingStopPct !== undefined) updateData.trailingStopPct = String(trailingStopPct);
    if (mode !== undefined) updateData.mode = mode;
    if (name !== undefined) updateData.name = name;
    if (pair !== undefined) updateData.pair = pair;
    if (platform !== undefined) updateData.platform = platform;
    if (strategyKey !== undefined) updateData.strategyKey = strategyKey;
    if (timeframe !== undefined) updateData.timeframe = timeframe;
    if (config !== undefined && config !== null) updateData.config = config;

    const [updatedBot] = await db
      .update(tradingBots)
      .set(updateData)
      .where(eq(tradingBots.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, bot: updatedBot });
  } catch (error) {
    console.error("Failed to update bot:", error);
    return NextResponse.json({ error: "Failed to update bot" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID bot mancante" }, { status: 400 });
    }

    await db.delete(tradingBots).where(eq(tradingBots.id, Number(id)));
    return NextResponse.json({ success: true, message: "Bot eliminato con successo" });
  } catch (error) {
    console.error("Failed to delete bot:", error);
    return NextResponse.json({ error: "Failed to delete bot" }, { status: 500 });
  }
}
