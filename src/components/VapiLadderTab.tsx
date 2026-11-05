"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Crosshair,
  Download,
  Gauge,
  Layers,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { LadderConfig, LadderTarget } from "@/lib/vapi-ladder";
import { generateLadderPineScript } from "@/lib/vapi-ladder-pine";

const RULES = [
  { n: "R1", title: "Max 3 acquisti", text: "Nessuno stop loss: con 3 buy il bot resta a mercato e mantiene la posizione." },
  { n: "R2", title: "1 buy per candela 3H", text: "Mai due acquisti nella stessa candela: un fill massimo per barra." },
  { n: "R3", title: "Martingala 1x / 1,5x / 2,5x", text: "La size del primo buy è la base; il secondo 1,5x, il terzo 2,5x." },
  { n: "R4", title: "Livelli VAPI ≤ -25 / -32 / -40", text: "Ogni scaglione scatta solo al raggiungimento della propria soglia." },
  { n: "R5", title: "1 buy per scaglione", text: "Ogni livello si riempie una sola volta per ciclo: niente doppioni." },
  { n: "R6", title: "Uscite a scalare", text: "50% a 0, 50% del residuo a 15, chiusura totale a 22 con 3 buy." },
];

const DEFAULT_CONFIG: LadderConfig = {
  baseSizeUsdt: 500,
  levels: [-25, -32, -40],
  multipliers: [1, 1.5, 2.5],
  maxBuys: 3,
  plans: {
    "1": [{ level: 12, fractionPct: 100 }],
    "2": [
      { level: 5, fractionPct: 50 },
      { level: 15, fractionPct: 100 },
    ],
    "3": [
      { level: 0, fractionPct: 50 },
      { level: 15, fractionPct: 50 },
      { level: 22, fractionPct: 100 },
    ],
  },
  feePct: 0.035,
  capital: 10000,
  vapiLength: 10,
};

interface VapiLadderTabProps {
  onPublishBot: (payload: Record<string, unknown>) => Promise<void>;
  existingBot?: { id: number; name: string; webhookSecret: string } | null;
}

