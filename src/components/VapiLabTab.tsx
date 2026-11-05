"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Crosshair,
  Download,
  ExternalLink,
  Flame,
  Gauge,
  Info,
  Layers,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { VapiConfig, VapiZone } from "@/lib/vapi";
import { generateVapiPineScript } from "@/lib/vapi-pine";

const LEVEL_PRESETS = [
  {
    key: "balanced",
    name: "Balanced 3H",
    tag: "Consigliato",
    description: "Incroci di soglia ±10 con uscite a ±2: massimo equilibrio tra frequenza e qualità dei segnali.",
    longEntry: 10,
    longExit: -2,
    shortEntry: -10,
    shortExit: 2,
    confirmation: 1,
  },
  {
    key: "conservative",
    name: "Conservative 3H",
    tag: "Poche operazioni",
    description: "Serve un accumulo/distribuzione più forte (±18) più 2 barre di conferma: meno trade, più selettivi.",
    longEntry: 18,
    longExit: 0,
    shortEntry: -18,
    shortExit: 0,
    confirmation: 2,
  },
  {
    key: "aggressive",
    name: "Aggressive 3H",
    tag: "Alta frequenza",
    description: "Soglie anticipate (±5) per catturare l'inizio del flusso: più segnali e più rumore, richiede filtri.",
    longEntry: 5,
    longExit: -5,
    shortEntry: -5,
    shortExit: 5,
    confirmation: 1,
  },
  {
    key: "extreme",
    name: "Extreme Reversal",
    tag: "Mean reversion",
    description: "Entra solo su pressioni estreme (±28) per catturare esaurimenti di volume e rimbalzi violenti.",
    longEntry: 28,
    longExit: 5,
    shortEntry: -28,
    shortExit: -5,
    confirmation: 1,
  },
];

interface VapiLabTabProps {
  onCreateVapiBot: (payload: {
    name: string;
    pair: string;
    strategyKey: string;
    timeframe: string;
    leverage: number;
    stopLossPct: number;
    takeProfitPct: number;
    config: Record<string, unknown>;
    orderSizeUsdt: number;
  }) => void;
  bots: { id: number; name: string; webhookSecret: string; strategyKey: string }[];
}

