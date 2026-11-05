import { Card } from "@/components/ui";
import { fmtDate, fmtPct, fmtQty, fmtUsd, pnlColor } from "@/lib/format";
import { getHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { allCycles, allOrders } = await getHistory();
  return (
    <>
      <Card title="Cicli">
        {allCycles.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Coin</th>
                  <th className="py-2 pr-3 font-medium">Stato</th>
                  <th className="py-2 pr-3 font-medium">Modo</th>
                  <th className="py-2 pr-3 font-medium">BUY</th>
                  <th className="py-2 pr-3 font-medium">Medio</th>
                  <th className="py-2 pr-3 font-medium">Investito</th>
                  <th className="py-2 pr-3 font-medium">PnL realizzato</th>
                  <th className="py-2 pr-3 font-medium">Aperto</th>
                  <th className="py-2 font-medium">Chiuso / motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {allCycles.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3 text-slate-500">{c.id}</td>
                    <td className="py-2 pr-3 font-semibold text-amber-300">{c.coin}</td>
                    <td className="py-2 pr-3">{c.status === "open" ? <span className="text-sky-300">aperto</span> : "chiuso"}</td>
                    <td className="py-2 pr-3 text-slate-400">{c.mode}</td>
                    <td className="py-2 pr-3">{c.buyCount} ({c.filledTiers.join(",")})</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtUsd(c.avgEntry)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtUsd(c.totalCostUsd)}</td>
                    <td className={`py-2 pr-3 tabular-nums ${pnlColor(c.realizedPnlUsd)}`}>{fmtUsd(c.realizedPnlUsd)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-slate-400">{fmtDate(c.openedAt)}</td>
                    <td className="py-2 text-slate-400">{c.closedAt ? `${fmtDate(c.closedAt)} · ${c.closeReason ?? ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Nessun ciclo registrato.</p>
        )}
      </Card>

      <Card title="Ordini">
        {allOrders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Ora</th>
                  <th className="py-2 pr-3 font-medium">Ciclo</th>
                  <th className="py-2 pr-3 font-medium">Lato</th>
                  <th className="py-2 pr-3 font-medium">Quantità</th>
                  <th className="py-2 pr-3 font-medium">Prezzo</th>
                  <th className="py-2 pr-3 font-medium">Valore</th>
                  <th className="py-2 pr-3 font-medium">PnL</th>
                  <th className="py-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {allOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap py-2 pr-3 text-slate-400 tabular-nums">{fmtDate(o.createdAt)}</td>
                    <td className="py-2 pr-3 text-slate-500">#{o.cycleId}</td>
                    <td className="py-2 pr-3">
                      <span className={o.side === "BUY" ? "text-emerald-400" : "text-rose-400"}>{o.side}</span> {o.coin}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{fmtQty(o.qty)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtUsd(o.price)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtUsd(o.notionalUsd)}</td>
                    <td className={`py-2 pr-3 tabular-nums ${pnlColor(o.pnlUsd)}`}>
                      {o.pnlUsd === null ? "—" : `${fmtUsd(o.pnlUsd)} (${fmtPct(o.pnlPct)})`}
                    </td>
                    <td className="py-2 text-slate-400">
                      {o.reason} <span className="text-slate-600">[{o.mode}]</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Nessun ordine registrato.</p>
        )}
      </Card>
    </>
  );
}