export default function VapiLadderTab({ onPublishBot, existingBot }: VapiLadderTabProps) {
  const [pair, setPair] = useState<string>("BTC/USDT");
  const [config, setConfig] = useState<LadderConfig>(DEFAULT_CONFIG);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [flash, setFlash] = useState<string | null>(null);

  const secret = existingBot?.webhookSecret || "BULL_LAB_VAPI_LADDER";
  const ticker = pair.includes("ETH") ? "ETHUSDT" : "BTCUSDT";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vapi-ladder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair, bars: 180, ...config }),
      });
      const json = await res.json();
      if (json.success) setData(json);
    } catch (error) {
      console.error("VAPI ladder load error:", error);
    } finally {
      setLoading(false);
    }
  }, [pair, config]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair]);

  const stats = data?.stats;
  const state = data?.state;
  const events: any[] = data?.events ?? [];
  const cycles: any[] = data?.cycles ?? [];
  const equityCurve: any[] = data?.equityCurve ?? [];
  const series: any[] = data?.series ?? [];

  const pineScript = useMemo(
    () =>
      generateLadderPineScript({
        config,
        secret,
        ticker,
        qtyPerRung: config.multipliers.map((multiplier) => {
          const price = state?.price || (pair.includes("ETH") ? 2480 : 84250);
          return Math.round(((config.baseSizeUsdt * multiplier) / price) * 1e6) / 1e6;
        }),
      }),
    [config, secret, ticker, state?.price, pair]
  );

  const copyScript = async () => {
    await navigator.clipboard.writeText(pineScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const downloadScript = () => {
    const blob = new Blob([pineScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bull-lab-vapi-ladder-3h-${ticker}.pine`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await onPublishBot({
        name: `Bull Lab VAPI Ladder 3H ${pair.split("/")[0]}`,
        pair,
        strategyKey: "vapi_ladder",
        timeframe: "3h",
        platform: "hyperliquid_dex",
        mode: "paper",
        leverage: 1,
        orderSizeUsdt: config.baseSizeUsdt,
        stopLossPct: 0,
        takeProfitPct: 22,
        trailingStopPct: 0,
        config: {
          indicator: "VAPI_LazyBear",
          strategy: "VAPI_LADDER_3H",
          timeframe: "3h",
          ...config,
          gateLevels: true,
          buyLevels: config.levels,
          sellPlans: config.plans,
          ladderState: { buys: 0, sells: 0, lastBuyCandle: null, qty: 0, invested: 0 },
        },
      });
      setFlash("Bot VAPI Ladder pubblicato. Trovi il webhook secret nel cruscotto.");
      setTimeout(() => setFlash(null), 6000);
    } finally {
      setPublishing(false);
    }
  };

  const updatePlan = (key: string, index: number, field: keyof LadderTarget, value: number) => {
    setConfig((prev) => ({
      ...prev,
      plans: {
        ...prev.plans,
        [key]: prev.plans[key].map((target, i) =>
          i === index ? { ...target, [field]: value } : target
        ),
      },
    }));
  };

  // equity chart geometry
  const equityGeom = useMemo(() => {
    if (!equityCurve.length) return null;
    const values = equityCurve.map((p) => p.equity);
    const min = Math.min(...values) * 0.998;
    const max = Math.max(...values) * 1.002;
    const range = Math.max(1, max - min);
    const pts = equityCurve.map((p, i) => {
      const x = (i / Math.max(1, equityCurve.length - 1)) * 700;
      const y = 130 - ((p.equity - min) / range) * 110;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { line: pts.join(" "), area: `0,130 ${pts.join(" ")} 700,130`, min, max };
  }, [equityCurve]);

  // VAPI mini chart geometry
  const vapiGeom = useMemo(() => {
    if (!series.length) return null;
    const maxAbs = Math.max(25, Math.ceil(Math.max(...series.map((p) => Math.abs(p.va))) / 5) * 5);
    return { maxAbs };
  }, [series]);

  const sellPlan = state?.buys > 0 ? config.plans[String(state.buys)] ?? [] : [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#101a2b] via-[#091120] to-[#1d1408] border border-amber-500/30 shadow-2xl overflow-hidden">
        <div className="absolute -top-16 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold uppercase mb-3">
              <Layers className="w-3.5 h-3.5" />
              Strategia richiesta · VAPI + Martingala · 6 Regole
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              VAPI Ladder 3H{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-cyan-400">
                Martingale
              </span>
            </h1>
            <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Non è complicata: è una scala a tre gradini sull&apos;oscillatore VAPI, con size martingala, un solo
              acquisto per candela e per scaglione, e uscite progressive in base al numero di buy a mercato. Nessuno
              stop loss. Tutte le 6 regole sono implementate nel motore, nel backtest, nel Pine Script e nel gate del
              webhook.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["1 buy / candela", "1 buy / scaglione", "1x · 1,5x · 2,5x", "no stop loss", "uscite 50% · 50% · 100%"].map((chip) => (
                <span key={chip} className="px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-slate-300">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* LIVE STATE CARD */}
          <div className="cyber-card rounded-2xl p-5 border border-cyan-500/40 min-w-[280px] space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Stato scala live
              </span>
              <span className="text-slate-500">{state?.time ?? "--:--"}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] text-slate-500 font-mono">VAPI</div>
                <div className={`text-3xl font-black font-mono ${(state?.va ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {(state?.va ?? 0) > 0 ? "+" : ""}
                  {(state?.va ?? 0).toFixed(2)}
                </div>
              </div>
              <div className="flex gap-1">
                {config.levels.map((level, index) => {
                  const filled = state?.rungs?.[index]?.filled;
                  return (
                    <div
                      key={level}
                      className={`w-8 h-12 rounded-lg border flex flex-col items-center justify-end pb-1 text-[9px] font-mono ${
                        filled
                          ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                          : (state?.va ?? 0) <= level
                          ? "bg-amber-950/60 border-amber-500/60 text-amber-300 animate-pulse"
                          : "bg-slate-900 border-slate-700 text-slate-500"
                      }`}
                    >
                      <span>{config.multipliers[index]}x</span>
                      <span className="font-bold">{level}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <div className="p-1.5 rounded bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Buy a mercato</div>
                <div className="text-cyan-300 font-bold">{state?.buys ?? 0} / {config.maxBuys}</div>
              </div>
              <div className="p-1.5 rounded bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Investito</div>
                <div className="text-white font-bold">${(state?.investedUsdt ?? 0).toLocaleString()}</div>
              </div>
              <div className="p-1.5 rounded bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Prossimo buy</div>
                <div className="text-emerald-400 font-bold">
                  {state?.nextRung ? `≤ ${state.nextRung.level} (${state.nextRung.sizeUsdt}$)` : "ladder piena"}
                </div>
              </div>
              <div className="p-1.5 rounded bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Prossima vendita</div>
                <div className="text-amber-300 font-bold">
                  {state?.nextTarget ? `≥ ${state.nextTarget.level} (${state.nextTarget.fractionPct}%)` : state?.sellsStarted ? "in chiusura" : "—"}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>PnL aperto</span>
              <span className={(state?.unrealizedUsdt ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {(state?.unrealizedUsdt ?? 0) >= 0 ? "+" : ""}${state?.unrealizedUsdt ?? 0} ({state?.unrealizedPct ?? 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RULES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {RULES.map((rule) => (
          <div key={rule.n} className="cyber-card rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-black font-mono flex items-center justify-center">
                {rule.n}
              </span>
              <span className="text-xs font-bold text-white">{rule.title}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">{rule.text}</p>
          </div>
        ))}
      </div>

      {flash && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {flash}
        </div>
      )}

      {/* CONFIG + LADDER */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="cyber-card rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Crosshair className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono">Parametri strategia</h3>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400">Asset</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {["BTC/USDT", "ETH/USDT"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPair(p)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    pair === p
                      ? p.includes("ETH")
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                      : "bg-[#06090e] text-slate-400 border-slate-800"
                  }`}
                >
                  {p.split("/")[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400">Base size (USDT) — R3</label>
            <input
              type="number"
              step="50"
              value={config.baseSizeUsdt}
              onChange={(e) => setConfig((prev) => ({ ...prev, baseSizeUsdt: Number(e.target.value) }))}
              className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
            />
            <div className="mt-1 flex gap-1 text-[10px] font-mono">
              {config.multipliers.map((m, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                  #{i + 1} {m}x = {Math.round(config.baseSizeUsdt * m)}$
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400">Livelli buy (R4) e moltiplicatori (R3)</label>
            <div className="mt-1 space-y-1.5">
              {config.levels.map((level, index) => (
                <div key={index} className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={level}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        levels: prev.levels.map((l, i) => (i === index ? Number(e.target.value) : l)),
                      }))
                    }
                    className="bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-300 font-bold"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={config.multipliers[index]}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        multipliers: prev.multipliers.map((m, i) => (i === index ? Number(e.target.value) : m)),
                      }))
                    }
                    className="bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-amber-300 font-bold"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-mono text-slate-400">Capitale $</label>
              <input
                type="number"
                step="500"
                value={config.capital}
                onChange={(e) => setConfig((prev) => ({ ...prev, capital: Number(e.target.value) }))}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400">Fee %</label>
              <input
                type="number"
                step="0.005"
                value={config.feePct}
                onChange={(e) => setConfig((prev) => ({ ...prev, feePct: Number(e.target.value) }))}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              />
            </div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-xs flex items-center justify-center gap-2 glow-cyan-sm disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? "Simulazione in corso..." : "ESEGUI BACKTEST SCALA"}
          </button>

          <button
            onClick={publish}
            disabled={publishing}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold text-xs flex items-center justify-center gap-2 glow-orange-sm disabled:opacity-50"
          >
            <Bot className="w-4 h-4" />
            {publishing ? "Pubblicazione..." : "PUBBLICA BOT VAPI LADDER 3H"}
          </button>
        </div>

        {/* LADDER VISUAL + SELL PLAN */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BUY LADDER */}
            <div className="cyber-card rounded-2xl p-5 border border-emerald-500/25">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-emerald-400" /> Scala acquisti (R4 · R5)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">riempimento in ordine</span>
              </div>
              <div className="mt-3 space-y-2">
                {config.levels.map((level, index) => {
                  const rung = state?.rungs?.[index];
                  const filled = Boolean(rung?.filled);
                  const eligible = !filled && (state?.buys ?? 0) === index && !state?.sellsStarted;
                  const reached = (state?.va ?? 0) <= level;
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        filled
                          ? "bg-emerald-950/50 border-emerald-500/50"
                          : eligible
                          ? "bg-amber-950/30 border-amber-500/50"
                          : "bg-[#06090e] border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black font-mono border ${
                          filled ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-900 border-slate-700 text-slate-400"
                        }`}>
                          {filled ? <Check className="w-4 h-4" /> : index + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white font-mono">
                            VAPI ≤ {level} · {config.multipliers[index]}x
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {Math.round(config.baseSizeUsdt * config.multipliers[index])} USDT
                            {filled && rung?.filledTime ? ` · fill ${rung.filledTime} @ $${rung.filledPrice}` : ""}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                        filled
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : reached
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-900 text-slate-500 border-slate-700"
                      }`}>
                        {filled ? "FILLED" : reached ? "IN ZONA" : "ATTESA"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-500">
                R2: un solo buy per candela 3H {state?.candlesUntilNextBuy === 1 && (state?.buys ?? 0) > 0 ? "· candela già usata" : ""}
              </div>
            </div>

            {/* SELL PLAN */}
            <div className="cyber-card rounded-2xl p-5 border border-amber-500/25">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-amber-400" /> Piano uscite (R6)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {state?.buys ? `con ${state.buys} buy` : "in attesa"}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {[3, 2, 1].map((count) => {
                  const active = (state?.buys ?? 0) === count;
                  return (
                    <div
                      key={count}
                      className={`p-2.5 rounded-xl border ${active ? "bg-amber-950/30 border-amber-500/50" : "bg-[#06090e] border-slate-800"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold font-mono ${active ? "text-amber-300" : "text-slate-400"}`}>
                          {count} buy
                        </span>
                        {active && <span className="text-[9px] font-mono text-emerald-400">PIANO ATTIVO</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {config.plans[String(count)].map((target, index) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300"
                          >
                            {target.fractionPct}% @ VAPI ≥ {target.level}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {sellPlan.length > 0 && (
                <div className="mt-3 p-2 rounded-lg bg-[#06090e] border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 mb-1">Personalizza piano {state?.buys} buy</div>
                  {sellPlan.map((target, index) => (
                    <div key={index} className="grid grid-cols-2 gap-1.5 mt-1">
                      <input
                        type="number"
                        step="1"
                        value={target.level}
                        onChange={(e) => updatePlan(String(state?.buys), index, "level", Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-amber-300"
                      />
                      <input
                        type="number"
                        step="5"
                        value={target.fractionPct}
                        onChange={(e) => updatePlan(String(state?.buys), index, "fractionPct", Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-cyan-300"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "PnL totale", value: `${(stats?.totalPnlUsdt ?? 0) >= 0 ? "+" : ""}$${stats?.totalPnlUsdt ?? 0}`, sub: `${stats?.totalPnlPct ?? 0}%`, tone: (stats?.totalPnlUsdt ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400" },
              { label: "Realizzato", value: `$${stats?.realizedUsdt ?? 0}`, sub: `${stats?.cyclesClosed ?? 0} cicli`, tone: "text-cyan-400" },
              { label: "Aperto", value: `$${stats?.unrealizedUsdt ?? 0}`, sub: stats?.openCycle ? "posizione in corso" : "flat", tone: "text-amber-400" },
              { label: "Win rate cicli", value: `${stats?.winRate ?? 0}%`, sub: `${stats?.winningCycles ?? 0}W / ${stats?.losingCycles ?? 0}L`, tone: "text-emerald-400" },
              { label: "Max drawdown", value: `-${stats?.maxDrawdown ?? 0}%`, sub: `peak $${stats?.peakInvested?.toLocaleString() ?? 0}`, tone: "text-rose-400" },
              { label: "Buy / Sell", value: `${stats?.totalBuys ?? 0} / ${stats?.totalSells ?? 0}`, sub: `fee $${stats?.totalFees ?? 0}`, tone: "text-white" },
            ].map((item) => (
              <div key={item.label} className="cyber-card rounded-xl p-3 border border-slate-800">
                <div className="text-[9px] font-mono uppercase text-slate-500">{item.label}</div>
                <div className={`text-base font-black mt-0.5 ${item.tone}`}>{item.value}</div>
                <div className="text-[9px] font-mono text-slate-500">{item.sub}</div>
              </div>
            ))}
          </div>

          {/* EQUITY + VAPI CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="cyber-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase font-mono">Equity marked-to-market</h4>
              </div>
              <div className="mt-3 h-[150px] bg-[#05080d] rounded-xl border border-slate-800 p-2">
                <svg viewBox="0 0 700 130" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ladderEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {equityGeom && (
                    <>
                      <polygon points={equityGeom.area} fill="url(#ladderEquity)" />
                      <polyline points={equityGeom.line} fill="none" stroke="#22c55e" strokeWidth="2" />
                    </>
                  )}
                </svg>
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] font-mono text-slate-500">
                <span>Start ${stats?.initialCapital?.toLocaleString()}</span>
                <span className="text-emerald-400 font-bold">Equity ${stats?.equity?.toLocaleString()}</span>
              </div>
            </div>

            <div className="cyber-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase font-mono">VAPI 3H + livelli</h4>
                </div>
                <span className="text-[10px] font-mono text-slate-500">{pair}</span>
              </div>
              <div className="mt-3 h-[150px] bg-[#05080d] rounded-xl border border-slate-800 p-2">
                <svg viewBox="0 0 700 130" className="w-full h-full" preserveAspectRatio="none">
                  {vapiGeom && series.length > 0 && (
                    <>
                      {[-vapiGeom.maxAbs, 0].map((lvl, i) => (
                        <line key={`neg${i}`} x1="0" y1={65 - (lvl / vapiGeom.maxAbs) * 55} x2="700" y2={65 - (lvl / vapiGeom.maxAbs) * 55} stroke="#1e293b" strokeDasharray="3 3" />
                      ))}
                      {config.levels.map((level, i) => (
                        <line key={`buy${i}`} x1="0" y1={65 - (level / vapiGeom.maxAbs) * 55} x2="700" y2={65 - (level / vapiGeom.maxAbs) * 55} stroke="#10b981" strokeDasharray="5 4" opacity={0.7} />
                      ))}
                      <line x1="0" y1={65 - (12 / vapiGeom.maxAbs) * 55} x2="700" y2={65 - (12 / vapiGeom.maxAbs) * 55} stroke="#f59e0b" strokeDasharray="2 4" />
                      {series.map((point, i) => {
                        const x = (i / Math.max(1, series.length - 1)) * 700;
                        const y = 65 - (point.va / vapiGeom.maxAbs) * 55;
                        return <circle key={i} cx={x} cy={y} r="1.3" fill={point.va >= 0 ? "#22c55e" : "#f43f5e"} opacity="0.85" />;
                      })}
                    </>
                  )}
                </svg>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[9px] font-mono text-slate-500">
                <span className="text-emerald-400">— livelli buy {config.levels.join(" / ")}</span>
                <span className="text-amber-400">— primo target vendita</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EVENTS + CYCLES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 cyber-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase font-mono">Esecuzioni scala ({events.length})</h4>
            </div>
            <span className="text-[10px] font-mono text-slate-500">size · livello · VAPI · PnL</span>
          </div>
          <div className="mt-2 max-h-[330px] overflow-auto">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="bg-[#070b12] text-slate-400 sticky top-0">
                <tr>
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Tipo</th>
                  <th className="py-2 px-2">Candela</th>
                  <th className="py-2 px-2">VAPI</th>
                  <th className="py-2 px-2">Livello</th>
                  <th className="py-2 px-2">Prezzo</th>
                  <th className="py-2 px-2">Size</th>
                  <th className="py-2 px-2">PnL</th>
                  <th className="py-2 px-2">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {events.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Nessun fill nel periodo: il VAPI non è ancora sceso sotto i livelli configurati.
                    </td>
                  </tr>
                )}
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-800/30">
                    <td className="py-1.5 px-2 text-slate-500">{event.id}</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        event.type === "BUY"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-950 text-amber-300 border border-amber-500/30"
                      }`}>
                        {event.type}{event.rung ? ` #${event.rung}` : ""}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-slate-400">{event.time}</td>
                    <td className={`py-1.5 px-2 font-bold ${event.va >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {event.va > 0 ? "+" : ""}{event.va}
                    </td>
                    <td className="py-1.5 px-2 text-slate-400">{event.level}</td>
                    <td className="py-1.5 px-2 text-slate-300">${event.price.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-slate-300">${event.sizeUsdt.toLocaleString()}</td>
                    <td className={`py-1.5 px-2 font-bold ${event.pnlUsdt == null ? "text-slate-600" : event.pnlUsdt >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {event.pnlUsdt == null ? "—" : `${event.pnlUsdt >= 0 ? "+" : ""}$${event.pnlUsdt}`}
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 max-w-[220px] truncate" title={event.note}>{event.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cyber-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase font-mono">Cicli completati</h4>
          </div>
          <div className="mt-2 space-y-1.5 max-h-[330px] overflow-auto pr-1">
            {cycles.length === 0 && <p className="text-[11px] text-slate-500 font-mono text-center py-6">Nessun ciclo.</p>}
            {cycles.map((cycle) => (
              <div key={cycle.id} className="p-2 rounded-lg bg-[#06090e] border border-slate-800 text-[10px] font-mono">
                <div className="flex items-center justify-between">
                  <span className={cycle.status === "OPEN" ? "text-cyan-300 font-bold" : cycle.realizedUsdt >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    #{cycle.id} {cycle.status === "OPEN" ? "APERTO" : `${cycle.realizedUsdt >= 0 ? "+" : ""}$${cycle.realizedUsdt}`}
                  </span>
                  <span className="text-slate-500">{cycle.buys} buy · {cycle.durationBars} barre</span>
                </div>
                <div className="mt-0.5 text-slate-500">
                  avg ${cycle.avgEntry?.toLocaleString()} · investito ${cycle.investedUsdt?.toLocaleString()}
                  {cycle.exitAvg ? ` · exit $${cycle.exitAvg?.toLocaleString()}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PINE */}
      <div className="cyber-card rounded-2xl p-5 border border-amber-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Pine Script v5 — VAPI Ladder 3H (6 regole)
            </h4>
            <p className="text-[11px] text-slate-400">
              Rungs con size dedicate, blocco di un buy per candela/scaglione, piani di uscita a percentuale e alert JSON
              con valore VAPI, rung e percentuale di chiusura.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-300">
              BUY · appena tocca il livello (intrabar)
            </div>
            <div className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300">
              SELL · solo a chiusura candela 3H
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={copyScript} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiato!" : "Copia"}
            </button>
            <button onClick={downloadScript} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
              <Download className="w-3.5 h-3.5" /> .pine
            </button>
          </div>
        </div>
        <textarea
          readOnly
          rows={12}
          value={pineScript}
          className="mt-3 w-full bg-[#05080d] border border-slate-800 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 select-all focus:outline-none focus:border-amber-500/50"
        />
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
          <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">Ticker {ticker}</span>
          <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">Secret {secret}</span>
          <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">TF 180 (3H)</span>
          <span className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
            Buy intrabar · Sell close
          </span>
          <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
            Buy alert: Once Per Bar · Sell alert: Once Per Bar Close
          </span>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200/90">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="mb-1.5">
          <strong className="text-white">Trigger:</strong> i buy scattano intrabar appena il VAPI tocca il gradino (il
          backtest qui sopra, per semplicità, valuta i fill sulla chiusura delle candele); i sell vengono sempre valutati
          sul VAPI di chiusura della candela 3H. Resta valido il limite di 1 buy per candela.
        </p>
        <p>
          La martingala aumenta l&apos;esposizione ad ogni gradino e la regola 1 esclude lo stop loss: il rischio è la
          permanenza a mercato (anche lunga) con size crescente, non il singolo trade. Poiché tutte le uscite avvengono
          solo in profitto, i cicli chiusi risultano per costruzione vincenti: il vero indicatore di rischio è il{" "}
          <strong>peak invested</strong> (esposizione massima) e il tempo di recupero nelle fasi di distribuzione. Mantieni
          la base size entro il 2–5% del capitale per scaglione, verifica la capienza del margine sull&apos;exchange
          (leva 1x consigliata, leva composta inutile con questa scala) e usa il kill-switch della dashboard per chiudere
          tutto manualmente.
        </p>
      </div>
    </div>
  );
}
