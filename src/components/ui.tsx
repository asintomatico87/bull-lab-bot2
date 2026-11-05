import type { ReactNode } from "react";
import type { Insight } from "@/lib/queries";

export function Card({
  title,
  right,
  children,
  className = "",
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`neon-panel rounded-2xl ${className}`}>
      {(title || right) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-3">
          <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">{title}</h2>
          {right}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  executed: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40",
  ignored: "bg-slate-500/10 text-slate-300 ring-slate-400/25",
  rejected: "bg-amber-500/15 text-amber-300 ring-amber-400/40",
  error: "bg-rose-500/15 text-rose-300 ring-rose-400/40",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset ${STATUS_STYLES[status] ?? STATUS_STYLES.ignored}`}
    >
      {status}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: string }) {
  const live = mode === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[11px] font-bold tracking-[0.16em] ring-1 ring-inset ${
        live
          ? "bg-orange-500/15 text-orange-300 ring-orange-400/50 glow-orange"
          : "bg-sky-500/10 text-sky-300 ring-sky-400/40 glow-blue"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-orange-400" : "bg-sky-400"}`} />
      {live ? "LIVE" : "PAPER"}
    </span>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="neon-panel rounded-2xl p-4">
      <p className="font-display text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-1.5 font-display text-2xl font-bold tabular-nums ${tone ?? "text-slate-100"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const INSIGHT_STYLES: Record<Insight["level"], string> = {
  ok: "border-emerald-400/30 bg-emerald-500/8 text-emerald-200",
  warn: "border-amber-400/35 bg-amber-500/8 text-amber-200",
  error: "border-rose-400/40 bg-rose-500/10 text-rose-200",
};
const INSIGHT_ICON: Record<Insight["level"], string> = { ok: "✓", warn: "!", error: "✕" };

export function Insights({ items }: { items: Insight[] }) {
  return (
    <div className="space-y-2">
      {items.map((i, idx) => (
        <div key={idx} className={`flex gap-3 rounded-xl border px-4 py-3 ${INSIGHT_STYLES[i.level]}`}>
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-black/30 font-mono text-xs font-bold">
            {INSIGHT_ICON[i.level]}
          </span>
          <div>
            <p className="text-sm font-semibold">{i.title}</p>
            <p className="mt-0.5 text-sm opacity-90">{i.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="font-display text-[10px] uppercase tracking-[0.18em] text-slate-500">{children}</p>;
}
