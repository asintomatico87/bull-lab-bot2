import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { webhookLogs } from "@/db/schema";

// Protected by the dashboard Basic Auth (the public exception is only /api/webhook/tradingview).
export async function GET() {
  try {
    const rows = await db.select({
      id: webhookLogs.id,
      eventId: webhookLogs.eventId,
      ticker: webhookLogs.ticker,
      action: webhookLogs.action,
      price: webhookLogs.price,
      status: webhookLogs.status,
      timestamp: webhookLogs.timestamp,
    }).from(webhookLogs).orderBy(desc(webhookLogs.id)).limit(50);
    return NextResponse.json({ logs: rows });
  } catch (error) {
    console.error("Failed to fetch webhook logs:", error);
    return NextResponse.json({ error: "Impossibile caricare i log webhook." }, { status: 500 });
  }
}
