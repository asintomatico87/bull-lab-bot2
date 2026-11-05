import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db";

/**
 * Production readiness check for the Bull Lab dashboard.
 * Never returns secrets: only booleans and public URLs.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const configuredBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
  const baseUrl = configuredBase || `${proto}://${host}`;

  const isLocalhost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const isPreviewHost = host.endsWith(".e2b.app") || host.endsWith(".vercel.app") || isLocalhost;
  const hasDashboardAuth = Boolean(process.env.DASHBOARD_USER && process.env.DASHBOARD_PASSWORD);
  const hasDatabase = isDatabaseConfigured;
  const hasFixedBaseUrl = Boolean(configuredBase);

  return NextResponse.json({
    host,
    baseUrl,
    webhookUrl: `${baseUrl}/api/webhook/tradingview`,
    checks: [
      {
        id: "database",
        label: "Database PostgreSQL collegato",
        ok: hasDatabase,
        hint: "Imposta DATABASE_URL del database di produzione (Neon, Supabase o Postgres del VPS).",
      },
      {
        id: "domain",
        label: "Dominio personalizzato attivo",
        ok: !isPreviewHost,
        hint: "Aggiungi il dominio (es. bot.bulllab.one) nell'hosting e il record DNS. Gli URL *.e2b.app sono temporanei.",
      },
      {
        id: "base-url",
        label: "NEXT_PUBLIC_APP_URL impostata",
        ok: hasFixedBaseUrl,
        hint: "Serve per generare l'URL webhook corretto negli script e nei riepiloghi.",
      },
      {
        id: "dashboard-auth",
        label: "Password del cruscotto attiva",
        ok: hasDashboardAuth,
        hint: "Imposta DASHBOARD_USER e DASHBOARD_PASSWORD per proteggere bot e impostazioni.",
      },
      {
        id: "webhook",
        label: "Webhook pubblico raggiungibile in HTTPS",
        ok: !isLocalhost,
        hint: "TradingView può chiamare solo indirizzi pubblici HTTPS.",
      },
    ],
    readyForLiveTrading:
      hasDatabase && !isPreviewHost && hasFixedBaseUrl && hasDashboardAuth && !isLocalhost,
  });
}
