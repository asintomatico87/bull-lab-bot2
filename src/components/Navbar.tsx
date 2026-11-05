"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Activity,
  Bot,
  CandlestickChart,
  Cpu,
  Crosshair,
  Layers,
  Radio,
  Rocket,
  ShieldAlert,
  Sliders,
  Terminal,
  Zap,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  marketData: any;
  activeBotsCount: number;
  totalPnL: number;
  onEmergencyStop: () => void;
  isStopping: boolean;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  marketData,
  activeBotsCount,
  totalPnL,
  onEmergencyStop,
  isStopping,
}: NavbarProps) {
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  const btc = marketData?.tickers?.BTC;
  const eth = marketData?.tickers?.ETH;

  return (
    <header className="sticky top-0 z-50 bg-[#070a0f]/95 backdrop-blur-md border-b border-slate-800/80 shadow-2xl">
      {/* Top Ticker Bar */}
      <div className="bg-[#05070b] border-b border-slate-800/50 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-400">
        <div className="flex items-center gap-6 overflow-x-auto py-0.5">
          {/* BTC Live */}
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">BTC/USDT</span>
            <span className="text-white font-bold">
              ${btc?.price ? btc.price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "84,250.00"}
            </span>
            <span
              className={`font-medium ${
                (btc?.change24h ?? 3.5) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {(btc?.change24h ?? 3.5) >= 0 ? "+" : ""}
              {(btc?.change24h ?? 3.5).toFixed(2)}%
            </span>
          </div>

          {/* ETH Live */}
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">ETH/USDT</span>
            <span className="text-white font-bold">
              ${eth?.price ? eth.price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "2,480.50"}
            </span>
            <span
              className={`font-medium ${
                (eth?.change24h ?? 5.2) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {(eth?.change24h ?? 5.2) >= 0 ? "+" : ""}
              {(eth?.change24h ?? 5.2).toFixed(2)}%
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="hidden md:flex items-center gap-4 text-slate-400 border-l border-slate-800 pl-4">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bot Attivi:</span>
              <span className="text-cyan-400 font-bold">{activeBotsCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>PnL Realizzato:</span>
              <span
                className={`font-bold ${
                  totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* System Status & External Links */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/40 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            <Radio className="w-3 h-3 animate-spin text-emerald-400" />
            <span className="text-[11px] font-semibold">WEBHOOK GATEWAY: ONLINE</span>
          </div>
          <a
            href="https://www.bulllab.one/it"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <span>bulllab.one</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Navbar Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3.5">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="relative h-12 w-44 sm:w-56 overflow-hidden rounded-lg border border-slate-700/60 shadow-lg group-hover:border-cyan-500/50 transition-all">
              <Image
                src="/images/bull-lab-logo.jpg"
                alt="Bull LAB Powered by Altcoinitalia"
                fill
                priority
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* Asintomatico Badge */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-cyan-500/40 glow-cyan-sm">
              <Image
                src="/images/asintomatico-avatar.jpg"
                alt="Asintomatico Founder"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 tracking-wide flex items-center gap-1">
                by Asintomatico
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              </span>
              <span className="text-[10px] text-amber-400/90 font-mono">
                AltcoinItalia Engine
              </span>
            </div>
          </div>
        </div>

        {/* Center / Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "dashboard"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 glow-cyan-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("vapi")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "vapi"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/60 glow-orange-sm"
                : "text-amber-400/90 hover:text-amber-200 hover:bg-amber-500/10"
            }`}
          >
            <Crosshair className="w-4 h-4 text-amber-400" />
            <span>VAPI 3H</span>
            <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1 rounded">CORE</span>
          </button>

          <button
            onClick={() => setActiveTab("ladder")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "ladder"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/50"
                : "text-emerald-400/90 hover:text-emerald-200 hover:bg-emerald-500/10"
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Ladder 3H</span>
            <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1 rounded">MART</span>
          </button>

          <button
            onClick={() => setActiveTab("golive")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "golive"
                ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 glow-cyan-sm"
                : "text-cyan-300 hover:text-white hover:bg-cyan-500/10"
            }`}
          >
            <Rocket className="w-4 h-4 text-cyan-400" />
            <span>Vai Live (Facile)</span>
            <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 px-1 rounded">NO-TV</span>
          </button>

          <button
            onClick={() => setActiveTab("exchanges")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "exchanges"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 glow-orange-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span className="flex items-center gap-1">
              Guida API & No-KYC
              <span className="hidden xl:inline-block text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded uppercase font-bold">
                Confronto
              </span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab("tradingview")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "tradingview"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 glow-cyan-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>TradingView Alert</span>
          </button>

          <button
            onClick={() => setActiveTab("backtester")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "backtester"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 glow-orange-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Backtester BTC/ETH</span>
          </button>

          <button
            onClick={() => setActiveTab("chart")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "chart"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 glow-cyan-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <CandlestickChart className="w-4 h-4 text-cyan-400" />
            <span>Grafico Live</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "orders"
                ? "bg-slate-700/60 text-slate-200 border border-slate-600"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Terminal className="w-4 h-4 text-slate-400" />
            <span>Ordini & Log</span>
          </button>
        </nav>

        {/* Emergency Kill Switch Button */}
        <div className="flex items-center gap-2">
          {!showConfirmStop ? (
            <button
              onClick={() => setShowConfirmStop(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/60 text-rose-400 border border-rose-600/40 hover:bg-rose-900/60 hover:text-rose-200 transition-all shadow-sm"
              title="Kill-Switch di emergenza per mettere in pausa tutti i bot e cancellare ordini pendenti"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">KILL-SWITCH</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-500 p-1 rounded-lg">
              <span className="text-[10px] text-rose-200 font-bold px-1">Confermi Stop?</span>
              <button
                disabled={isStopping}
                onClick={() => {
                  onEmergencyStop();
                  setShowConfirmStop(false);
                }}
                className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-500 transition-colors"
              >
                {isStopping ? "..." : "SI, STOP!"}
              </button>
              <button
                onClick={() => setShowConfirmStop(false)}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] hover:bg-slate-700"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
