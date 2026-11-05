import { NextResponse } from "next/server";
import { db } from "@/db";
import { cycles, trades, webhookLogs } from "@/db/schema";

export async function POST() {
  await db.delete(trades);
  await db.delete(cycles);
  await db.delete(webhookLogs);
  return NextResponse.json({ ok: true });
}
