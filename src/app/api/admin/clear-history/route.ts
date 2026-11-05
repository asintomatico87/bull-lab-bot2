import { NextResponse } from "next/server";
import { db, pool } from "@/db";
import { tradingBots, exchangeProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isDemoCashier } from "@/lib/demo-data";

/**
 * Cancella ordini e log del webhook e azzera le scale.
 * NON elimina i bot né cambia le secret.
 *
 * POST /api/admin/clear-history  { "confirm": "CLEAR" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== "CLEAR") {
      return NextResponse.json(
        { error: 'Serve conferma: { "confirm": "CLEAR" }' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    let orders = 0;
    let logs = 0;
    try {
      const o = await client.query("DELETE FROM trade_orders");
      orders = o.rowCount ?? 0;
      const l = await client.query("DELETE FROM webhook_logs");
      logs = l.rowCount ?? 0;
    } finally {
      client.release();
    }

    const bots = await db.select().from(tradingBots);
    const emptyLadder = {
      buys: 0,
      sells: 0,
      lastBuyCandle: null,
      lastSellEvalCandle: null,
      investedUsdt: 0,
      avgEntry: 0,
      positionQty: 0,
    };

    for (const bot of bots) {
      const cfg = { ...((bot.config ?? {}) as Record<string, unknown>), ladderState: emptyLadder };
      await db.update(tradingBots).set({ config: cfg, totalPnL: "0", winCount: 0, lossCount: 0 }).where(eq(tradingBots.id, bot.id));
    }

    const cashiers = await db.select().from(exchangeProfiles);
    let demoCashiers = 0;
    for (const p of cashiers) {
      if (isDemoCashier(p)) {
        await db.delete(exchangeProfiles).where(eq(exchangeProfiles.id, p.id));
        demoCashiers += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Storico cancellato, scale azzerate, cassieri demo rimossi. Bot e secret invariati.",
      removed: { orders, logs, demoCashiers },
      botsReset: bots.length,
    });
  } catch (error) {
    console.error("clear-history error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
