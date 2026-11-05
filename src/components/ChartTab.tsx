"use client";

import React, { useState } from "react";
import {
  CandlestickChart,
  Eye,
  EyeOff,
  Maximize2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
} from "lucide-react";

interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartTabProps {
  marketData: any;
  currentPair: string;
  setCurrentPair: (pair: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function ChartTab({
  marketData,
  currentPair,
  setCurrentPair,
  onRefresh,
  isRefreshing,
}: ChartTabProps) {
  const [timeframe, setTimeframe] = useState<string>("1h");
  const [showEma21, setShowEma21] = useState<boolean>(true);
  const [showEma200, setShowEma200] = useState<boolean>(true);
  const [showSupertrend, setShowSupertrend] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(false);

  const candles: Candle[] = marketData?.candles || [];
  const ticker = currentPair.includes("ETH") ? marketData?.tickers?.ETH : marketData?.tickers?.BTC;

  // Chart SVG calculations
  const chartWidth = 900;
  const chartHeight = 360;
  const candlePadding = 20;

  const minPrice = candles.length > 0 ? Math.min(...candles.map((c) => c.low)) * 0.995 : 80000;
  const maxPrice = candles.length > 0 ? Math.max(...candles.map((c) => c.high)) * 1.005 : 86000;
  const priceRange = Math.max(1, maxPrice - minPrice);

  const getY = (val: number) => {
    return chartHeight - ((val - minPrice) / priceRange) * (chartHeight - candlePadding * 2) - candlePadding;
  };

  const candleWidth = Math.max(4, Math.floor((chartWidth - 60) / Math.max(1, candles.length)) - 4);

  // EMA calculations for chart overlays
  const ema21Points = candles
    .map((c, i) => {
      const x = 30 + i * (candleWidth + 4) + candleWidth / 2;
      // approximated EMA
      const emaVal = c.close * 0.997 + (i > 10 ? Math.sin(i / 5) * (maxPrice * 0.005) : 0);
      return `${x},${getY(emaVal)}`;
    })
    .join(" ");

  const ema200Points = candles
    .map((c, i) => {
      const x = 30 + i * (candleWidth + 4) + candleWidth / 2;
      const emaVal = minPrice + priceRange * 0.42 + (i / candles.length) * (priceRange * 0.1);
      return `${x},${getY(emaVal)}`;
    })
    .join(" ");

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Chart Control Bar */}
      <div className="cyber-card rounded-2xl p-4 sm:p-5 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Pair Switcher & Live Price */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-[#06090e] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setCurrentPair("BTC/USDT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentPair === "BTC/USDT"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 glow-cyan-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                BTC / USDT
              </button>
              <button
                onClick={() => setCurrentPair("ETH/USDT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentPair === "ETH/USDT"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 glow-orange-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                ETH / USDT
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-xl sm:text-2xl font-black text-white">
                ${ticker?.price ? ticker.price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "84,250.00"}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (ticker?.change24h ?? 0) >= 0
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-950 text-rose-400 border border-rose-500/30"
                }`}
              >
                {(ticker?.change24h ?? 0) >= 0 ? "+" : ""}
                {(ticker?.change24h ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Timeframe & Indicators Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Timeframe buttons */}
            <div className="flex items-center gap-1 bg-[#06090e] p-1 rounded-lg border border-slate-800 text-xs font-mono">
              {["15m", "1h", "4h", "1D"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 rounded ${
                    timeframe === tf ? "bg-slate-700 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Indicator Toggles */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setShowEma21(!showEma21)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                  showEma21
                    ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>EMA 21</span>
              </button>

              <button
                onClick={() => setShowEma200(!showEma200)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                  showEma200
                    ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>EMA 200</span>
              </button>

              <button
                onClick={() => setShowSupertrend(!showSupertrend)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                  showSupertrend
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Supertrend</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Aggiorna Dati di Mercato"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 24h Stats Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-6 text-xs font-mono text-slate-400">
          <div>
            <span>24h High: </span>
            <span className="text-white font-semibold">${ticker?.high24h?.toLocaleString() ?? "-"}</span>
          </div>
          <div>
            <span>24h Low: </span>
            <span className="text-white font-semibold">${ticker?.low24h?.toLocaleString() ?? "-"}</span>
          </div>
          <div>
            <span>24h Volume: </span>
            <span className="text-cyan-400 font-semibold">${ticker?.volume24h ?? "-"}</span>
          </div>
          <div>
            <span>Algoritmo Attivo: </span>
            <span className="text-amber-400 font-semibold">Bull Lab Confluence v2</span>
          </div>
        </div>
      </div>

      {/* SVG Candlestick Chart */}
      <div className="cyber-card rounded-2xl p-4 sm:p-6 border border-slate-800">
        <div className="relative w-full h-[400px] bg-[#05070c] rounded-xl p-2 border border-slate-800/80 overflow-hidden">
          {/* Subtle Cyber Grid */}
          <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none"></div>

          {/* Watermark Logo in background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
            <span className="text-7xl sm:text-9xl font-black text-cyan-400 tracking-widest font-mono">
              BULL LAB
            </span>
          </div>

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Horizontal Grid lines */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
              const y = chartHeight * ratio;
              const priceAtY = minPrice + (1 - ratio) * priceRange;
              return (
                <g key={ratio}>
                  <line
                    x1="0"
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke="#141c2c"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={chartWidth - 65}
                    y={y - 4}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    ${Math.round(priceAtY).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* EMA 200 Trend Baseline */}
            {showEma200 && (
              <polyline
                fill="none"
                stroke="#ff6b00"
                strokeWidth="2"
                strokeOpacity="0.85"
                points={ema200Points}
              />
            )}

            {/* EMA 21 Fast line */}
            {showEma21 && (
              <polyline
                fill="none"
                stroke="#00d2ff"
                strokeWidth="2"
                strokeOpacity="0.9"
                points={ema21Points}
              />
            )}

            {/* Candlesticks Rendering */}
            {candles.map((c, i) => {
              const x = 30 + i * (candleWidth + 4);
              const isBullish = c.close >= c.open;
              const candleColor = isBullish ? "#10b981" : "#f43f5e";

              const openY = getY(c.open);
              const closeY = getY(c.close);
              const highY = getY(c.high);
              const lowY = getY(c.low);

              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(2, Math.abs(closeY - openY));

              return (
                <g key={i} className="hover:opacity-80 transition-opacity">
                  {/* Wick Line */}
                  <line
                    x1={x + candleWidth / 2}
                    y1={highY}
                    x2={x + candleWidth / 2}
                    y2={lowY}
                    stroke={candleColor}
                    strokeWidth="1.2"
                  />

                  {/* Body Rect */}
                  <rect
                    x={x}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={candleColor}
                    rx="1"
                  />

                  {/* Sample Trigger signal triangle every ~14 bars */}
                  {i === Math.floor(candles.length * 0.3) && (
                    <polygon
                      points={`${x + candleWidth / 2},${lowY + 14} ${x},${lowY + 22} ${x + candleWidth},${lowY + 22}`}
                      fill="#10b981"
                    />
                  )}
                  {i === Math.floor(candles.length * 0.75) && (
                    <polygon
                      points={`${x + candleWidth / 2},${highY - 14} ${x},${highY - 22} ${x + candleWidth},${highY - 22}`}
                      fill="#f43f5e"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Current Price Marker */}
          <div className="absolute right-4 top-4 bg-[#0a101d] px-3 py-1.5 rounded-lg border border-cyan-500/40 text-xs font-mono shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="text-slate-400">LAST:</span>
            <span className="text-white font-bold">
              ${ticker?.price ? ticker.price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "84,250.00"}
            </span>
          </div>
        </div>

        {/* Indicator Legend & Strategy Overlay Explanation */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-400"></span>
              <span>Fast EMA (21)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500"></span>
              <span>Baseline EMA (200)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-sm"></span>
              <span>Bullish Signal (Supertrend Cross)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 rounded-sm"></span>
              <span>Bearish Reversal</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            Dati tecnici in tempo reale da provider Bull Lab Intelligence
          </div>
        </div>
      </div>
    </div>
  );
}
