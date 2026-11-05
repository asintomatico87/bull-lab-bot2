import Link from "next/link";
import { CloseCycleButton } from "@/components/CloseCycleButton";
import { EventsTable } from "@/components/EventsTable";
import { Card, Insights, SectionLabel, Stat } from "@/components/ui";
import { VapiGauge } from "@/components/VapiGauge";
import { fmtDate, fmtNum, fmtPct, fmtQty, fmtUsd, pnlColor, timeAgo } from "@/lib/format";
import { getDashboardData, type CycleView } from "@/lib/queries";
import { BUY_TIERS, EXIT_PLANS, SUPPORTED_COINS } from "@/lib/strategy";

export const dynamic = "force-dynamic";

function Ladder({ cycle, unitUsd }: { cycle?: CycleView; unitUsd: number }) {
  return (
    <div className="flex items-stretch gap-1.5">
      {BUY_TIERS.map((t, i) => {
        const filled = cycle?.filledTiers.includes(t.tier) ?? false;
        const isNext = !filled && (cycle?.buyCount ?? 0) === t.tier - 1;
        return (
          <div
            key={t.tier}
            className={`relative flex-1 rounded-lg border px-2 py-2 text-center transition-colors ${
              filled
                ? "border-orange-400/70 bg-orange-500/15 shadow-[0_0_18px_-8px_rgba(255,138,30,0.9)]"
                : isNext
                  ? "border-sky-400/40 bg-sky-500/5"
                  : "border-white/8 bg-black/30"
            }`}
          >
            <span
              className={`absolute left-1 top-1 font-mono text-[9px] ${filled ? "text-orange-300" : isNext ? "text-sky-300" : "text-slate-600"}`}
            >
              R{i + 1}
            </span>
            <p className={`font-display text-[10px] font-bold uppercase tracking-wider ${filled ? "text-orange-200" : "text-slate-400"}`}>
              VAPI ≤ {t.vapi}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-200">
              {t.size}× <span className="text-slate-500">${fmtNum(unitUsd * t.size, 0)}</span>
            </p>
            <p className="font-mono text-[10px] text-slate-500">{filled ? "filled" : isNext ? "next" : "locked"}</p>
          </div>
        );
      })}
    </div>
  );
}

