"use client";

import React, { useEffect, useState } from "react";
import {
  Radio,
  Copy,
  Check,
  Send,
  Code2,
  Terminal,
  Zap,
  Sliders,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { generateVapiPineScript } from "@/lib/vapi-pine";

interface Bot {
  id: number;
  name: string;
  pair: string;
  webhookSecret: string;
  platform: string;
  status: string;
  strategyKey?: string;
  config?: Record<string, unknown> | null;
}

interface TradingViewWebhookTabProps {
  bots: Bot[];
  onTradeExecuted: () => void;
}

export default function TradingViewWebhookTab({ bots, onTradeExecuted }: TradingViewWebhookTabProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Strategy Generator Config
  const [selectedBotId, setSelectedBotId] = useState<number>(bots[0]?.id || 1);
  const [indicatorType, setIndicatorType] = useState<"vapi" | "bull_lab" | "ema_cross" | "supertrend" | "rsi_div">("vapi");
  const [timeframe, setTimeframe] = useState<string>("1h");
  const [pair, setPair] = useState<string>("BTCUSDT");
  const [leverage, setLeverage] = useState<number>(5);
  const [fastPeriod, setFastPeriod] = useState<number>(21);
  const [slowPeriod, setSlowPeriod] = useState<number>(200);
  const [rsiLength, setRsiLength] = useState<number>(14);
  const [stopLossPct, setStopLossPct] = useState<number>(2.5);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(6.0);

  // Simulator State
  const [simAction, setSimAction] = useState<"BUY_LONG" | "SELL_SHORT" | "CLOSE_LONG" | "CLOSE_SHORT">("BUY_LONG");
  const [simSize, setSimSize] = useState<string>("0.05");
  const [simPrice, setSimPrice] = useState<string>("84250.00");
  const [simVapi, setSimVapi] = useState<string>("14.70");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const selectedBot = bots.find((b) => b.id === selectedBotId) || bots[0];
  const botSecret = selectedBot?.webhookSecret || "BULL_LAB_SEC_77";

  // Salute del backend: senza database il webhook risponde 500
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [backendHint, setBackendHint] = useState<string>("");

  // Webhook URL
  const [origin, setOrigin] = useState<string>("");
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const webhookUrl = origin ? `${origin}/api/webhook/tradingview` : "https://tuo-dominio.com/api/webhook/tradingview";

  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        setBackendOk(Boolean(data.ok));
        setBackendHint(String(data.hint ?? data.details ?? ""));
      })
      .catch(() => setBackendOk(false));
  }, []);

  // Dynamic PineScript Generator
  const generatePineScript = () => {
    const asset = pair === "ETHUSDT" ? "ETH" : "BTC";
    const defaultQty = asset === "BTC" ? 0.05 : 0.8;
    const vapiConfig = (selectedBot?.config ?? {}) as Record<string, unknown>;

    if (indicatorType === "vapi") {
      return generateVapiPineScript({
        secret: botSecret,
        ticker: pair,
        length: Number(vapiConfig.length ?? 10),
        longEntry: Number(vapiConfig.longEntry ?? 10),
        longExit: Number(vapiConfig.longExit ?? -2),
        shortEntry: Number(vapiConfig.shortEntry ?? -10),
        shortExit: Number(vapiConfig.shortExit ?? 2),
        confirmation: Number(vapiConfig.confirmation ?? 1),
        stopLossPct,
        takeProfitPct,
        trailingStopPct: 1.5,
        qty: Number(vapiConfig.qty ?? defaultQty),
        capital: 10000,
        leverage,
      });
    }

    if (indicatorType === "bull_lab") {
      return `//@version=5
// ==============================================================================
// BULL LAB TRADING SYSTEM - Multi-Confluence Matrix (Asintomatico Formula)
// Powered by Altcoinitalia | www.bulllab.one
// ==============================================================================
strategy("Bull Lab Confluence Matrix [TradingView]", overlay=true, initial_capital=10000, default_qty_type=strategy.cash, default_qty_value=1000, commission_type=strategy.commission.percent, commission_value=0.035)

// --- INPUT INDICATORI BULL LAB ---
fastEMA = ta.ema(close, ${fastPeriod})
trendEMA = ta.ema(close, ${slowPeriod})
rsiVal = ta.rsi(close, ${rsiLength})
[supertrend, direction] = ta.supertrend(3.0, 10)

// --- CONDIZIONI DI SEGNALE BULL LAB ---
longSignal = ta.crossover(close, supertrend) and close > trendEMA and rsiVal > 45 and rsiVal < 68
shortSignal = ta.crossunder(close, supertrend) and close < trendEMA and rsiVal < 55 and rsiVal > 32

// --- GESTIONE STOP LOSS & TAKE PROFIT ---
stopLossTicks = close * (${stopLossPct} / 100) / syminfo.mintick
takeProfitTicks = close * (${takeProfitPct} / 100) / syminfo.mintick

// --- ESECUZIONE STRATEGIA CON ALERT WEBHOOK ---
if (longSignal)
    strategy.entry("BL_LONG", strategy.long)
    strategy.exit("TP/SL_LONG", "BL_LONG", loss=stopLossTicks, profit=takeProfitTicks)
    alert('{"secret":"${botSecret}","ticker":"${pair}","action":"BUY_LONG","size":${defaultQty},"strategy":"BullLab_Matrix","price":' + str.tostring(close) + '}', alert.freq_once_per_bar_close)

if (shortSignal)
    strategy.entry("BL_SHORT", strategy.short)
    strategy.exit("TP/SL_SHORT", "BL_SHORT", loss=stopLossTicks, profit=takeProfitTicks)
    alert('{"secret":"${botSecret}","ticker":"${pair}","action":"SELL_SHORT","size":${defaultQty},"strategy":"BullLab_Matrix","price":' + str.tostring(close) + '}', alert.freq_once_per_bar_close)

// --- RENDERING GRAFICO TRADINGVIEW ---
plot(fastEMA, "Bull Lab Fast EMA", color=color.new(#00d2ff, 0), linewidth=2)
plot(trendEMA, "Bull Lab Trend Baseline", color=color.new(#ff6b00, 0), linewidth=2)
plot(supertrend, "Supertrend Dynamic Band", color=direction < 0 ? color.emerald : color.rose, linewidth=2)
plotshape(longSignal, title="LONG", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small, text="BULL LAB LONG")
plotshape(shortSignal, title="SHORT", style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small, text="BULL LAB SHORT")
`;
    } else if (indicatorType === "ema_cross") {
      return `//@version=5
// ==============================================================================
// BULL LAB - Dynamic Triple EMA Crossover (9/21/50)
// ==============================================================================
strategy("Bull Lab EMA Golden Cross", overlay=true, initial_capital=10000)

emaFast = ta.ema(close, 9)
emaMid = ta.ema(close, 21)
emaTrend = ta.ema(close, 50)

bullCross = ta.crossover(emaFast, emaMid) and close > emaTrend
bearCross = ta.crossunder(emaFast, emaMid) and close < emaTrend

if (bullCross)
    strategy.entry("EMA_LONG", strategy.long)
    alert('{"secret":"${botSecret}","ticker":"${pair}","action":"BUY_LONG","size":${defaultQty},"strategy":"EMA_Pulse","price":' + str.tostring(close) + '}', alert.freq_once_per_bar_close)

if (bearCross)
    strategy.entry("EMA_SHORT", strategy.short)
    alert('{"secret":"${botSecret}","ticker":"${pair}","action":"SELL_SHORT","size":${defaultQty},"strategy":"EMA_Pulse","price":' + str.tostring(close) + '}', alert.freq_once_per_bar_close)

plot(emaFast, "EMA 9", color=color.aqua)
plot(emaMid, "EMA 21", color=color.orange)
plot(emaTrend, "EMA 50 Baseline", color=color.purple, linewidth=2)
`;
    } else {
      return `//@version=5
// ==============================================================================
// BULL LAB - Supertrend Trend Follower
// ==============================================================================
strategy("Bull Lab Supertrend Engine", overlay=true, initial_capital=10000)

[supertrend, direction] = ta.supertrend(3.0, 10)

buyCond = ta.crossover(close, supertrend)
sellCond = ta.crossunder(close, supertrend)

if (buyCond)
    strategy.entry("ST_LONG", strategy.long)
    alert('{"secret":"${botSecret}","ticker":"${pair}","action":"BUY_LONG","size":${defaultQty},"strategy":"Supertrend","price":' + str.tostring(close) + '}', alert.freq_once_per_bar_close)

if (sellCond)
    strategy.entry("ST_SHORT", strategy.short)
    alert('{"secret":"${botSecret}","ticker":"${pair}","action":"SELL_SHORT","size":${defaultQty},"strategy":"Supertrend","price":' + str.tostring(close) + '}', alert.freq_once_per_bar_close)

plot(supertrend, "Supertrend", color=direction < 0 ? color.green : color.red, linewidth=2)
`;
    }
  };

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // Run Test Simulation
  const handleSimulateWebhook = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      const payload = {
        secret: botSecret,
        ticker: pair,
        action: simAction,
        size: parseFloat(simSize),
        price: parseFloat(simPrice),
        vapi: simVapi === "" ? undefined : parseFloat(simVapi),
        strategy:
          indicatorType === "vapi"
            ? "VAPI_LB_3H"
            : indicatorType === "bull_lab"
            ? "BullLab_Confluence"
            : "EMA_Cross",
        notes: "Test alert simulato dalla dashboard Bull Lab",
      };

      const res = await fetch("/api/webhook/tradingview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setSimResult(data);
      if (data.success) {
        onTradeExecuted();
      }
    } catch (err: any) {
      setSimResult({ error: err.message || "Richiesta fallita" });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Backend non pronto: il webhook non può funzionare */}
      {backendOk === false && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 space-y-1">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-mono font-bold uppercase">
            <AlertCircle className="w-4 h-4" />
            Webhook non operativo: database non collegato
          </div>
          <p className="text-[11px] text-rose-200/90 leading-relaxed">
            Gli alert di TradingView arriveranno, ma il bot risponderà con errore 500 finché il database non
            raggiunge questa installazione. Su Vercel: <strong>Settings → Environment Variables</strong>, aggiungi{" "}
            <code className="text-amber-300">DATABASE_URL</code> e poi <strong>Deployments → Redeploy</strong>.
          </p>
          {backendHint && <p className="text-[10px] text-rose-300/70 font-mono">{backendHint}</p>}
        </div>
      )}

      {/* Header Banner */}
      <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-cyan-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold uppercase mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              TradingView Webhook Gateway
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Automatizza le tue Strategie con <span className="text-cyan-400">TradingView</span>
            </h2>
            <p className="mt-2 text-slate-300 text-sm max-w-3xl leading-relaxed">
              Collega qualsiasi indicatore o script di TradingView a Bull Lab. Quando una condizione si verifica su Bitcoin o Ethereum, TradingView invia un alert HTTP al tuo webhook dedicato ed esegue l&apos;ordine all&apos;istante sul tuo bot.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#06090e] border border-cyan-500/40 min-w-[280px]">
            <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
              <span>Il tuo Endpoint Webhook:</span>
              <span className="text-emerald-400 font-bold">ATTIVO</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 select-all"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, setCopiedUrl)}
                className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                title="Copia URL Webhook"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: PineScript Generator on Left, Webhook Simulator on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PineScript Generator (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cyber-card rounded-2xl p-6 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Generatore Pine Script v5 con Webhook Integrato</h3>
              </div>
              <button
                onClick={() => copyToClipboard(generatePineScript(), setCopiedCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold border border-amber-500/40 transition-all glow-orange-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "Copiato negli Appunti!" : "Copia Codice PineScript"}</span>
              </button>
            </div>

            {/* Customizer Controls */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-mono">Formula Indicatore:</label>
                <select
                  value={indicatorType}
                  onChange={(e) => setIndicatorType(e.target.value as any)}
                  className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="vapi">VAPI 3H Pressure Matrix [LazyBear] (Consigliato)</option>
                  <option value="bull_lab">Bull Lab Confluence (Asintomatico)</option>
                  <option value="ema_cross">Dynamic EMA Cross (9/21/50)</option>
                  <option value="supertrend">Supertrend ATR Breakout</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono">Asset Crypto:</label>
                <select
                  value={pair}
                  onChange={(e) => setPair(e.target.value)}
                  className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="BTCUSDT">Bitcoin (BTC/USDT)</option>
                  <option value="ETHUSDT">Ethereum (ETH/USDT)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono">Bot di Destinazione:</label>
                <select
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(Number(e.target.value))}
                  className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  {bots.map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.id} {b.name} ({b.platform})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Indicator Parameters sliders/inputs */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[#06090e] border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 font-mono">Fast EMA:</span>
                <input
                  type="number"
                  value={fastPeriod}
                  onChange={(e) => setFastPeriod(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono"
                />
              </div>
              <div>
                <span className="text-slate-400 font-mono">Trend Baseline:</span>
                <input
                  type="number"
                  value={slowPeriod}
                  onChange={(e) => setSlowPeriod(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-mono"
                />
              </div>
              <div>
                <span className="text-slate-400 font-mono">Stop Loss %:</span>
                <input
                  type="number"
                  step="0.5"
                  value={stopLossPct}
                  onChange={(e) => setStopLossPct(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-rose-400 font-mono"
                />
              </div>
              <div>
                <span className="text-slate-400 font-mono">Take Profit %:</span>
                <input
                  type="number"
                  step="0.5"
                  value={takeProfitPct}
                  onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono"
                />
              </div>
            </div>

            {/* PineScript Code Viewer */}
            <div className="mt-4 relative">
              <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-500 uppercase bg-slate-900 px-2 py-0.5 rounded">
                Pine Script v5
              </div>
              <textarea
                readOnly
                rows={13}
                value={generatePineScript()}
                className="w-full bg-[#05080d] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 select-all focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* 3 Steps Guide for TradingView */}
            <div className="mt-5 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                3 Passi per Attivare il Bot su TradingView:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Apri il grafico di Bitcoin o Ethereum su TradingView e clicca in basso su <strong>&quot;Pine Editor&quot;</strong>.</li>
                <li>Incolla il codice generato qui sopra e premi <strong>&quot;Aggiungi al Grafico&quot;</strong>.</li>
                <li>Clicca sull&apos;icona Sveglia (Crea Alert), nella scheda Notifiche attiva <strong>&quot;URL Webhook&quot;</strong> e inserisci l&apos;URL del tuo Bull Lab. Nel corpo messaggio inserisci: <code className="text-cyan-400">{'{{strategy.order.alert_message}}'}</code></li>
              </ol>
              {indicatorType === "vapi" && (
                <p className="mt-2 p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200">
                  <strong>Script VAPI:</strong> scegli come condizione dell&apos;alert{" "}
                  <em>&quot;Qualsiasi chiamata della funzione alert()&quot;</em> (Any alert() function call) e lascia
                  vuoto il messaggio: il JSON con secret, ticker, size e valore <code>vapi</code> viene già inviato dallo
                  script ad ogni chiusura di candela 3H.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Webhook Simulator & Bot Secret */}
        <div className="space-y-6">
          {/* Bot Secret Card */}
          <div className="cyber-card rounded-2xl p-6 border border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Secret Key del Bot Selezionato
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Ogni bot possiede una chiave univoca segreta. Il webhook rifiuterà qualsiasi alert inviato senza questo token.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-[#06090e] border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                <span>Bot: #{selectedBot?.id} {selectedBot?.name}</span>
                <span className="text-amber-400 font-bold">{selectedBot?.platform}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={botSecret}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-amber-300 select-all"
                />
                <button
                  onClick={() => copyToClipboard(botSecret, setCopiedSecret)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copia Secret"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Webhook Alert Simulator */}
          <div className="cyber-card rounded-2xl p-6 border border-cyan-500/40 glow-cyan-sm">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase font-bold mb-2">
              <Send className="w-4 h-4" />
              Simulatore di Segnale Webhook
            </div>
            <h4 className="text-base font-black text-white">Testa l&apos;Esecuzione Istantanea</h4>
            <p className="text-xs text-slate-400 mt-1">
              Invia un segnale fittizio identico a quello inviato da TradingView per verificare che il bot esegua correttamente l&apos;ordine.
            </p>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400">Azione Segnale:</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button
                    onClick={() => setSimAction("BUY_LONG")}
                    className={`py-1.5 rounded-lg font-bold border transition-all ${
                      simAction === "BUY_LONG"
                        ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    BUY LONG
                  </button>
                  <button
                    onClick={() => setSimAction("SELL_SHORT")}
                    className={`py-1.5 rounded-lg font-bold border transition-all ${
                      simAction === "SELL_SHORT"
                        ? "bg-rose-950 border-rose-500 text-rose-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    SELL SHORT
                  </button>
                  <button
                    onClick={() => setSimAction("CLOSE_LONG")}
                    className={`py-1.5 rounded-lg font-bold border transition-all ${
                      simAction === "CLOSE_LONG"
                        ? "bg-amber-950 border-amber-500 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    CLOSE LONG
                  </button>
                  <button
                    onClick={() => setSimAction("CLOSE_SHORT")}
                    className={`py-1.5 rounded-lg font-bold border transition-all ${
                      simAction === "CLOSE_SHORT"
                        ? "bg-amber-950 border-amber-500 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    CLOSE SHORT
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400">Taglia (Size):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={simSize}
                    onChange={(e) => setSimSize(e.target.value)}
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Prezzo Esecuzione:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={simPrice}
                    onChange={(e) => setSimPrice(e.target.value)}
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white"
                  />
                </div>
              </div>

              {(indicatorType === "vapi" || selectedBot?.strategyKey === "vapi_lazybear") && (
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30">
                  <label className="text-amber-300 font-bold">Valore VAPI nel payload (gate):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={simVapi}
                    onChange={(e) => setSimVapi(e.target.value)}
                    className="mt-1 w-full bg-[#06090e] border border-amber-500/40 rounded px-2.5 py-1 text-amber-200 font-bold"
                  />
                  <p className="mt-1 text-[10px] text-slate-400 leading-snug">
                    Il server rifiuta BUY se VAPI &lt; soglia LONG e SELL se VAPI &gt; soglia SHORT del bot.
                  </p>
                </div>
              )}

              <button
                disabled={simulating}
                onClick={handleSimulateWebhook}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg glow-cyan-sm transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{simulating ? "Invio Segnale in corso..." : "SPARA ALERT TEST A BULL LAB"}</span>
              </button>

              {/* Simulation Result Box */}
              {simResult && (
                <div
                  className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed ${
                    simResult.success
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    {simResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    {simResult.success ? "Esecuzione Riuscita!" : "Errore Alert"}
                  </div>
                  {simResult.message && <p>{simResult.message}</p>}
                  {simResult.order && (
                    <div className="mt-1 text-[11px] font-mono text-slate-300 space-y-0.5">
                      <div>Ordine #{simResult.order.id} | {simResult.order.action} | {simResult.order.pair}</div>
                      <div>Prezzo: ${simResult.order.price} | Piattaforma: {simResult.order.platform}</div>
                    </div>
                  )}
                  {simResult.error && <p>{simResult.error}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
