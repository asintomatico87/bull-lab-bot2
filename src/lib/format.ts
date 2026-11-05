const TZ = "Europe/Rome";

export const fmtNum = (n: number | null | undefined, d = 2) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "—"
    : n.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtUsd = (n: number | null | undefined, d = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n < 0 ? "-" : ""}$${fmtNum(Math.abs(n), d)}`;

export const fmtPct = (n: number | null | undefined, d = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : ""}${fmtNum(n, d)}%`;

export const fmtQty = (n: number) => Number(n.toFixed(6)).toLocaleString("it-IT", { maximumFractionDigits: 6 });

export const fmtDate = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleString("it-IT", {
        timeZone: TZ,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "mai";
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s fa`;
  if (s < 3600) return `${Math.floor(s / 60)} min fa`;
  if (s < 86400) return `${Math.floor(s / 3600)} h fa`;
  return `${Math.floor(s / 86400)} g fa`;
}

export const pnlColor = (n: number | null | undefined) =>
  n === null || n === undefined ? "text-slate-400" : n > 0 ? "text-emerald-400" : n < 0 ? "text-rose-400" : "text-slate-300";