export default function VapiLabTab({ onCreateVapiBot, bots }: VapiLabTabProps) {
  const [pair, setPair] = useState<string>("BTC/USDT");
  const [config, setConfig] = useState<VapiConfig>({
    length: 10,
    longEntry: 10,
    longExit: -2,
    shortEntry: -10,
    shortExit: 2,
    confirmation: 1,
    extremeLevel: 45,
    stopLossPct: 2.5,
    takeProfitPct: 6.5,
    leverage: 3,
    capital: 10000,
    allocationPct: 25,
    feePct: 0.035,
  });
  const [activePreset, setActivePreset] = useState<string>("balanced");
  const [data, setData] = useState<any>(null);
  const [liveSeries, setLiveSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const vapiBot = bots.find((b) => b.strategyKey === "vapi_lazybear");
  const secret = vapiBot?.webhookSecret || "VAPI_3H_SECRET";
  const ticker = pair.includes("ETH") ? "ETHUSDT" : "BTCUSDT";
  const qty = pair.includes("ETH") ? 0.8 : 0.05;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        pair,
        length: String(config.length),
        longEntry: String(config.longEntry),
        longExit: String(config.longExit),
        shortEntry: String(config.shortEntry),
        shortExit: String(config.shortExit),
        confirmation: String(config.confirmation),
        extremeLevel: String(config.extremeLevel),
        stopLossPct: String(config.stopLossPct),
        takeProfitPct: String(config.takeProfitPct),
        leverage: String(config.leverage),
        capital: String(config.capital),
        allocationPct: String(config.allocationPct),
        feePct: String(config.feePct),
      });
      const [liveRes, btRes] = await Promise.all([
        fetch(`/api/vapi?${query.toString()}`),
        fetch("/api/vapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pair, ...config }),
        }),
      ]);
      const liveJson = await liveRes.json();
      const btJson = await btRes.json();
      if (liveJson.success) {
        setLiveSeries(liveJson.liveSeries ?? []);
        setData(liveJson);
      }
      if (btJson.success) {
        setData((prev: any) => ({ ...(prev ?? {}), stats: btJson.stats, trades: btJson.trades, equityCurve: btJson.equityCurve, crossings: btJson.crossings, current: btJson.current ?? prev?.current }));
      }
    } catch (error) {
      console.error("VAPI load error:", error);
    } finally {
      setLoading(false);
    }
  }, [pair, config]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair]);

  const applyPreset = (preset: (typeof LEVEL_PRESETS)[number]) => {
    setActivePreset(preset.key);
    setConfig((prev) => ({
      ...prev,
      longEntry: preset.longEntry,
      longExit: preset.longExit,
      shortEntry: preset.shortEntry,
      shortExit: preset.shortExit,
      confirmation: preset.confirmation,
    }));
  };

  const pineScript = useMemo(
    () =>
      generateVapiPineScript({
        secret,
        ticker,
        length: config.length,
        longEntry: config.longEntry,
        longExit: config.longExit,
        shortEntry: config.shortEntry,
        shortExit: config.shortExit,
        confirmation: config.confirmation,
        stopLossPct: config.stopLossPct,
        takeProfitPct: config.takeProfitPct,
        trailingStopPct: 1.5,
        qty,
        capital: config.capital,
        leverage: config.leverage,
      }),
    [secret, ticker, config, qty]
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
    a.download = `bull-lab-vapi-3h-${ticker}.pine`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = data?.stats;
  const current = data?.current;
  const zone: VapiZone | undefined = current?.zone;
  const crossings = data?.crossings ?? [];
  const trades = data?.trades ?? [];
  const equityCurve = data?.equityCurve ?? [];

  const zoneColor = zone?.color ?? "#94a3b8";
  const vaValue = current?.va ?? 0;
  const gaugePct = Math.max(0, Math.min(100, ((vaValue + 100) / 200) * 100));

  // ------------------------------- HISTOGRAM ---------------------------------
  const chartWidth = 880;
  const chartHeight = 260;
  const plotTop = 16;
  const plotHeight = chartHeight - 48;
  const maxAbs = useMemo(() => {
    const abs = Math.max(50, ...liveSeries.map((p: any) => Math.abs(p.va)));
    return Math.ceil(abs / 10) * 10;
  }, [liveSeries]);
  const zeroY = plotTop + plotHeight / 2;
  const valueToY = (value: number) => zeroY - (value / maxAbs) * (plotHeight / 2);
  const barWidth = liveSeries.length ? Math.max(2, (chartWidth - 30) / liveSeries.length - 1.6) : 6;

  const equityPath = useMemo(() => {
    if (!equityCurve.length) return { line: "", area: "", min: 0, max: 0 };
    const values = equityCurve.map((p: any) => p.equity);
    const min = Math.min(...values) * 0.995;
    const max = Math.max(...values) * 1.005;
    const range = Math.max(1, max - min);
    const pts = equityCurve.map((p: any, i: number) => {
      const x = (i / Math.max(1, equityCurve.length - 1)) * 700;
      const y = 120 - ((p.equity - min) / range) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return {
      line: pts.join(" "),
      area: `0,120 ${pts.join(" ")} 700,120`,
      min,
      max,
    };
  }, [equityCurve]);

  const numberField = (
    label: string,
    key: keyof VapiConfig,
    step = 1,
    hint?: string
  ) => (
    <div>
      <label className="text-[11px] font-mono text-slate-400 flex items-center justify-between gap-1">
        <span>{label}</span>
        {hint && <span className="text-slate-600">{hint}</span>}
      </label>
      <input
        type="number"
        step={step}
        value={config[key] as number}
        onChange={(event) =>
          setConfig((prev) => ({ ...prev, [key]: Number(event.target.value) }))
        }
        className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
      />
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#0a1524] via-[#08101c] to-[#1a1309] border border-cyan-500/30 shadow-2xl overflow-hidden">
        <div className="absolute -top-10 right-0 w-96 h-96 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold uppercase mb-3">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              Strategia Principale · Timeframe 3H · Volume Weighted
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              VAPI 3H Pressure Matrix{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">
                [LazyBear]
              </span>
            </h1>
            <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Il motore opera esclusivamente su <strong className="text-white">candele a 3 ore</strong> e scatta quando
              l&apos;oscillatore VAPI attraversa i tuoi livelli di accumulazione/distribuzione. Ogni parametro è
              personalizzabile e viene replicato 1:1 nel Pine Script generato e nel gate di validazione del webhook.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300">
                VAPI = 100 × Σ(volume·x, length) / Σ(volume, length)
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300">
                x = (2·close − high − low) / (high − low)
              </span>
              <a
                href="https://it.tradingview.com/v/kVk6pN9z/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1"
              >
                Script originale TradingView <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* LIVE GAUGE */}
          <div className="cyber-card rounded-2xl p-5 border min-w-[268px]" style={{ borderColor: `${zoneColor}66` }}>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase text-slate-400">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" style={{ color: zoneColor }} />
                VAPI Live · 3H
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {current?.time ?? "--:--"}
              </span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-black font-mono" style={{ color: zoneColor }}>
                {vaValue >= 0 ? "+" : ""}
                {vaValue.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 font-mono mb-1.5">/ ±100</span>
            </div>
            <div className="mt-1 text-xs font-bold" style={{ color: zoneColor }}>
              {zone?.label ?? "Calcolo..."}
            </div>

            {/* Gauge bar with thresholds */}
            <div className="mt-3 relative h-3 rounded-full bg-slate-800 overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-rose-600/40 to-slate-700/10" />
              <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-emerald-600/40 to-slate-700/10" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500" />
              <div
                className="absolute inset-y-0 w-px bg-rose-400"
                style={{ left: `${((config.shortEntry + 100) / 200) * 100}%` }}
              />
              <div
                className="absolute inset-y-0 w-px bg-emerald-400"
                style={{ left: `${((config.longEntry + 100) / 200) * 100}%` }}
              />
              <div
                className="absolute -top-0.5 h-4 w-1 rounded bg-white shadow-lg"
                style={{ left: `calc(${gaugePct}% - 2px)` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-mono text-slate-500">
              <span className="text-rose-400">SHORT ≤ {config.shortEntry}</span>
              <span className="text-emerald-400">LONG ≥ {config.longEntry}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Distanza LONG</div>
                <div className="text-emerald-400 font-bold">
                  {current?.distanceToLongEntry != null ? `${current.distanceToLongEntry > 0 ? "+" : ""}${current.distanceToLongEntry}` : "--"} pt
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Distanza SHORT</div>
                <div className="text-rose-400 font-bold">
                  {current?.distanceToShortEntry != null ? `${current.distanceToShortEntry > 0 ? "+" : ""}${current.distanceToShortEntry}` : "--"} pt
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRESETS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase font-mono">Preset Livelli VAPI · Timeframe 3H</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {LEVEL_PRESETS.map((preset) => {
            const active = activePreset === preset.key;
            return (
              <button
                key={preset.key}
                onClick={() => applyPreset(preset)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  active
                    ? "bg-cyan-500/10 border-cyan-500/60 glow-cyan-sm"
                    : "cyber-card border-slate-800 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{preset.name}</span>
                  {active ? (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {preset.tag}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/30">
                    L {preset.longEntry >= 0 ? "+" : ""}{preset.longEntry}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-400 border border-rose-500/30">
                    S {preset.shortEntry}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                    conf {preset.confirmation} barre
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-400 leading-snug">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONFIG + CHART */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* CONFIG PANEL */}
        <div className="cyber-card rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono">Impostazioni Ordini</h3>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400">Asset / Coppia</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => setPair("BTC/USDT")}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  pair === "BTC/USDT"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-[#06090e] text-slate-400 border-slate-800"
                }`}
              >
                BTC
              </button>
              <button
                onClick={() => setPair("ETH/USDT")}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  pair === "ETH/USDT"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "bg-[#06090e] text-slate-400 border-slate-800"
                }`}
              >
                ETH
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Livelli LONG
            </div>
            <div className="grid grid-cols-2 gap-2">
              {numberField("Entry ≥", "longEntry", 0.5)}
              {numberField("Exit ≤", "longExit", 0.5)}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase text-rose-400 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Livelli SHORT
            </div>
            <div className="grid grid-cols-2 gap-2">
              {numberField("Entry ≤", "shortEntry", 0.5)}
              {numberField("Exit ≥", "shortExit", 0.5)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {numberField("Length VAPI", "length", 1, "barre")}
            {numberField("Conferma", "confirmation", 1, "barre")}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {numberField("Liv. estremo", "extremeLevel", 1)}
            {numberField("Allocazione %", "allocationPct", 5)}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="text-[10px] font-mono uppercase text-amber-400 flex items-center gap-1">
              <ShieldIcon /> Risk management
            </div>
            <div className="grid grid-cols-2 gap-2">
              {numberField("Stop Loss %", "stopLossPct", 0.1)}
              {numberField("Take Profit %", "takeProfitPct", 0.1)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {numberField("Leva", "leverage", 1, "x")}
              {numberField("Capitale $", "capital", 500)}
            </div>
            {numberField("Fee taker %", "feePct", 0.005)}
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 glow-cyan-sm transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? "Ricalcolo VAPI..." : "APPLICA LIVELLI & BACKTEST 3H"}
          </button>

          <button
            onClick={() =>
              onCreateVapiBot({
                name: `Bull Lab VAPI 3H ${pair.split("/")[0]} · L${config.longEntry}/S${config.shortEntry}`,
                pair,
                strategyKey: "vapi_lazybear",
                timeframe: "3h",
                leverage: config.leverage,
                stopLossPct: config.stopLossPct,
                takeProfitPct: config.takeProfitPct,
                orderSizeUsdt: pair.includes("ETH") ? 500 : 750,
                config: {
                  indicator: "VAPI_LazyBear",
                  timeframe: "3h",
                  length: config.length,
                  longEntry: config.longEntry,
                  longExit: config.longExit,
                  shortEntry: config.shortEntry,
                  shortExit: config.shortExit,
                  confirmation: config.confirmation,
                  extremeLevel: config.extremeLevel,
                  allocationPct: config.allocationPct,
                  gateLevels: true,
                },
              })
            }
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 glow-orange-sm transition-all"
          >
            <Bot className="w-4 h-4" />
            PUBBLICA COME BOT 3H
          </button>
        </div>

        {/* CHART + STATS */}
        <div className="xl:col-span-3 space-y-6">
          <div className="cyber-card rounded-2xl p-5 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  VAPI Oscillator · 3H · {pair}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Accumulazione</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500" /> Distribuzione</span>
                <span className="flex items-center gap-1"><span className="w-3 h-px bg-emerald-400" /> Entry LONG</span>
                <span className="flex items-center gap-1"><span className="w-3 h-px bg-rose-400" /> Entry SHORT</span>
              </div>
            </div>

            <div className="mt-3 relative w-full bg-[#05080d] rounded-xl border border-slate-800/80 overflow-hidden">
              <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none" />
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[280px]" preserveAspectRatio="none">
                {/* zone shading */}
                <rect x="20" y={valueToY(maxAbs)} width={chartWidth - 80} height={zeroY - valueToY(maxAbs)} fill="#10b981" opacity="0.05" />
                <rect x="20" y={zeroY} width={chartWidth - 80} height={valueToY(-maxAbs) - zeroY} fill="#f43f5e" opacity="0.05" />

                {/* grid */}
                {[-maxAbs, -config.shortEntry, 0, config.longEntry, maxAbs].map((lvl, idx) => {
                  const y = valueToY(lvl);
                  const isEntry = lvl === config.shortEntry || lvl === config.longEntry;
                  return (
                    <g key={idx}>
                      <line
                        x1="20"
                        y1={y}
                        x2={chartWidth - 60}
                        y2={y}
                        stroke={isEntry ? (lvl > 0 ? "#10b981" : "#f43f5e") : "#1e293b"}
                        strokeDasharray={isEntry ? "6 4" : "3 3"}
                        strokeWidth="1"
                      />
                      <text x={chartWidth - 55} y={y + 3} fill={isEntry ? (lvl > 0 ? "#34d399" : "#fb7185") : "#64748b"} fontSize="9" fontFamily="monospace">
                        {lvl > 0 ? "+" : ""}{lvl.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* bars */}
                {liveSeries.map((point: any, i: number) => {
                  const x = 24 + i * (chartWidth - 90) / Math.max(1, liveSeries.length);
                  const y = valueToY(point.va);
                  const h = Math.max(1.5, Math.abs(y - zeroY));
                  const positive = point.va >= 0;
                  const isExtreme = Math.abs(point.va) >= Math.max(Math.abs(config.longEntry), Math.abs(config.shortEntry));
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={Math.min(y, zeroY)}
                      width={barWidth}
                      height={h}
                      fill={positive ? "#10b981" : "#f43f5e"}
                      opacity={isExtreme ? 0.95 : 0.55}
                      rx="1"
                    />
                  );
                })}

                {/* threshold crossing markers */}
                {crossings.slice(0, 6).map((cross: any, idx: number) => {
                  const matchIndex = liveSeries.findIndex((p: any) => p.time === cross.time);
                  if (matchIndex < 0) return null;
                  const x = 24 + matchIndex * (chartWidth - 90) / Math.max(1, liveSeries.length) + barWidth / 2;
                  const y = valueToY(cross.va) + (cross.type.includes("LONG") ? 12 : -12);
                  return (
                    <g key={`${cross.id}-${idx}`}>
                      <circle cx={x} cy={y} r="3.5" fill={cross.type.includes("LONG") ? "#00d2ff" : "#ff6b00"} />
                      <line x1={x} y1={y} x2={x} y2={valueToY(cross.va)} stroke={cross.type.includes("LONG") ? "#00d2ff" : "#ff6b00"} strokeWidth="1" opacity="0.6" />
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Length VAPI</div>
                <div className="text-white font-bold">{config.length} barre 3H</div>
              </div>
              <div className="p-2 rounded-lg bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Money Flow medio</div>
                <div className="text-cyan-300 font-bold">
                  {data?.series?.length ? (data.series.reduce((acc: number, p: any) => acc + p.moneyFlow, 0) / data.series.length).toFixed(3) : "--"}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Conferme richieste</div>
                <div className="text-amber-300 font-bold">{config.confirmation} barre</div>
              </div>
              <div className="p-2 rounded-lg bg-[#06090e] border border-slate-800">
                <div className="text-slate-500">Prossima candela 3H</div>
                <div className="text-slate-300 font-bold">chiusura bucket</div>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="cyber-card rounded-xl p-4 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Net Profit</div>
              <div className={`text-xl font-black mt-1 ${(stats?.netProfitUsdt ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {(stats?.netProfitUsdt ?? 0) >= 0 ? "+" : ""}${stats?.netProfitUsdt ?? 0}
              </div>
              <div className="text-[10px] font-mono text-slate-500">{(stats?.netProfitPct ?? 0).toFixed(2)}% ROI</div>
            </div>
            <div className="cyber-card rounded-xl p-4 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Win Rate</div>
              <div className="text-xl font-black mt-1 text-cyan-400">{stats?.winRate ?? 0}%</div>
              <div className="text-[10px] font-mono text-slate-500">
                {stats?.winningTrades ?? 0}W / {stats?.losingTrades ?? 0}L
              </div>
            </div>
            <div className="cyber-card rounded-xl p-4 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Profit Factor</div>
              <div className="text-xl font-black mt-1 text-amber-400">{stats?.profitFactor ?? 0}</div>
              <div className="text-[10px] font-mono text-slate-500">VAPI medio entry {stats?.avgVaAtEntry ?? 0}</div>
            </div>
            <div className="cyber-card rounded-xl p-4 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Max Drawdown</div>
              <div className="text-xl font-black mt-1 text-rose-400">-{stats?.maxDrawdown ?? 0}%</div>
              <div className="text-[10px] font-mono text-slate-500">{stats?.totalTrades ?? 0} operazioni</div>
            </div>
          </div>

          {/* EQUITY + CROSSINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="cyber-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase font-mono">Equity Curve 3H</h4>
              </div>
              <div className="mt-3 h-[140px] bg-[#05080d] rounded-xl border border-slate-800 p-2">
                <svg viewBox="0 0 700 120" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="vapiEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#00d2ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {equityPath.line ? (
                    <>
                      <polygon points={equityPath.area} fill="url(#vapiEquity)" />
                      <polyline points={equityPath.line} fill="none" stroke="#00d2ff" strokeWidth="2.2" />
                    </>
                  ) : (
                    <text x="350" y="60" textAnchor="middle" fill="#475569" fontSize="11" fontFamily="monospace">
                      Attendi il primo segnale VAPI
                    </text>
                  )}
                </svg>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Start ${stats?.initialCapital?.toLocaleString() ?? config.capital.toLocaleString()}</span>
                <span className="text-emerald-400 font-bold">Now ${stats?.finalCapital?.toLocaleString() ?? config.capital.toLocaleString()}</span>
              </div>
            </div>

            <div className="cyber-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Radio className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase font-mono">Log Attraversamenti Livello</h4>
              </div>
              <div className="mt-2 max-h-[168px] overflow-y-auto space-y-1.5 pr-1">
                {crossings.length === 0 && (
                  <p className="text-[11px] text-slate-500 font-mono py-6 text-center">
                    Nessun attraversamento nel campione analizzato.
                  </p>
                )}
                {crossings.slice(0, 12).map((cross: any) => {
                  const bullish = cross.type.includes("LONG");
                  return (
                    <div key={cross.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#06090e] border border-slate-800 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bullish ? "bg-emerald-400" : "bg-rose-400"}`} />
                        <span className="text-slate-400 shrink-0">{cross.time}</span>
                        <span className={`truncate ${bullish ? "text-emerald-300" : "text-rose-300"}`}>{cross.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-500">${cross.price.toLocaleString()}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${bullish ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                          {cross.va > 0 ? "+" : ""}{cross.va}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TRADES */}
          <div className="cyber-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase font-mono">Esecuzioni Strategia VAPI 3H</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Fee applicate: {config.feePct}% · Esposizione ${stats?.exposureUsdt?.toLocaleString() ?? "-"}
              </span>
            </div>
            <div className="mt-2 overflow-x-auto max-h-[260px] overflow-y-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-[#070b12] text-slate-400 sticky top-0">
                  <tr>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Side</th>
                    <th className="py-2 px-2">Entry</th>
                    <th className="py-2 px-2">Exit</th>
                    <th className="py-2 px-2">VAPI entry</th>
                    <th className="py-2 px-2">Prezzo entry</th>
                    <th className="py-2 px-2">Prezzo exit</th>
                    <th className="py-2 px-2">PnL</th>
                    <th className="py-2 px-2">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trades.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-500">
                        Nessun trade con questi livelli: allarga le soglie o riduci la conferma.
                      </td>
                    </tr>
                  )}
                  {trades.map((trade: any) => {
                    const win = trade.pnlUsdt >= 0;
                    return (
                      <tr key={trade.id} className="hover:bg-slate-800/30">
                        <td className="py-1.5 px-2 text-slate-500">{trade.id}</td>
                        <td className="py-1.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${trade.side === "LONG" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" : "bg-rose-950 text-rose-400 border border-rose-500/30"}`}>
                            {trade.side}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-400">{trade.entryTime}</td>
                        <td className="py-1.5 px-2 text-slate-400">{trade.exitTime}</td>
                        <td className={`py-1.5 px-2 font-bold ${trade.vaAtEntry >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {trade.vaAtEntry > 0 ? "+" : ""}{trade.vaAtEntry}
                        </td>
                        <td className="py-1.5 px-2 text-slate-300">${trade.entryPrice.toLocaleString()}</td>
                        <td className="py-1.5 px-2 text-slate-300">${trade.exitPrice.toLocaleString()}</td>
                        <td className={`py-1.5 px-2 font-bold ${win ? "text-emerald-400" : "text-rose-400"}`}>
                          {win ? "+" : ""}${trade.pnlUsdt} ({trade.pnlPct > 0 ? "+" : ""}{trade.pnlPct}%)
                        </td>
                        <td className="py-1.5 px-2 text-slate-400">{trade.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* PINE SCRIPT + PLAYBOOK */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 cyber-card rounded-2xl p-5 border border-amber-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <h4 className="text-sm font-bold text-white">Pine Script v5 — VAPI 3H pronto da incollare</h4>
                <p className="text-[11px] text-slate-400">
                  Include livelli, conferme, SL/TP/trailing e alert JSON con il valore <code className="text-cyan-300">vapi</code> per la validazione server-side.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyScript} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold transition-all">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiato!" : "Copia"}
              </button>
              <button onClick={downloadScript} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all">
                <Download className="w-3.5 h-3.5" />
                .pine
              </button>
            </div>
          </div>
          <textarea
            readOnly
            rows={14}
            value={pineScript}
            className="mt-3 w-full bg-[#05080d] border border-slate-800 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 select-all focus:outline-none focus:border-amber-500/50"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500">
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">Ticker: {ticker}</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">Secret bot: {secret}</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">Timeframe: 180 (3H)</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">Alert: once_per_bar_close</span>
          </div>
        </div>

        <div className="cyber-card rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Info className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase font-mono">Playbook operativo 3H</h4>
          </div>
          <div className="space-y-2.5 text-[11px] text-slate-300 leading-relaxed">
            <p>
              <strong className="text-emerald-400">1. Accumulazione:</strong> il VAPI attraversa la soglia LONG (es. +10)
              verso l&apos;alto ⇒ il flusso volumetrico è compratore. Il bot apre LONG e segue la pressione.
            </p>
            <p>
              <strong className="text-cyan-400">2. Gestione:</strong> la posizione si chiude alla perdita della soglia di
              uscita (es. −2), a TP, SL o trailing stop. Un attraversamento opposto inverte il bias.
            </p>
            <p>
              <strong className="text-rose-400">3. Distribuzione:</strong> VAPI sotto −10 ⇒ pressione venditrice, il bot è
              SHORT. Sopra ±45 il flusso è estremo: evita nuovi ingressi in ritardo (filtro estremo).
            </p>
            <p>
              <strong className="text-amber-400">4. Perché il 3H:</strong> il VAPI è una media di volume: sul 15m produce
              rumore, sul daily arriva tardi. Il 3H filtra il rumore intrabar e lascia spazio a 2–4 segnali a settimana.
            </p>
            <p className="text-[10px] text-slate-500 border-t border-slate-800 pt-2">
              Nota tecnica: il volume è quello dell&apos;exchange selezionato su TradingView. Usa lo stesso feed (Hyperliquid /
              Bybit / OurBit) che il bot usa per l&apos;esecuzione, altrimenti il livello può divergere.
            </p>
          </div>
        </div>
      </div>

      {/* BACKTEST WARNING */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200/90">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          Il backtest utilizza serie OHLCV 3H ricostruite in modo deterministico e commissioni taker realistiche. Prima di
          attivare la modalità live, verifica i livelli sul feed esatto del tuo exchange e mantieni il bot in paper trading
          per almeno 30 candele 3H. Nessuna performance storica è garanzia di risultati futuri.
        </p>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return <Layers className="w-3 h-3" />;
}
