"use client";

import React from "react";
import { Activity, Layers, Radio, Terminal, ShieldAlert } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  marketData: any;
  activeBotsCount: number;
  totalPnL: number;
  onEmergencyStop: () => void;
  isStopping: boolean;
}

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "ladder", label: "VAPI Ladder · BTC / ETH", icon: Layers },
  { id: "tradingview", label: "Alert TradingView", icon: Radio },
  { id: "orders", label: "Log Paper", icon: Terminal },
];

export default function Navbar({ activeTab, setActiveTab, activeBotsCount, totalPnL, onEmergencyStop, isStopping }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#070a0f]/95 backdrop-blur-md border-b border-slate-800/80 shadow-2xl">
      <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400/70 via-blue-500/40 to-amber-500/70" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => setActiveTab("dashboard")} className="font-black tracking-tight text-white text-lg">
          <span className="text-cyan-300">BULL</span> LAB <span className="text-[10px] text-slate-500 font-mono">PAPER · VAPI 3H</span>
        </button>
        <nav className="flex flex-wrap items-center gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === id ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/40" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">Bot attivi <b className="text-cyan-300">{activeBotsCount}</b></span>
          <span className={totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}>PnL paper {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)} USDT</span>
          <button disabled={isStopping} onClick={onEmergencyStop} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-600/40 hover:bg-rose-900 disabled:opacity-50" title="Mette in pausa i due bot paper; non chiude posizioni exchange">
            <ShieldAlert className="w-3.5 h-3.5" />{isStopping ? "PAUSA..." : "PAUSA BOT"}
          </button>
        </div>
      </div>
      <div className="px-4 py-1.5 bg-amber-950/20 border-t border-amber-500/20 text-center text-[10px] font-mono text-amber-200/90">
        PAPER TRADING: i segnali vengono simulati e registrati. Nessun ordine è inviato a un exchange.
      </div>
    </header>
  );
}
