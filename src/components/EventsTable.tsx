import type { WebhookEvent } from "@/db/schema";
import { fmtDate } from "@/lib/format";
import { StatusBadge } from "./ui";

export function EventsTable({ events, compact = false }: { events: WebhookEvent[]; compact?: boolean }) {
  if (!events.length) {
    return <p className="text-sm text-slate-400">Nessun evento ancora registrato.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Ora</th>
            <th className="py-2 pr-3 font-medium">Origine</th>
            <th className="py-2 pr-3 font-medium">Esito</th>
            <th className="py-2 pr-3 font-medium">Codice</th>
            <th className="py-2 pr-3 font-medium">Segnale</th>
            <th className="py-2 font-medium">Dettaglio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {events.map((e) => (
            <tr key={e.id} className="align-top">
              <td className="whitespace-nowrap py-2 pr-3 text-slate-400 tabular-nums">{fmtDate(e.receivedAt)}</td>
              <td className="py-2 pr-3 text-slate-400">{e.source}</td>
              <td className="py-2 pr-3">
                <StatusBadge status={e.status} />
              </td>
              <td className="py-2 pr-3 font-mono text-xs text-slate-300">{e.code}</td>
              <td className="whitespace-nowrap py-2 pr-3 text-slate-300">
                {e.action ?? "—"}
                {e.tier ? ` T${e.tier}` : ""} {e.coin ?? ""}
              </td>
              {compact ? (
                <td className="max-w-xs py-2 text-xs text-slate-400">
                  <p className="line-clamp-2">{e.message}</p>
                </td>
              ) : (
                <td className="py-2 text-slate-300">
                  <p>{e.message}</p>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                      body ricevuto · {e.durationMs ?? "?"}ms{e.ip ? ` · ${e.ip}` : ""}
                    </summary>
                    <pre className="mt-1 max-w-xl overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 p-2 text-xs text-slate-400">
                      {e.rawBody || "(vuoto)"}
                      {e.contentType ? `\n\nContent-Type: ${e.contentType}` : ""}
                      {e.userAgent ? `\nUser-Agent: ${e.userAgent}` : ""}
                      {e.detail ? `\n\n${JSON.stringify(e.detail, null, 2)}` : ""}
                    </pre>
                  </details>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
