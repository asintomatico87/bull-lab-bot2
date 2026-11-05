"use client";

import { useState, useTransition } from "react";
import {
  regenerateSecret,
  resetPaperData,
  saveFlags,
  saveSymbol,
  setKillSwitch,
  setMode,
  type ActionResult,
} from "@/app/actions";

type Props = {
  mode: "paper" | "live";
  killSwitch: boolean;
  flags: { allowBuyAfterPartial: boolean; multiStagePerBar: boolean; enforceCloseWindow: boolean };
  symbols: { coin: string; enabled: boolean; unitUsd: number }[];
  liveReady: boolean;
  network: string;
  secretFromEnv: boolean;
};

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-amber-400"
      />
      <span>
        <span className="block text-sm font-medium text-slate-200">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
}

export function SettingsPanel(p: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [flags, setFlags] = useState(p.flags);
  const [syms, setSyms] = useState(p.symbols);

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setMsg(await fn());
    });

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded-xl border px-4 py-2 text-sm ${
            msg.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          {msg.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-sm font-semibold text-slate-200">Modalità di esecuzione</p>
          <p className="mt-1 text-xs text-slate-500">
            PAPER simula i fill al prezzo del segnale. LIVE invia ordini IOC reali a Hyperliquid (
            {p.network}). Chiave API: {p.liveReady ? "configurata ✓" : "non configurata"}.
          </p>
          <div className="mt-3 inline-flex rounded-lg border border-slate-700 p-0.5">
            {(["paper", "live"] as const).map((m) => (
              <button
                key={m}
                disabled={pending}
                onClick={() => {
                  if (m === "live" && !confirm("Passare a LIVE? Gli ordini useranno fondi reali su Hyperliquid.")) return;
                  run(() => setMode(m));
                }}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
                  p.mode === m
                    ? m === "live"
                      ? "bg-rose-500 text-white"
                      : "bg-sky-500 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-sm font-semibold text-slate-200">Kill-switch acquisti</p>
          <p className="mt-1 text-xs text-slate-500">
            Se attivo il bot non apre né incrementa posizioni; le uscite restano attive.
          </p>
          <button
            disabled={pending}
            onClick={() => run(() => setKillSwitch(!p.killSwitch))}
            className={`mt-3 rounded-lg px-4 py-1.5 text-sm font-semibold ${
              p.killSwitch ? "bg-amber-500 text-slate-950" : "border border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {p.killSwitch ? "ATTIVO — clicca per riattivare gli acquisti" : "Disattivo — clicca per sospendere gli acquisti"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <p className="text-sm font-semibold text-slate-200">Size per simbolo (1× = importo in USD)</p>
        <p className="mt-1 text-xs text-slate-500">Scaglioni: 1× / 1,5× / 2,5× dell&apos;unità. Es. unità $100 → $100 / $150 / $250.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {syms.map((s, i) => (
            <div key={s.coin} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 p-3">
              <span className="w-10 font-bold text-amber-300">{s.coin}</span>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={(e) => setSyms(syms.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))}
                  className="h-4 w-4 accent-amber-400"
                />
                attivo
              </label>
              <span className="text-sm text-slate-400">$</span>
              <input
                type="number"
                min={5}
                step={5}
                value={s.unitUsd}
                onChange={(e) => setSyms(syms.map((x, j) => (j === i ? { ...x, unitUsd: Number(e.target.value) } : x)))}
                className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
              />
              <button
                disabled={pending}
                onClick={() => run(() => saveSymbol(s.coin, s.enabled, s.unitUsd))}
                className="ml-auto rounded-md bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-300"
              >
                Salva
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <p className="text-sm font-semibold text-slate-200">Comportamento del motore</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Toggle
            checked={flags.enforceCloseWindow}
            onChange={(v) => setFlags({ ...flags, enforceCloseWindow: v })}
            label="SELL solo a chiusura 3H"
            hint="Scarta i SELL ricevuti a metà candela (oltre 10 min dal confine 3H UTC). Se i tuoi grafici non sono allineati UTC, disattiva."
          />
          <Toggle
            checked={flags.multiStagePerBar}
            onChange={(v) => setFlags({ ...flags, multiStagePerBar: v })}
            label="Più scaglioni di uscita per candela"
            hint="Se disattivo: massimo uno scaglione di uscita per chiusura 3H (consigliato)."
          />
          <Toggle
            checked={flags.allowBuyAfterPartial}
            onChange={(v) => setFlags({ ...flags, allowBuyAfterPartial: v })}
            label="BUY dopo una vendita parziale"
            hint="Se disattivo: dopo la prima uscita parziale il ciclo non accetta nuovi BUY (consigliato)."
          />
        </div>
        <button
          disabled={pending}
          onClick={() => run(() => saveFlags(flags))}
          className="mt-3 rounded-md bg-amber-400 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-amber-300"
        >
          Salva comportamento
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-sm font-semibold text-slate-200">Webhook secret</p>
          <p className="mt-1 text-xs text-slate-500">
            {p.secretFromEnv
              ? "In uso la variabile d'ambiente WEBHOOK_SECRET (ha priorità sul DB): rigenerare qui non ha effetto."
              : "Generato automaticamente e salvato nel DB. Rigenerandolo devi aggiornare lo script su TradingView."}
          </p>
          <button
            disabled={pending || p.secretFromEnv}
            onClick={() => {
              if (confirm("Rigenerare il secret? Gli alert esistenti smetteranno di funzionare finché non li aggiorni.")) run(regenerateSecret);
            }}
            className="mt-3 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            Rigenera secret
          </button>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-sm font-semibold text-rose-200">Azzera dati paper</p>
          <p className="mt-1 text-xs text-slate-500">Cancella cicli/ordini paper, anti-duplicati e log webhook. Non tocca la configurazione.</p>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("Cancellare tutti i dati paper e il log?")) run(resetPaperData);
            }}
            className="mt-3 rounded-md border border-rose-500/40 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10"
          >
            Azzera
          </button>
        </div>
      </div>
    </div>
  );
}
