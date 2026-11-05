import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getSettings, liveConfigured } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Health check usato dal monitoraggio e dalla verifica post-deploy.
 * Risponde 200 solo se il DB è raggiungibile e lo schema è stato applicato.
 */
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);

    let schema = false;
    let counts: Record<string, number> = {};
    try {
      const q = await db.execute<{ cycles: number; orders: number; events: number }>(sql`
        select
          (select count(*)::int from cycles) as cycles,
          (select count(*)::int from orders) as orders,
          (select count(*)::int from webhook_events) as events
      `);
      counts = q.rows[0] ?? {};
      schema = true;
    } catch {
      schema = false;
    }

    let mode: string | null = null;
    let secretOk = false;
    try {
      const s = await getSettings();
      mode = s.mode;
      secretOk = Boolean(s.effectiveSecret);
    } catch {
      // schema assente: getSettings non può leggere/scrivere le impostazioni
    }

    return Response.json({
      ok: true,
      db: true,
      schema,
      mode,
      secretConfigured: secretOk,
      adminProtected: Boolean(process.env.ADMIN_PASSWORD),
      liveConfigured: liveConfigured(),
      webhook: "/api/webhook/tradingview",
      counts,
      ms: Date.now() - started,
      time: new Date().toISOString(),
    });
  } catch {
    return Response.json({ ok: false, db: false, error: "database non raggiungibile" }, { status: 500 });
  }
}
