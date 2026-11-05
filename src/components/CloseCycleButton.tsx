"use client";

import { useState, useTransition } from "react";
import { closeCycleAction } from "@/app/actions";

export function CloseCycleButton({ id, live }: { id: number; live: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(live ? "Chiudere la posizione LIVE a mercato su Hyperliquid?" : "Chiudere la posizione paper al prezzo corrente?")) return;
          start(async () => {
            const r = await closeCycleAction(id);
            setMsg(r.message);
          });
        }}
        className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
      >
        {pending ? "Chiusura…" : "Chiudi manualmente"}
      </button>
      {msg && <p className="mt-2 text-xs text-slate-400">{msg}</p>}
    </div>
  );
}
