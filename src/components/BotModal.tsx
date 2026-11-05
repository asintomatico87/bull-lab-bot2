"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bot,
  Zap,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Flame,
} from "lucide-react";

interface BotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialData?: any;
  editBot?: any | null;
}

export default function BotModal({
  isOpen,
  onClose,
  onCreated,
  initialData,
  editBot,
}: BotModalProps) {
  const isEditing = Boolean(editBot?.id);
  const [name, setName] = useState<string>("Bull Lab Alpha Bot");
  const [pair, setPair] = useState<string>("BTC/USDT");
  const [strategyKey, setStrategyKey] = useState<string>("bull_lab_confluence");
  const [platform, setPlatform] = useState<string>("hyperliquid_dex");
  const [mode, setMode] = useState<"paper" | "live">("paper");
  const [leverage, setLeverage] = useState<number>(3);
  const [orderSizeUsdt, setOrderSizeUsdt] = useState<number>(500);
  const [stopLossPct, setStopLossPct] = useState<number>(2.5);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(6.0);
  const [trailingStopPct, setTrailingStopPct] = useState<number>(1.5);
  const [timeframe, setTimeframe] = useState<string>("1h");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [vapi, setVapi] = useState({
    length: 10,
    longEntry: 10,
    longExit: -2,
    shortEntry: -10,
    shortExit: 2,
    confirmation: 1,
    extremeLevel: 45,
    gateLevels: true,
  });

  useEffect(() => {
    if (initialData) {
      if (initialData.name) setName(initialData.name);
      if (initialData.pair) setPair(initialData.pair);
      if (initialData.strategyKey) setStrategyKey(initialData.strategyKey);
      if (initialData.leverage) setLeverage(initialData.leverage);
      if (initialData.stopLossPct) setStopLossPct(initialData.stopLossPct);
      if (initialData.takeProfitPct) setTakeProfitPct(initialData.takeProfitPct);
      if (initialData.timeframe) setTimeframe(initialData.timeframe);
      if (initialData.platform) setPlatform(initialData.platform);
      if (initialData.mode) setMode(initialData.mode);
      if (initialData.orderSizeUsdt) setOrderSizeUsdt(Number(initialData.orderSizeUsdt));
      if (initialData.trailingStopPct) setTrailingStopPct(Number(initialData.trailingStopPct));
      if (initialData.config) {
        setVapi((prev) => ({ ...prev, ...initialData.config }));
      }
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        ...(isEditing ? { id: editBot.id } : {}),
        name,
        pair,
        strategyKey,
        platform,
        mode,
        leverage,
        orderSizeUsdt,
        stopLossPct,
        takeProfitPct,
        trailingStopPct,
        timeframe: strategyKey.startsWith("vapi") ? "3h" : timeframe,
        config:
          strategyKey === "vapi_lazybear"
            ? { ...vapi, indicator: "VAPI_LazyBear", timeframe: "3h" }
            : strategyKey === "vapi_ladder"
            ? { ...((editBot?.config ?? initialData?.config ?? {}) as Record<string, unknown>) }
            : {},
      };

      const res = await fetch("/api/bots", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Errore nel salvataggio del bot");
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl cyber-card rounded-2xl border border-cyan-500/40 shadow-2xl p-6 overflow-hidden">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 glow-cyan-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {isEditing ? `Modifica Bot #${editBot.id}` : "Configura Nuovo Bot Bull Lab"}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? "Aggiorna parametri, livelli VAPI e risk management" : "Automazione sistematica algoritmica"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Bot Name & Pair */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400">Nome Bot:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Bull Lab BTC Trend Master"
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400">Coppia Crypto:</label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="BTC/USDT">Bitcoin (BTC / USDT)</option>
                <option value="ETH/USDT">Ethereum (ETH / USDT)</option>
              </select>
            </div>
          </div>

          {/* Strategy & Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400">Strategia di Trading:</label>
              <select
                value={strategyKey}
                onChange={(e) => {
                  setStrategyKey(e.target.value);
                  if (e.target.value === "vapi_lazybear") setTimeframe("3h");
                }}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="vapi_ladder">VAPI Ladder 3H — martingala 1x/1,5x/2,5x (soglie -25/-32/-40)</option>
                <option value="vapi_lazybear">VAPI 3H Pressure Matrix [LazyBear] — livelli volume</option>
                <option value="bull_lab_confluence">Bull Lab Confluence (Asintomatico Formula)</option>
                <option value="ema_cross">Dynamic EMA Golden Pulse (9/21/50)</option>
                <option value="bollinger_breakout">Bollinger Bands Squeeze & Breakout</option>
                <option value="rsi_mean_reversion">RSI Divergence & Mean Reversion</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400">Exchange / Connettore:</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="hyperliquid_dex">Hyperliquid L1 DEX (Zero KYC / Consigliato)</option>
                <option value="ourbit_nokyc">OurBit Futures (No-KYC Affiliate)</option>
                <option value="bitbase">Bitbase Affiliate</option>
                <option value="bybit">Bybit V5 Unified API</option>
                <option value="paper_trading">Paper Trading Simulator (Virtuale)</option>
              </select>
            </div>
          </div>

          {/* Mode & Timeframe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400">Modalità Esecuzione:</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setMode("paper")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                    mode === "paper"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500"
                      : "bg-[#06090e] text-slate-400 border-slate-800"
                  }`}
                >
                  Paper Trading
                </button>
                <button
                  type="button"
                  onClick={() => setMode("live")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                    mode === "live"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500"
                      : "bg-[#06090e] text-slate-400 border-slate-800"
                  }`}
                >
                  Live API
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400">Timeframe Candele:</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="15m">15 Minuti (Scalping)</option>
                <option value="1h">1 Ora (Swing Intraday)</option>
                <option value="3h">3 Ore (VAPI Core — raccomandato)</option>
                <option value="4h">4 Ore (Trend Following)</option>
                <option value="1d">1 Giorno (Macro Swing)</option>
              </select>
            </div>
          </div>

          {/* Leverage & Order Size */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[#06090e] border border-slate-800">
            <div>
              <label className="text-[11px] font-mono text-slate-400">Leva Finanziaria:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400">Taglia Ordine ($):</label>
              <input
                type="number"
                min="50"
                max="10000"
                step="50"
                value={orderSizeUsdt}
                onChange={(e) => setOrderSizeUsdt(Number(e.target.value))}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400">Stop Loss %:</label>
              <input
                type="number"
                step="0.1"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(Number(e.target.value))}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-rose-400 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400">Take Profit %:</label>
              <input
                type="number"
                step="0.1"
                value={takeProfitPct}
                onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-bold"
              />
            </div>
          </div>

          {/* VAPI LEVEL ENGINE (conditional) */}
          {strategyKey === "vapi_lazybear" && (
            <div className="p-3 rounded-xl bg-[#0a0f1a] border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  VAPI Level Engine · Timeframe 3H
                </div>
                <span className="text-[10px] font-mono text-slate-500">LazyBear formula</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Ordini a soglia sull&apos;oscillatore volume. Il webhook rifiuta i segnali che non rispettano i livelli
                configurati (gate server-side).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: "longEntry", label: "LONG entry", tone: "text-emerald-400" },
                  { key: "longExit", label: "LONG exit", tone: "text-teal-300" },
                  { key: "shortEntry", label: "SHORT entry", tone: "text-rose-400" },
                  { key: "shortExit", label: "SHORT exit", tone: "text-orange-300" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-[10px] font-mono text-slate-400">{field.label}</label>
                    <input
                      type="number"
                      step="0.5"
                      value={(vapi as any)[field.key]}
                      onChange={(e) =>
                        setVapi((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))
                      }
                      className={`mt-1 w-full bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold ${field.tone}`}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400">Length VAPI</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={vapi.length}
                    onChange={(e) => setVapi((prev) => ({ ...prev, length: Number(e.target.value) }))}
                    className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400">Conferma (barre)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={vapi.confirmation}
                    onChange={(e) => setVapi((prev) => ({ ...prev, confirmation: Number(e.target.value) }))}
                    className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400">Liv. estremo</label>
                  <input
                    type="number"
                    value={vapi.extremeLevel}
                    onChange={(e) => setVapi((prev) => ({ ...prev, extremeLevel: Number(e.target.value) }))}
                    className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
                <input
                  type="checkbox"
                  checked={vapi.gateLevels}
                  onChange={(e) => setVapi((prev) => ({ ...prev, gateLevels: e.target.checked }))}
                  className="accent-amber-400"
                />
                Valida i livelli VAPI sul server prima di eseguire l&apos;ordine
              </label>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg glow-cyan-sm transition-all disabled:opacity-50"
            >
              {submitting
                ? "Salvataggio in corso..."
                : isEditing
                ? "SALVA MODIFICHE BOT"
                : "LANCIA BOT AUTOMATIZZATO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
