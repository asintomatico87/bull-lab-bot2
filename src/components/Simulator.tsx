"use client";

import { useState, useTransition } from "react";
import { simulateSignal, type ActionResult } from "@/app/actions";
import { EXIT_PLANS } from "@/lib/strategy";

const inputCls =
  "w-full rounded-md border border-white/12 bg-black/40 px-2 py-1.5 font-mono text-sm text-slate-100 focus:border-orange-400 focus:outline-none";

export function Simulator({ prices }: { prices: Record<string, number | null> }) {
  const [pending, start] = useTransition();
  const [coin, setCoin] = useState<"BTC" | "ETH">("BTC");
  const [action, setAction] = useState<"BUY" | "BAR_CLOSE">("BUY");
  const [tier, setTier] = useState("auto");
  const [vapi, setVapi] = useState("-26");
  const [price, setPrice] = useState(String(prices.BTC ?? 95000));
  const [barOffset, setBarOffset] = useState(0);
  const [out, setOut] = useState<ActionResult | null>(null);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <label className="text-[11px] uppercase tracking-wide text-slate-500">
          Simbolo
          <select
            className={inputCls}
            value={coin}
            onChange={(e) => {
              const c = e.target.value as "BTC" | "ETH";
              setCoin(c);
              if (prices[c]) setPrice(String(prices[c]));
            }}
          >
            <option>BTC</option>
            <option>ETH</option>
          </select>
        </label>
        <label className="text-[11px] uppercase tracking-wide text-slate-500">
          Azione
          <select
            className={inputCls}
            value={action}
            onChange={(e) => {
              const a = e.target.value as "BUY" | "BAR_CLOSE";
              setAction(a);
              setVapi(a === "BUY" ? "-26" : "16");
            }}
          >
            <option value="BUY">BUY (intrabar)</option>
            <option value="BAR_CLOSE">CLOSE_LONG (chiusura)</option>
          </select>
        </label>
        <label className="text-[11px] uppercase tracking-wide text-slate-500">
          Scaglione
          <select className={inputCls} disabled={action !== "BUY"} value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="auto">auto (ladder)</option>
            <option value="1">rung 1</option>
            <option value="2">rung 2</option>
            <option value="3">rung 3</option>
          </select>
        </label>
        <label className="text-[11px] uppercase tracking-wide text-slate-500">
          VAPI
          <input className={inputCls} value={vapi} onChange={(e) => setVapi(e.target.value)} />
        </label>
        <label className="text-[11px] uppercase tracking-wide text-slate-500">
          Prezzo
          <input className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="text-[11px] uppercase tracking-wide text-slate-500">
          Candela (±)
          <input className={inputCls} type="number" value={barOffset} onChange={(e) => setBarOffset(Number(e.target.value))} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              setOut(
                await simulateSignal({
                  coin,
                  action,
                  tier: action === "BUY" && tier !== "auto" ? Number(tier) : undefined,
                  vapi: vapi.trim() === "" ? undefined : Number(vapi.replace(",", ".")),
                  price: Number(price.replace(",", ".")),
                  barOffset,
                }),
              );
            })
          }
          className="rounded-md bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-slate-950 hover:from-orange-400 hover:to-amber-300 disabled:opacity-50"
        >
          {pending ? "Invio…" : "Invia segnale simulato"}
        </button>
        <p className="max-w-2xl text-xs text-slate-500">
          Passa dal motore reale (stesse regole): salta solo secret e finestra di chiusura. R2 blocca due BUY sulla stessa candela → per
          provare il ladder usa candele diverse (+1, +2). Uscite: {EXIT_PLANS[3].map((s) => `${s.minVapi}`).join("/")} con 3 BUY,{" "}
          {EXIT_PLANS[2].map((s) => `${s.minVapi}`).join("/")} con 2, {EXIT_PLANS[1][0].minVapi} con 1 (livelli VAPI).
        </p>
      </div>
      {out && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 font-mono text-xs ${
            out.ok
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-400/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {out.message}
        </p>
      )}
    </div>
  );
}
