import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cycles, orders, webhookEvents, type Cycle, type Order, type WebhookEvent } from "@/db/schema";
import { getMids } from "./prices";
import { getSettings, getSymbolConfigs, liveConfigured } from "./settings";
import { pnlPct, upcomingExit, type ExitStep } from "./strategy";

export type Insight = { level: "ok" | "warn" | "error"; title: string; text: string };

export type CycleView = Cycle & {
  markPrice: number | null;
  unrealizedPct: number | null;
  unrealizedUsd: number | null;
  next: ExitStep | null;
};

export async function getDashboardData() {
  const [settings, symbols, mids] = await Promise.all([getSettings(), getSymbolConfigs(), getMids()]);

  const openCycles = await db.select().from(cycles).where(eq(cycles.status, "open"));
  const openView: CycleView[] = openCycles.map((c) => {
    const mark = mids?.[c.coin] ?? null;
    return {
      ...c,
      markPrice: mark,
      unrealizedPct: mark ? pnlPct(mark, c.avgEntry) : null,
      unrealizedUsd: mark ? (mark - c.avgEntry) * c.qty : null,
      next: upcomingExit(c.buyCount, c.exitStage),
    };
  });

  const recentOrders: Order[] = await db.select().from(orders).orderBy(desc(orders.id)).limit(12);
  const recentEvents: WebhookEvent[] = await db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.id))
    .limit(10);

  const [stats] = await db
    .select({
      closed: sql<number>`count(*) filter (where ${cycles.status} = 'closed')::int`,
      wins: sql<number>`count(*) filter (where ${cycles.status} = 'closed' and ${cycles.realizedPnlUsd} > 0)::int`,
      realized: sql<number>`coalesce(sum(${cycles.realizedPnlUsd}), 0)::float`,
      invested: sql<number>`coalesce(sum(${cycles.totalCostUsd}), 0)::float`,
    })
    .from(cycles);

  // Ultimo VAPI ricevuto per simbolo (dai payload degli alert)
  const vapiRows = await db
    .select({
      coin: webhookEvents.coin,
      vapi: sql<number | null>`nullif(${webhookEvents.parsed}->>'vapi', '')::float`,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .where(
      sql`${webhookEvents.coin} is not null
          and ${webhookEvents.parsed}->>'vapi' is not null
          and ${webhookEvents.parsed}->>'vapi' <> ''`,
    )
    .orderBy(desc(webhookEvents.id))
    .limit(40);
  const latestVapi: Record<string, number> = {};
  for (const r of vapiRows) {
    if (r.coin && r.vapi !== null && Number.isFinite(r.vapi) && !(r.coin in latestVapi)) latestVapi[r.coin] = r.vapi;
  }

  const diag = await getDiagnosis();

  return { settings, symbols, mids, openView, recentOrders, recentEvents, stats, diag, latestVapi };
}

export async function getDiagnosis() {
  const settings = await getSettings();
  const since = new Date(Date.now() - 24 * 3600_000);

  const [tvTotal] = await db
    .select({ n: count() })
    .from(webhookEvents)
    .where(eq(webhookEvents.source, "tradingview"));
  const [lastTv] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.source, "tradingview"))
    .orderBy(desc(webhookEvents.id))
    .limit(1);
  const [lastExecuted] = await db
    .select()
    .from(webhookEvents)
    .where(and(eq(webhookEvents.status, "executed"), eq(webhookEvents.source, "tradingview")))
    .orderBy(desc(webhookEvents.id))
    .limit(1);
  const byStatus = await db
    .select({ status: webhookEvents.status, n: count() })
    .from(webhookEvents)
    .where(and(eq(webhookEvents.source, "tradingview"), gte(webhookEvents.receivedAt, since)))
    .groupBy(webhookEvents.status);
  const topCodes = await db
    .select({ code: webhookEvents.code, n: count() })
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.source, "tradingview"),
        gte(webhookEvents.receivedAt, since),
        sql`${webhookEvents.status} in ('rejected','error')`,
      ),
    )
    .groupBy(webhookEvents.code)
    .orderBy(desc(count()))
    .limit(3);

  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>;
  const insights: Insight[] = [];

  if (tvTotal.n === 0) {
    insights.push({
      level: "error",
      title: "Nessun webhook di TradingView è MAI arrivato al bot",
      text: "Il problema è a monte del bot: l'alert non parte, oppure l'URL è sbagliato/redirect/protetto. Vai su Setup → “Test connessione” e segui la checklist (piano TradingView con webhook, 2FA attiva, URL finale senza redirect, Deployment Protection di Vercel disattivata).",
    });
  } else if (lastTv) {
    const ageH = (Date.now() - new Date(lastTv.receivedAt).getTime()) / 3600_000;
    if (ageH > 7) {
      insights.push({
        level: "warn",
        title: `Ultimo webhook TradingView ricevuto ${Math.floor(ageH)} ore fa`,
        text: "Con alert BAR_CLOSE sul 3H dovresti ricevere un evento ogni 3 ore per simbolo. Controlla che l'alert sia attivo (non scaduto / non 'Solo una volta') nel registro alert di TradingView.",
      });
    }
    if (lastTv.status === "rejected" || lastTv.status === "error") {
      insights.push({
        level: "error",
        title: `L'ultimo webhook è stato scartato: ${lastTv.code}`,
        text: lastTv.message,
      });
    }
  }

  if ((counts.rejected ?? 0) + (counts.error ?? 0) > 0 && topCodes.length) {
    insights.push({
      level: "warn",
      title: "Motivi di scarto nelle ultime 24h",
      text: topCodes.map((c) => `${c.code} ×${c.n}`).join(" · "),
    });
  }

  if (tvTotal.n > 0 && !lastExecuted) {
    insights.push({
      level: "warn",
      title: "I webhook arrivano ma nessuno ha ancora eseguito un ordine",
      text: "Controlla il motivo (colonna 'Codice') nel Log webhook: es. TIER_ALREADY_FILLED, TARGET_NOT_REACHED, NOT_AT_BAR_CLOSE, KILL_SWITCH, VAPI_ABOVE_LEVEL.",
    });
  }
  if (settings.killSwitch) {
    insights.push({
      level: "warn",
      title: "Kill-switch attivo",
      text: "I nuovi acquisti sono sospesi (le vendite restano attive).",
    });
  }
  if (settings.mode === "live" && !liveConfigured()) {
    insights.push({
      level: "error",
      title: "Modalità LIVE senza chiave Hyperliquid",
      text: "Imposta HL_PRIVATE_KEY (API wallet) nelle variabili d'ambiente, altrimenti ogni ordine fallisce.",
    });
  }
  if (!insights.length) {
    insights.push({
      level: "ok",
      title: "Nessuna anomalia rilevata",
      text: "I webhook arrivano e vengono elaborati regolarmente.",
    });
  }

  return { insights, counts, tvTotal: tvTotal.n, lastTv: lastTv ?? null, lastExecuted: lastExecuted ?? null };
}

export async function getEvents(limit = 100, source?: string, status?: string) {
  const conds = [];
  if (source) conds.push(eq(webhookEvents.source, source));
  if (status) conds.push(eq(webhookEvents.status, status));
  return db
    .select()
    .from(webhookEvents)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(webhookEvents.id))
    .limit(limit);
}

export async function getHistory() {
  const allCycles = await db.select().from(cycles).orderBy(desc(cycles.id)).limit(50);
  const allOrders = await db.select().from(orders).orderBy(desc(orders.id)).limit(200);
  return { allCycles, allOrders };
}
