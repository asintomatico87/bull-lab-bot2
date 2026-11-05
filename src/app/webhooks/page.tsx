import Link from "next/link";
import { EventsTable } from "@/components/EventsTable";
import { Simulator } from "@/components/Simulator";
import { Card } from "@/components/ui";
import { getEvents } from "@/lib/queries";
import { getMids } from "@/lib/prices";

export const dynamic = "force-dynamic";

const FILTERS = [
  { label: "Tutti", q: "" },
  { label: "TradingView", q: "?source=tradingview" },
  { label: "Eseguiti", q: "?status=executed" },
  { label: "Scartati", q: "?status=rejected" },
  { label: "Errori", q: "?status=error" },
  { label: "Simulatore", q: "?source=simulator" },
];

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; status?: string }>;
}) {
  const { source, status } = await searchParams;
  const [events, mids] = await Promise.all([getEvents(150, source, status), getMids()]);
  const active = `${source ? `?source=${source}` : status ? `?status=${status}` : ""}`;

  return (
    <>
      <Card title="Simulatore segnali (paper)">
        <Simulator prices={{ BTC: mids?.BTC ?? null, ETH: mids?.ETH ?? null }} />
      </Card>

      <Card
        title="Log webhook"
        right={
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <Link
                key={f.label}
                href={`/webhooks${f.q}`}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  active === f.q ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        }
      >
        <p className="mb-4 text-xs text-slate-500">
          Ogni richiesta arrivata a <code className="text-slate-300">/api/webhook/tradingview</code> viene registrata qui con il motivo
          esatto dell&apos;esito. Se qui non compare nulla da “tradingview”, TradingView non sta raggiungendo il bot.
        </p>
        <EventsTable events={events} />
      </Card>
    </>
  );
}
