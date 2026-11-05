"use client";

import { useState, useTransition } from "react";
import { runSelfTest } from "@/app/actions";

export function SelfTest() {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ ok: boolean; message: string; steps: string[] } | null>(null);
  return (
    <div>
      <button
        disabled={pending}
        onClick={() => start(async () => setRes(await runSelfTest()))}
        className="rounded-md bg-amber-400 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
      >
        {pending ? "Test in corso…" : "Esegui test connessione (come farebbe TradingView)"}
      </button>
      {res && (
        <div
          className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
            res.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          <p className="font-semibold">{res.ok ? "✓ " : "✕ "}{res.message}</p>
          <ul className="mt-2 space-y-1 font-mono text-xs opacity-90">
            {res.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
