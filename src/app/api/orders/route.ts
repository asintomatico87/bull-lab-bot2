import { NextResponse } from "next/server";
import { db } from "@/db";
import { tradeOrders, tradingBots } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const orders = await db
      .select()
      .from(tradeOrders)
      .orderBy(desc(tradeOrders.timestamp))
      .limit(limit);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      botId = null,
      pair = "BTC/USDT",
      type = "BUY_LONG",
      price,
      amount,
      totalUsdt,
      platform = "paper_trading",
      notes = "Manuale / Trigger Simulata",
    } = body;

    if (!price || !amount) {
      return NextResponse.json({ error: "Prezzo e quantita sono obbligatori" }, { status: 400 });
    }

    const calculatedTotal = totalUsdt || (Number(price) * Number(amount)).toFixed(2);
    
    // Simulate estimated PnL for CLOSE orders
    let pnlUsdt = "0";
    let pnlPct = "0";
    if (type.startsWith("CLOSE")) {
      const simulatedPnl = Math.round((Math.random() * 80 - 15) * 100) / 100;
      pnlUsdt = String(simulatedPnl);
      pnlPct = (simulatedPnl / Number(calculatedTotal) * 100).toFixed(2);
    }

    const [order] = await db
      .insert(tradeOrders)
      .values({
        botId: botId ? Number(botId) : null,
        pair,
        type,
        price: String(price),
        amount: String(amount),
        totalUsdt: String(calculatedTotal),
        status: "FILLED",
        pnlUsdt,
        pnlPct,
        source: "MANUAL_ORDER",
        notes,
        platform,
      })
      .returning();

    // If attached to a bot, update bot stats
    if (botId) {
      const isWin = Number(pnlUsdt) > 0;
      const bot = await db.select().from(tradingBots).where(eq(tradingBots.id, Number(botId))).limit(1);
      if (bot.length > 0) {
        const curBot = bot[0];
        const newTotalPnL = (Number(curBot.totalPnL) + Number(pnlUsdt)).toFixed(2);
        const winCount = isWin ? curBot.winCount + 1 : curBot.winCount;
        const lossCount = !isWin && Number(pnlUsdt) < 0 ? curBot.lossCount + 1 : curBot.lossCount;

        await db
          .update(tradingBots)
          .set({
            totalPnL: newTotalPnL,
            winCount,
            lossCount,
            lastRunAt: new Date(),
          })
          .where(eq(tradingBots.id, Number(botId)));
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Failed to execute order:", error);
    return NextResponse.json({ error: "Failed to execute order" }, { status: 500 });
  }
}
