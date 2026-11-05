"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  TrendingUp,
  TrendingDown,
  Play,
  RotateCcw,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Bot,
  Flame,
  Layers,
} from "lucide-react";

interface BacktesterTabProps {
  onDeployAsBot: (params: any) => void;
}

export default function BacktesterTab({ onDeployAsBot }: BacktesterTabProps) {
  const [pair, setPair] = useState<string>("BTC/USDT");
  const [strategyType, setStrategyType] = useState<string>("bull_lab_confluence");
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [leverage, setLeverage] = useState<number>(5);
  const [stopLossPct, setStopLossPct] = useState<number>(2.5);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(6.5);
  const [emaFast, setEmaFast] = useState<number>(9);
  const [emaSlow, setEmaSlow] = useState<number>(21);
  const [rsiOversold, setRsiOversold] = useState<number>(30);
  const [rsiOverbought, setRsiOverbought] = useState<number>(70);

  const [loading, setLoading] = useState(false);
  const [backtestData, setBacktestData] = useState<any>(null);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair,
          strategyType,
          initialCapital,
          leverage,
          stopLossPct,
          takeProfitPct,
          emaFast,
          emaSlow,
          rsiOversold,
          rsiOverbought,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBacktestData(data);
      }
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run backtest on mount
  useEffect(() => {
    runBacktest();
  }, [pair, strategyType]);

  const stats = backtestData?.stats;
  const trades = backtestData?.trades || [];
  const equityCurve = backtestData?.equityCurve || [];

  // Equity Curve SVG calculation
  const minEquity = equityCurve.length > 0 ? Math.min(...equityCurve.map((p: any) => p.equity)) * 0.98 : 9000;
  const maxEquity = equityCurve.length > 0 ? Math.max(...equityCurve.map((p: any) => p.equity)) * 1.02 : 12000;
  const svgWidth = 600;
  const svgHeight = 160;

  const pointsSvg = equityCurve
    .map((pt: any, i: number) => {
      const x = (i / Math.max(1, equityCurve.length - 1)) * svgWidth;
      const y = svgHeight - ((pt.equity - minEquity) / Math.max(1, maxEquity - minEquity)) * svgHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Studio Header */}
      <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-amber-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold uppercase mb-2">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              Bull Lab Quantitative Strategy Studio
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Crea e Testa Strategie su <span className="text-cyan-400">Bitcoin</span> ed{" "}
              <span className="text-amber-400">Ethereum</span>
            </h2>
            <p className="mt-2 text-slate-300 text-sm max-w-3xl leading-relaxed">
              Combina gli indicatori più affidabili di TradingView (Supertrend, Medie Mobili Esponenziali 9/21/50/200, Bande di Bollinger, RSI Momentum). Testa l&apos;efficacia storica prima di rischiare anche un solo centesimo.
            </p>
          </div>

          <button
            disabled={loading}
            onClick={runBacktest}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-sm shadow-xl glow-orange-sm transition-all disabled:opacity-50"
          >
            {loading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-black" />}
            <span>{loading ? "Calcolo in corso..." : "ESEGUI BACKTEST ORA"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Parameters & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Strategy Parameters Customizer */}
        <div className="space-y-6">
          <div className="cyber-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase font-mono">Parametri Strategia</h3>
            </div>

            {/* Asset Selection */}
            <div>
              <label className="text-xs font-mono text-slate-400">Crypto Asset:</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => setPair("BTC/USDT")}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    pair === "BTC/USDT"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 glow-cyan-sm"
                      : "bg-[#06090e] text-slate-400 border-slate-800"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Bitcoin (BTC)</span>
                </button>
                <button
                  onClick={() => setPair("ETH/USDT")}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    pair === "ETH/USDT"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 glow-orange-sm"
                      : "bg-[#06090e] text-slate-400 border-slate-800"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Ethereum (ETH)</span>
                </button>
              </div>
            </div>

            {/* Strategy Formula Archetype */}
            <div>
              <label className="text-xs font-mono text-slate-400">Formula Logica:</label>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="bull_lab_confluence">Bull Lab Confluence (Asintomatico Formula)</option>
                <option value="ema_cross">Dynamic EMA Golden Pulse (9/21)</option>
                <option value="bollinger_breakout">Bollinger Bands Volatility Squeeze</option>
                <option value="rsi_reversal">RSI Divergence & Mean Reversion</option>
              </select>
            </div>

            {/* Financial Parameters */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Capitale Iniziale:</span>
                  <span className="text-white font-bold">${initialCapital.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Leva Finanziaria:</span>
                  <span className="text-cyan-400 font-bold">{leverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400">Stop Loss %:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Number(e.target.value))}
                    className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs text-rose-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400">Take Profit %:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                    className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* Indicator fine-tuning */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-mono text-slate-400">Fast EMA Period:</label>
                  <input
                    type="number"
                    value={emaFast}
                    onChange={(e) => setEmaFast(Number(e.target.value))}
                    className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400">Slow EMA Period:</label>
                  <input
                    type="number"
                    value={emaSlow}
                    onChange={(e) => setEmaSlow(Number(e.target.value))}
                    className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Deploy Button */}
            <div className="pt-2">
              <button
                onClick={() =>
                  onDeployAsBot({
                    pair,
                    strategyKey: strategyType,
                    leverage,
                    stopLossPct,
                    takeProfitPct,
                    name: `Bull Lab ${pair.split("/")[0]} ${strategyType.replace("_", " ").toUpperCase()}`,
                  })
                }
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg glow-cyan-sm transition-all"
              >
                <Bot className="w-4 h-4" />
                <span>PUBBLICA QUESTA STRATEGIA COME BOT</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Performance Cards, Equity Curve & Trade Logs (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Profit USDT */}
            <div className="cyber-card rounded-xl p-4 border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Profitto Netto</div>
              <div
                className={`mt-1 text-xl sm:text-2xl font-black ${
                  (stats?.netProfitUsdt ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {(stats?.netProfitUsdt ?? 0) >= 0 ? "+" : ""}${stats?.netProfitUsdt?.toLocaleString() ?? "0"}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-0.5">
                {(stats?.netProfitPct ?? 0) >= 0 ? "+" : ""}{stats?.netProfitPct ?? 0}% ROI
              </div>
            </div>

            {/* Win Rate */}
            <div className="cyber-card rounded-xl p-4 border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Win Rate</div>
              <div className="mt-1 text-xl sm:text-2xl font-black text-cyan-400">
                {stats?.winRate ?? 0}%
              </div>
              <div className="text-xs font-mono text-slate-400 mt-0.5">
                {stats?.winningTrades ?? 0} Vinti / {stats?.losingTrades ?? 0} Persi
              </div>
            </div>

            {/* Profit Factor */}
            <div className="cyber-card rounded-xl p-4 border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Profit Factor</div>
              <div className="mt-1 text-xl sm:text-2xl font-black text-amber-400">
                {stats?.profitFactor ?? "0.00"}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-0.5">
                {(stats?.profitFactor ?? 0) > 1.8 ? "Eccellente" : "Buono"}
              </div>
            </div>

            {/* Max Drawdown */}
            <div className="cyber-card rounded-xl p-4 border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Max Drawdown</div>
              <div className="mt-1 text-xl sm:text-2xl font-black text-rose-400">
                -{stats?.maxDrawdown ?? 0}%
              </div>
              <div className="text-xs font-mono text-slate-400 mt-0.5">
                Rischio Controllato
              </div>
            </div>
          </div>

          {/* Equity Curve Graph */}
          <div className="cyber-card rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white font-mono uppercase">Curva di Equity (Capitale nel Tempo)</h4>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Capitale Finale: <span className="text-emerald-400 font-bold">${stats?.finalCapital?.toLocaleString()}</span>
              </div>
            </div>

            <div className="relative w-full h-44 bg-[#05080d] rounded-xl p-3 border border-slate-800 overflow-hidden">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal reference line */}
                <line x1="0" y1={svgHeight * 0.75} x2={svgWidth} y2={svgHeight * 0.75} stroke="#1e293b" strokeDasharray="4 4" />
                
                {/* Area under curve */}
                {pointsSvg && (
                  <polygon
                    points={`0,${svgHeight} ${pointsSvg} ${svgWidth},${svgHeight}`}
                    fill="url(#equityGrad)"
                  />
                )}
                
                {/* Curve line */}
                {pointsSvg && (
                  <polyline
                    fill="none"
                    stroke="#00d2ff"
                    strokeWidth="2.5"
                    points={pointsSvg}
                  />
                )}
              </svg>
            </div>
          </div>

          {/* Detailed Backtest Trades Table */}
          <div className="cyber-card rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white font-mono uppercase">
                Registro Esecuzioni nel Backtest ({trades.length} trade)
              </h4>
              <span className="text-xs text-slate-400 font-mono">Timeframe 4h</span>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#070b12] text-slate-400 font-mono sticky top-0">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3">Prezzo Entrata</th>
                    <th className="py-2 px-3">Prezzo Uscita</th>
                    <th className="py-2 px-3">PnL ($)</th>
                    <th className="py-2 px-3">PnL (%)</th>
                    <th className="py-2 px-3">Motivo Uscita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {trades.map((t: any) => {
                    const isWin = t.pnlUsdt >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-500">{t.id}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              t.type === "LONG"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-950 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300">${t.entryPrice?.toLocaleString()}</td>
                        <td className="py-2 px-3 text-slate-300">${t.exitPrice?.toLocaleString()}</td>
                        <td className={`py-2 px-3 font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                          {isWin ? "+" : ""}${t.pnlUsdt}
                        </td>
                        <td className={`py-2 px-3 font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                          {isWin ? "+" : ""}{t.pnlPct}%
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{t.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
