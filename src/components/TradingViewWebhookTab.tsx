"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Copy, Check, Radio, ShieldCheck, AlertTriangle } from "lucide-react";
import { VAPI_LADDER_DEFAULTS, type LadderConfig } from "@/lib/vapi-ladder";
import { generateLadderPineScript } from "@/lib/vapi-ladder-pine";

type Bot = {
  id: number;
  name: string;
  pair: string;
  webhookSecret: string;
  status: string;
  mode: string;
  strategyKey: string;
  config?: Record<string, any> | null;
};

export default function TradingViewWebhookTab({ bots }: { bots: Bot[] }) {
  const [pair, setPair] = useState("BTC/USDT");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  useEffect(() => { if (typeof window !== "undefined") setOrigin(window.location.origin); }, []);

  const bot = bots.find((item) => item.pair.toUpperCase() === pair) ?? null;
  const config: LadderConfig = {
    ...VAPI_LADDER_DEFAULTS,
    ...(bot?.config ?? {}),
    levels: Array.isArray(bot?.config?.levels) ? bot!.config!.levels : VAPI_LADDER_DEFAULTS.levels,
    multipliers: Array.isArray(bot?.config?.multipliers) ? bot!.config!.multipliers : VAPI_LADDER_DEFAULTS.multipliers,
    plans: bot?.config?.plans ?? VAPI_LADDER_DEFAULTS.plans,
  };
  const ticker = pair === "ETH/USDT" ? "ETHUSDT" : "BTCUSDT";
  const pine = useMemo(() => generateLadderPineScript({ config, secret: bot?.webhookSecret ?? "CREA_PRIMA_IL_BOT", ticker }), [config, bot?.webhookSecret, ticker]);
  const webhookUrl = `${origin || "https://IL-TUO-DOMINIO"}/api/webhook/tradingview`;

  const copyText = async (text: string, setter: (value: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1800);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-cyan-500/30 bg-[#090d14] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-cyan-300"><Radio className="h-4 w-4" /><span className="text-[11px] font-mono uppercase font-bold">TradingView · due alert separati</span></div>
        <h1 className="mt-2 text-xl sm:text-2xl font-black text-white">Collega i segnali VAPI Ladder 3H</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">Crea un alert per BTC e uno per ETH. Ogni script contiene la secret del bot selezionato e invia BUY intrabar e SELL solo alla chiusura della candela 3H. In questa fase Bull Lab li valida e li registra in paper: non invia ordini a un exchange.</p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#090d14] p-5">
        <label className="text-xs font-mono text-slate-400">Asset / bot:</label>
        <div className="mt-2 flex gap-2">{["BTC/USDT", "ETH/USDT"].map((asset) => <button key={asset} onClick={() => setPair(asset)} className={`rounded-lg border px-4 py-2 text-xs font-bold ${pair === asset ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}>{asset}</button>)}</div>
        {bot ? <p className="mt-2 text-[11px] font-mono text-slate-400">Bot #{bot.id} · {bot.status} · modalità {bot.mode} · secret associata allo script.</p> : <p className="mt-2 text-xs text-amber-200">Prima crea e salva il bot {pair} nella scheda VAPI Ladder. Lo script non è valido finché non esiste il bot con la sua secret.</p>}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#090d14] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-white">Script Pine per {ticker} · 3H</h2>
          <button disabled={!bot} onClick={() => copyText(pine, setScriptCopied)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">{scriptCopied ? "Copiato" : "Copia Pine Script"}</button>
        </div>
        <textarea readOnly value={pine} rows={14} className="w-full rounded-xl border border-slate-800 bg-[#05080d] p-3 font-mono text-[10px] text-slate-300" />
      </section>

      <section className="rounded-2xl border border-emerald-500/25 bg-[#090d14] p-5">
        <div className="flex items-center gap-2 text-emerald-300"><ShieldCheck className="h-4 w-4" /><h2 className="font-bold">Procedura per creare l’alert</h2></div>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>In TradingView apri <b>{ticker}</b> sul feed che vuoi usare per il segnale; applica il grafico al timeframe <b>3H</b>.</li>
          <li>Apri Pine Editor, incolla lo script sopra, salva e seleziona <b>Aggiungi al grafico</b>. Se lo script segnala timeframe errato, controlla che il grafico sia davvero 3H.</li>
          <li>Crea un alert. In <b>Condizione</b> scegli <b>Bull Lab VAPI Ladder 3H</b> e poi <b>Any alert() function call / Qualsiasi chiamata della funzione alert()</b>.</li>
          <li>Nella sezione notifiche abilita <b>Webhook URL</b> e incolla l’indirizzo qui sotto. Il corpo del messaggio va lasciato vuoto: lo script invia già il JSON.</li>
          <li>Non impostare un filtro di frequenza aggiuntivo: il Pine usa già once-per-bar per i buy e once-per-bar-close per i sell. Salva l’alert.</li>
          <li>Ripeti la procedura per l’altro asset selezionando ETH o BTC qui sopra: servono due script e due alert distinti, uno per bot.</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-[#05080d] p-3">
          <code className="min-w-0 flex-1 break-all text-xs font-mono text-cyan-300">{webhookUrl}</code>
          <button onClick={() => copyText(webhookUrl, setCopied)} className="rounded bg-slate-800 px-3 py-2 text-xs text-white">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-950/20 p-3 text-xs text-amber-100/90"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>Gli alert TradingView usano una fotografia dello script e dei suoi input quando vengono creati. Se cambi secret, asset o regole, aggiorna lo script sul grafico e ricrea l’alert. Per ora i risultati sono solo paper.</p></div>
      </section>
    </div>
  );
}
