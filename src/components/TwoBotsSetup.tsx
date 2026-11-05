"use client";

import React, { useState } from "react";
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type SetupResult = {
  success: boolean;
  removed?: { bots: number; orders: number; logs: number };
  bots?: { id: number; name: string; pair: string; secret: string }[];
  webhookUrl?: string;
  error?: string;
  details?: string;
};

interface TwoBotsSetupProps {
  onDone?: () => void;
}

/**
 * Pannello "Configurazione pulita": azzera storico e bot demo e crea
 * i due bot definitivi (BTC ed ETH) con le 6 regole della scala.
 * Chiama /api/admin/setup-two-bots, protetto dalla password del cruscotto.
 */
export default function TwoBotsSetup({ onDone }: TwoBotsSetupProps) {
  const [step, setStep] = useState<"idle" | "confirm" | "running" | "done">("idle");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const run = async () => {
    setStep("running");
    try {
      const res = await fetch("/api/admin/setup-two-bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" }),
      });
      const data: SetupResult = await res.json();
      setResult(data);
      setStep(data.success ? "done" : "idle");
      if (data.success) onDone?.();
    } catch (error) {
      setResult({ success: false, error: String(error) });
      setStep("idle");
    }
  };

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="cyber-card rounded-2xl p-5 sm:p-6 border border-amber-500/40 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-black text-white">
              Configurazione pulita · due bot definitivi
            </h2>
            <p className="text-[11px] text-slate-400">
              Crea <strong className="text-white">BTC</strong> e{" "}
              <strong className="text-white">ETH</strong> con le 6 regole della scala, elimina i bot
              demo e azzera lo storico. Operazione irreversibile.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400">
          richiede password del cruscotto
        </span>
      </div>

      {/* regole riepilogo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
        {[
          { k: "Max acquisti", v: "3 · no stop loss" },
          { k: "Livelli", v: "−25 · −32 · −40" },
          { k: "Size", v: "1x · 1,5x · 2,5x" },
          { k: "Uscite", v: "50%@0 · 50%@15 · 100%@22" },
        ].map((item) => (
          <div key={item.k} className="p-2 rounded-lg bg-[#06090e] border border-slate-800">
            <div className="text-slate-500 uppercase">{item.k}</div>
            <div className="text-amber-200 font-bold">{item.v}</div>
          </div>
        ))}
      </div>

      {step === "idle" && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-[11px] text-rose-200/90 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-rose-300 mb-1">
              <Trash2 className="w-3.5 h-3.5" /> Cosa viene cancellato
            </div>
            Tutti i bot esistenti, tutti gli ordini registrati e tutti i log del webhook. Le
            strategie salvate e i profili exchange restano. Le secret vengono rigenerate: gli alert
            di TradingView andranno rifatti con gli script nuovi.
          </div>
          <button
            onClick={() => setStep("confirm")}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Bot className="w-4 h-4" />
            PREPARA LA CONFIGURAZIONE PULITA
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/60 space-y-3">
          <div className="flex items-start gap-2 text-[11px] text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Confermi? Verranno eliminati ordini, log e tutti i bot attuali, poi saranno creati i due
              bot BTC ed ETH con secret nuove.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={run}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> SÌ, AZZERA E CREA I DUE BOT
            </button>
            <button
              onClick={() => setStep("idle")}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {step === "running" && (
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
          <RefreshCw className="w-4 h-4 animate-spin" /> Pulizia e creazione in corso...
        </div>
      )}

      {step === "done" && result?.success && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono font-bold">
            <CheckCircle2 className="w-4 h-4" /> Configurazione completata
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Rimossi: {result.removed?.orders ?? 0} ordini · {result.removed?.logs ?? 0} log ·{" "}
            {result.removed?.bots ?? 0} bot
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.bots?.map((bot) => (
              <div key={bot.id} className="p-3 rounded-xl bg-[#06090e] border border-emerald-500/40 space-y-1.5">
                <div className="text-xs font-bold text-white">{bot.name}</div>
                <div className="text-[10px] font-mono text-cyan-300">{bot.pair}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500">secret</span>
                  <code className="px-1.5 py-0.5 rounded bg-[#04100b] border border-emerald-500/30 text-emerald-300 text-[10px] font-mono select-all">
                    {bot.secret}
                  </code>
                  <button
                    onClick={() => copy(bot.secret, String(bot.id))}
                    className="text-slate-400 hover:text-white"
                    title="Copia secret"
                  >
                    {copied === String(bot.id) ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-[#05080d] border border-slate-800 space-y-1">
            <div className="text-[10px] font-mono uppercase text-slate-500">URL webhook (uguale per entrambi)</div>
            <div className="flex items-center gap-2">
              <code className="text-[10px] font-mono text-cyan-300 break-all">
                {result.webhookUrl}
              </code>
              <button
                onClick={() => copy(result.webhookUrl ?? "", "url")}
                className="shrink-0 text-slate-400 hover:text-white"
              >
                {copied === "url" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 leading-relaxed">
            Ora vai in <strong className="text-slate-200">Ladder 3H</strong>, seleziona BTC, copia lo
            script Pine e applicalo sul grafico BTCUSDT a 3 ore. Ripeti per ETH su ETHUSDT. Crea un
            alert per grafico con condizione <em>Qualsiasi chiamata della funzione alert()</em> e
            messaggio vuoto.
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-[11px] text-rose-200">
          <div className="font-bold mb-1">Operazione non riuscita</div>
          {result.error}
          {result.details && <div className="text-[10px] text-rose-300/70 mt-1">{result.details}</div>}
        </div>
      )}
    </div>
  );
}
