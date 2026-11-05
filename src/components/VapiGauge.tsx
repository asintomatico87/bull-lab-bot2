import { fmtNum } from "@/lib/format";

const MIN = -45;
const MAX = 25;
const W = 340;
const H = 96;
const PAD = 14;

const x = (v: number) => PAD + ((Math.min(Math.max(v, MIN), MAX) - MIN) / (MAX - MIN)) * (W - PAD * 2);

/**
 * Scala VAPI: zone BUY (−25/−32/−40) e livelli di uscita (0/5/12/15/22).
 * Il puntatore mostra l'ultimo VAPI ricevuto da TradingView.
 */
export function VapiGauge({ vapi }: { vapi: number | null }) {
  const clamped = vapi === null ? null : Math.min(Math.max(vapi, MIN), MAX);
  return (
    <div className="rounded-xl border border-white/8 bg-[#050810]/70 px-3 pb-1 pt-2">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[9px] uppercase tracking-[0.2em] text-slate-500">VAPI · periodo 10</span>
        <span
          className={`font-mono text-sm font-semibold ${
            vapi === null ? "text-slate-500" : vapi < 0 ? "text-orange-300" : "text-emerald-300"
          }`}
        >
          {vapi === null ? "in attesa" : fmtNum(vapi, 2)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="Scala VAPI">
        <defs>
          <linearGradient id="buyZone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff8a1e" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff8a1e" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="sellZone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#45e6ff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#45e6ff" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <rect x={x(MIN)} y={26} width={x(-25) - x(MIN)} height={20} rx={4} fill="url(#buyZone)" />
        <rect x={x(0)} y={26} width={x(MAX) - x(0)} height={20} rx={4} fill="url(#sellZone)" />
        <line x1={x(0)} y1={20} x2={x(0)} y2={52} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />

        {[
          { v: -40, c: "#ff5e00" },
          { v: -32, c: "#ff8a1e" },
          { v: -25, c: "#ffb347" },
        ].map((m) => (
          <g key={m.v}>
            <line x1={x(m.v)} y1={26} x2={x(m.v)} y2={46} stroke={m.c} strokeWidth="1.2" strokeDasharray="2 2" />
            <text x={x(m.v)} y={64} textAnchor="middle" fontSize="8" fill={m.c} fontFamily="monospace">
              {m.v}
            </text>
          </g>
        ))}
        {[0, 5, 12, 15, 22].map((v) => (
          <g key={v}>
            <line x1={x(v)} y1={30} x2={x(v)} y2={42} stroke="#45e6ff" strokeWidth="1" opacity="0.8" />
            <text x={x(v)} y={64} textAnchor="middle" fontSize="8" fill="#7dd3fc" fontFamily="monospace">
              {v}
            </text>
          </g>
        ))}

        <text x={x(-33)} y={16} textAnchor="middle" fontSize="8" fill="#ffb347" fontFamily="monospace">
          BUY ZONE
        </text>
        <text x={x(14)} y={16} textAnchor="middle" fontSize="8" fill="#67e8f9" fontFamily="monospace">
          EXIT ZONE
        </text>

        {clamped !== null && (
          <g>
            <line x1={x(clamped)} y1={20} x2={x(clamped)} y2={52} stroke="#ffffff" strokeWidth="1.4" />
            <polygon
              points={`${x(clamped) - 5},16 ${x(clamped) + 5},16 ${x(clamped)},24`}
              fill={clamped < 0 ? "#ff8a1e" : "#45e6ff"}
            />
          </g>
        )}
        <line x1={x(MIN)} y1={36} x2={x(MAX)} y2={36} stroke="#334155" strokeWidth="1" />
      </svg>
    </div>
  );
}