function SymbolCard({
  coin,
  price,
  unitUsd,
  enabled,
  cycle,
  vapi,
}: {
  coin: string;
  price: number | null;
  unitUsd: number;
  enabled: boolean;
  cycle?: CycleView;
  vapi: number | null;
}) {
  return (
    <section className="neon-panel overflow-hidden rounded-2xl">
      <header className="relative flex items-center justify-between gap-3 border-b border-white/8 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-orange-400/40 bg-orange-500/10 font-display text-[10px] font-bold text-orange-300">
            {coin.slice(0, 1)}
          </span>
          <span className="font-display text-sm font-bold tracking-[0.14em] text-slate-100">{coin}</span>
          <span className="font-mono text-[10px] text-slate-500">/USD · 3H</span>
          {!enabled && <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">OFF</span>}
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold tabular-nums text-slate-50">{price ? fmtUsd(price) : "—"}</p>
          <p className="font-mono text-[9px] uppercase tracking-wide text-slate-500">Hyperliquid mid</p>
        </div>
      </header>

      <div className="space-y-4 p-5">
        <VapiGauge vapi={vapi} />
        <Ladder cycle={cycle} unitUsd={unitUsd} />

        {cycle ? (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Prezzo medio</dt>
                <dd className="font-mono tabular-nums text-slate-200">{fmtUsd(cycle.avgEntry)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Residuo</dt>
                <dd className="font-mono tabular-nums text-slate-200">
                  {fmtQty(cycle.qty)} {coin}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">PnL aperto</dt>
                <dd className={`font-mono font-semibold tabular-nums ${pnlColor(cycle.unrealizedPct)}`}>
                  {fmtPct(cycle.unrealizedPct)} <span className="font-normal opacity-70">({fmtUsd(cycle.unrealizedUsd)})</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">PnL realizzato</dt>
                <dd className={`font-mono tabular-nums ${pnlColor(cycle.realizedPnlUsd)}`}>{fmtUsd(cycle.realizedPnlUsd)}</dd>
              </div>
            </dl>
            <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-xl border border-sky-400/20 bg-sky-500/5 px-3 py-2">
              <span className="font-display text-[10px] uppercase tracking-[0.16em] text-sky-300">Next exit</span>
              <span className="text-sm text-slate-200">{cycle.next ? cycle.next.label : "piano completato"}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-slate-500">
                ciclo #{cycle.id} · {cycle.buyCount}/3 BUY · uscite {cycle.exitStage} · {cycle.mode.toUpperCase()} · {fmtDate(cycle.openedAt)}
              </p>
              <CloseCycleButton id={cycle.id} live={cycle.mode === "live"} />
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-white/12 bg-black/25 px-4 py-3 text-sm text-slate-400">
            Nessun ciclo aperto — in attesa del primo BUY (VAPI ≤ {BUY_TIERS[0].vapi}).
          </p>
        )}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const d = await getDashboardData();
  const winRate = d.stats.closed ? (d.stats.wins / d.stats.closed) * 100 : null;
  const c = d.diag.counts;
  const totalWebhooks = (c.executed ?? 0) + (c.ignored ?? 0) + (c.rejected ?? 0) + (c.error ?? 0);
  const baseUnit = d.symbols.find((s) => s.coin === "BTC")?.unitUsd ?? 500;

  return (
    <>
      <section className="neon-panel relative overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "url('/images/bg-neon.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04060b] via-[#04060b]/85 to-transparent" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <SectionLabel>Bull Lab · Trading System</SectionLabel>
            <h1 className="mt-1 font-display text-2xl font-black leading-tight text-slate-50 sm:text-3xl">
              VAPI LADDER <span className="brand-lab">3H</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Ladder martingala sul VAPI LazyBear (periodo 10) su BTC ed ETH · BUY intrabar su −25/−32/−40 ·
              uscite solo a chiusura candela 3H · nessuno stop loss.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_COINS.map((coin) => (
              <div key={coin} className="neon-chip rounded-xl px-3 py-2 text-right">
                <p className="font-display text-[9px] uppercase tracking-[0.18em] text-slate-500">{coin} mid</p>
                <p className="font-mono text-sm font-semibold text-slate-100">{d.mids?.[coin] ? fmtUsd(d.mids[coin]) : "—"}</p>
                <p className={`font-mono text-[10px] ${(d.latestVapi[coin] ?? 0) < 0 ? "text-orange-300" : "text-emerald-300"}`}>
                  VAPI {d.latestVapi[coin] !== undefined ? fmtNum(d.latestVapi[coin]) : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Card
        title="Diagnosi automatica"
        right={
          <Link href="/setup" className="font-display text-[10px] uppercase tracking-wider text-orange-300 hover:underline">
            Setup & test →
          </Link>
        }
      >
        <Insights items={d.diag.insights} />
        <p className="mt-3 font-mono text-[10px] text-slate-500">
          ultimo webhook TradingView: {d.diag.lastTv ? `${timeAgo(d.diag.lastTv.receivedAt)} (${d.diag.lastTv.code})` : "mai"} · ultimo
          ordine da webhook: {d.diag.lastExecuted ? timeAgo(d.diag.lastExecuted.receivedAt) : "mai"}
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="PnL realizzato" value={fmtUsd(d.stats.realized)} tone={pnlColor(d.stats.realized)} sub={`su ${fmtUsd(d.stats.invested, 0)} investiti`} />
        <Stat label="Cicli chiusi" value={d.stats.closed} sub={`${d.openView.length} aperti`} />
        <Stat label="Win rate" value={winRate === null ? "—" : `${fmtNum(winRate, 0)}%`} sub={`${d.stats.wins} vincenti`} />
        <Stat
          label="Webhook 24h"
          value={`${c.executed ?? 0} / ${totalWebhooks}`}
          sub={`eseguiti / totali · ${c.rejected ?? 0} scartati · ${c.error ?? 0} errori`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {SUPPORTED_COINS.map((coin) => {
          const cfg = d.symbols.find((s) => s.coin === coin);
          return (
            <SymbolCard
              key={coin}
              coin={coin}
              price={d.mids?.[coin] ?? null}
              unitUsd={cfg?.unitUsd ?? 500}
              enabled={cfg?.enabled ?? true}
              cycle={d.openView.find((x) => x.coin === coin)}
              vapi={d.latestVapi[coin] ?? null}
            />
          );
        })}
      </div>

      <Card title="Regole confermate (VAPI Ladder 3H)">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <SectionLabel>Ingressi · BUY intrabar (base {fmtUsd(baseUnit, 0)})</SectionLabel>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {BUY_TIERS.map((t) => (
                <li key={t.tier} className="flex items-center justify-between gap-3 border-b border-white/5 pb-1.5">
                  <span>
                    <span className="font-mono text-orange-300">R{t.tier}</span> · VAPI ≤ {t.vapi}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {t.size}× · {fmtUsd(baseUnit * t.size, 0)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              R1 max 3 BUY per ciclo · R2 un solo BUY per candela 3H · R5 un BUY per scaglione, in ordine · nessuno stop loss.
            </p>
          </div>
          <div>
            <SectionLabel>Uscite · solo a chiusura 3H (livelli VAPI)</SectionLabel>
            <ul className="mt-2 space-y-1.5 text-sm">
              {Object.entries(EXIT_PLANS).map(([n, plan]) => (
                <li key={n} className="flex gap-3 border-b border-white/5 pb-1.5">
                  <span className="w-14 shrink-0 font-mono text-xs text-slate-400">{n} BUY</span>
                  <span className="text-slate-200">{plan.map((s) => s.label).join(" · ")}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Il bot ricalcola i livelli sul VAPI del payload e il PnL reale sul prezzo medio di carico per la contabilità.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Ultimi ordini"
          right={
            <Link href="/history" className="font-display text-[10px] uppercase tracking-wider text-orange-300 hover:underline">
              Storico →
            </Link>
          }
        >
          {d.recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="font-display text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Ora</th>
                    <th className="py-2 pr-3 font-medium">Lato</th>
                    <th className="py-2 pr-3 font-medium">Prezzo</th>
                    <th className="py-2 pr-3 font-medium">Valore</th>
                    <th className="py-2 font-medium">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {d.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap py-2 pr-3 font-mono text-[11px] text-slate-400 tabular-nums">{fmtDate(o.createdAt)}</td>
                      <td className="py-2 pr-3">
                        <span className={o.side === "BUY" ? "text-emerald-400" : "text-orange-400"}>{o.side}</span> {o.coin}
                        {o.tier ? ` R${o.tier}` : ""}
                        {o.exitStage ? ` X${o.exitStage}` : ""}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums">{fmtUsd(o.price)}</td>
                      <td className="py-2 pr-3 font-mono tabular-nums">{fmtUsd(o.notionalUsd)}</td>
                      <td className={`py-2 font-mono tabular-nums ${pnlColor(o.pnlPct)}`}>{o.pnlPct === null ? "—" : fmtPct(o.pnlPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nessun ordine ancora. Usa il simulatore in “Log webhook” per provare il flusso.</p>
          )}
        </Card>

        <Card
          title="Ultimi webhook ricevuti"
          right={
            <Link href="/webhooks" className="font-display text-[10px] uppercase tracking-wider text-orange-300 hover:underline">
              Log completo →
            </Link>
          }
        >
          <EventsTable events={d.recentEvents} compact />
        </Card>
      </div>
    </>
  );
}
