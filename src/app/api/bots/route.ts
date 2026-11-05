import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tradingBots } from "@/db/schema";

const ALLOWED_PAIRS = new Set(["BTC/USDT", "ETH/USDT"]);
const DEFAULT_LADDER_STATE = {
  buys: 0,
  sells: 0,
  lastBuyCandle: null,
  investedUsdt: 0,
  positionQty: 0,
  avgEntry: 0,
  feesPaidUsdt: 0,
};

function normalizePair(value: unknown): string | null {
  const pair = String(value ?? "").toUpperCase().replace(/\s/g, "");
  if (pair === "BTCUSDT" || pair === "BTC/USDT") return "BTC/USDT";
  if (pair === "ETHUSDT" || pair === "ETH/USDT") return "ETH/USDT";
  return null;
}

export async function GET() {
  try {
    // The live dashboard intentionally exposes only the two VAPI Ladder asset instances.
    const rows = await db
      .select()
      .from(tradingBots)
      .where(eq(tradingBots.strategyKey, "vapi_ladder"))
      .orderBy(desc(tradingBots.id));
    const latestByPair = new Map<string, (typeof rows)[number]>();
    for (const row of rows) if (ALLOWED_PAIRS.has(row.pair) && !latestByPair.has(row.pair)) latestByPair.set(row.pair, row);
    return NextResponse.json({ bots: [...latestByPair.values()] });
  } catch (error) {
    console.error("Failed to fetch ladder bots:", error);
    return NextResponse.json({ error: "Impossibile caricare i bot." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pair = normalizePair(body?.pair);
    if (!pair) return NextResponse.json({ error: "Sono ammessi solo BTC/USDT ed ETH/USDT." }, { status: 400 });
    if (body?.strategyKey && body.strategyKey !== "vapi_ladder") {
      return NextResponse.json({ error: "È disponibile solo la strategia VAPI Ladder 3H." }, { status: 400 });
    }

    const submittedConfig = body.config && typeof body.config === "object" ? body.config : {};
    const baseSizeUsdt = Number(submittedConfig.baseSizeUsdt ?? 500);
    const levels = [-25, -32, -40];
    const multipliers = [1, 1.5, 2.5];
    const plans = {
      "1": [{ level: 12, fractionPct: 100 }],
      "2": [{ level: 5, fractionPct: 50 }, { level: 15, fractionPct: 100 }],
      "3": [{ level: 0, fractionPct: 50 }, { level: 15, fractionPct: 50 }, { level: 22, fractionPct: 100 }],
    };
    if (!Number.isFinite(baseSizeUsdt) || baseSizeUsdt < 10 || baseSizeUsdt > 1_000_000_000) {
      return NextResponse.json({ error: "La size base deve essere un numero valido, almeno 10 USDT." }, { status: 400 });
    }
    const [existing] = await db.select().from(tradingBots)
      .where(and(eq(tradingBots.strategyKey, "vapi_ladder"), eq(tradingBots.pair, pair)))
      .orderBy(desc(tradingBots.id))
      .limit(1);

    const feePct = Number(submittedConfig.feePct ?? 0.035);
    const capital = Number(submittedConfig.capital ?? 10000);
    const vapiLength = Math.round(Number(submittedConfig.vapiLength ?? 10));
    if (!Number.isFinite(feePct) || feePct < 0 || feePct > 5 || !Number.isFinite(capital) || capital < 100 || !Number.isFinite(vapiLength) || vapiLength < 1 || vapiLength > 100) {
      return NextResponse.json({ error: "Fee, capitale o lunghezza VAPI fuori dai limiti ammessi." }, { status: 400 });
    }

    const config = {
      ...submittedConfig,
      indicator: "VAPI_LazyBear",
      strategy: "VAPI_LADDER_3H",
      timeframe: "3h",
      baseSizeUsdt,
      levels,
      multipliers,
      maxBuys: 3,
      plans: plans as Record<string, Array<{ level: number; fractionPct: number }>>,
      feePct,
      capital,
      vapiLength,
      mode: "paper",
      ladderState: existing?.config && typeof existing.config === "object"
        ? ((existing.config as Record<string, unknown>).ladderState ?? DEFAULT_LADDER_STATE)
        : DEFAULT_LADDER_STATE,
    };

    if (existing) {
      // Rotate legacy/short demo secrets on the first save; preserve only a full random v2 secret.
      const webhookSecret = /^BL_[a-f0-9]{48}$/.test(existing.webhookSecret)
        ? existing.webhookSecret
        : `BL_${randomBytes(24).toString("hex")}`;
      const [updated] = await db.update(tradingBots).set({
        name: `Bull Lab VAPI Ladder 3H ${pair.split("/")[0]}`,
        orderSizeUsdt: String(config.baseSizeUsdt),
        stopLossPct: "0",
        takeProfitPct: "22",
        trailingStopPct: "0",
        timeframe: "3h",
        platform: "paper_trading",
        mode: "paper",
        webhookSecret,
        config,
        lastRunAt: new Date(),
      }).where(eq(tradingBots.id, existing.id)).returning();
      return NextResponse.json({ success: true, bot: updated, updated: true });
    }

    const [bot] = await db.insert(tradingBots).values({
      name: `Bull Lab VAPI Ladder 3H ${pair.split("/")[0]}`,
      pair,
      strategyKey: "vapi_ladder",
      platform: "paper_trading",
      mode: "paper",
      status: "active",
      leverage: 1,
      orderSizeUsdt: String(config.baseSizeUsdt),
      stopLossPct: "0",
      takeProfitPct: "22",
      trailingStopPct: "0",
      timeframe: "3h",
      webhookSecret: `BL_${randomBytes(24).toString("hex")}`,
      config,
    }).returning();
    return NextResponse.json({ success: true, bot });
  } catch (error) {
    console.error("Failed to save VAPI Ladder bot:", error);
    return NextResponse.json({ error: "Errore durante il salvataggio del bot." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ID bot non valido." }, { status: 400 });
    const [bot] = await db.select().from(tradingBots)
      .where(and(eq(tradingBots.id, id), eq(tradingBots.strategyKey, "vapi_ladder")))
      .limit(1);
    if (!bot) return NextResponse.json({ error: "Bot VAPI Ladder non trovato." }, { status: 404 });

    const updates: Record<string, unknown> = { lastRunAt: new Date() };
    if (body.status !== undefined) {
      if (!['active', 'paused'].includes(String(body.status))) return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
      updates.status = body.status;
    }
    if (body.config && typeof body.config === "object") updates.config = body.config;
    if (body.orderSizeUsdt !== undefined) {
      const amount = Number(body.orderSizeUsdt);
      if (!Number.isFinite(amount) || amount < 10) return NextResponse.json({ error: "Base size minima: 10 USDT." }, { status: 400 });
      updates.orderSizeUsdt = String(amount);
    }
    const [updated] = await db.update(tradingBots).set(updates).where(eq(tradingBots.id, id)).returning();
    return NextResponse.json({ success: true, bot: updated });
  } catch (error) {
    console.error("Failed to update VAPI Ladder bot:", error);
    return NextResponse.json({ error: "Impossibile aggiornare il bot." }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ error: "I due bot BTC/ETH sono fissi; mettili in pausa invece di eliminarli." }, { status: 405 });
}
