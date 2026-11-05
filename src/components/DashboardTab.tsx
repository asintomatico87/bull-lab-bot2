"use client";

import React from "react";
import { Layers, Radio, Pause, Play, AlertTriangle } from "lucide-react";

type BotItem = {
  id: number;
  name: string;
  pair: string;
  strategyKey: string;
  status: string;
  mode: string;
  orderSizeUsdt: string;
  totalPnL: string;
  webhookSecret: string;
  config?: Record<string, any> | null;
};

interface DashboardTabProps {
  bots: BotItem[];
  recentOrders: any[];
  onOpenCreateModal: () => void;
  onToggleBotStatus: (botId: number, currentStatus: string) => void;
  onDeleteBot: (botId: number) => void;
  onSelectTab: (tab: string) => void;
  onSelectBotForTradingView: (botId: number) => void;
  onEditBot: (bot: BotItem) => void;
}

const ASSETS = ["BTC/USDT", "ETH/USDT"];

export default function DashboardTab({ bots, recentOrders, onOpenCreateModal, onToggleBotStatus, onSelectTab, onEditBot }: DashboardTabProps) {
  const ladderBots = bots.filter((bot) => bot.strategyKey === "vapi_ladder");
  const activeCount = ladderBots.filter((bot) => bot.status === "active").length;
  const totalPnl = ladderBots.reduce((sum, bot) => sum + Number(bot.totalPnL || 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#0b121f] to-[#11100d] p-6">
        <div className="text-[11px] uppercase font-mono text-cyan-300">Bull Lab · fase pre-exchange</div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white">Due istanze della stessa strategia</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">VAPI Ladder 3H, una su BTC/USDT e una su ETH/USDT. Livelli, moltiplicatori e uscite sono identici e fissi; size base e stato paper sono configurabili per asset. Gli alert vengono simulati senza inviare ordini reali.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
          <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-200">Bot paper attivi: {activeCount}/2</span>
          <span className={`rounded-lg border px-2.5 py-1.5 ${totalPnl >= 0 ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/30 text-rose-300"}`}>PnL paper: {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} USDT</span>
          <span className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-2.5 py-1.5 text-amber-200">Nessun collegamento exchange attivo</span>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ASSETS.map((pair) => {
          const bot = ladderBots.find((item) => item.pair.toUpperCase() === pair);
          const state = bot?.config?.ladderState ?? {};
          const levels = bot?.config?.levels ?? [-25, -32, -40];
          const multipliers = bot?.config?.multipliers ?? [1, 1.5, 2.5];
          return (
            <section key={pair} className="rounded-2xl border border-slate-800 bg-[#090d14] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-cyan-300">{pair}</div>
                  <h2 className="mt-1 text-lg font-bold text-white">VAPI Ladder 3H</h2>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-mono border ${bot?.status === "active" ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
                  {bot ? (bot.status === "active" ? "PAPER ATTIVO" : "IN PAUSA") : "DA CONFIGURARE"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="rounded-lg border border-slate-800 bg-[#06090e] p-2"><div className="text-slate-500">Base</div><div className="mt-1 text-white">{Number(bot?.config?.baseSizeUsdt ?? bot?.orderSizeUsdt ?? 500)} USDT</div></div>
                <div className="rounded-lg border border-slate-800 bg-[#06090e] p-2"><div className="text-slate-500">Buy</div><div className="mt-1 text-white">{state.buys ?? 0}/3</div></div>
                <div className="rounded-lg border border-slate-800 bg-[#06090e] p-2"><div className="text-slate-500">Investito</div><div className="mt-1 text-white">{Number(state.investedUsdt ?? 0).toFixed(2)} USDT</div></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-mono">
                {levels.map((level: number, index: number) => <span key={index} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">{index + 1}: ≤ {level} · {multipliers[index]}x</span>)}
                <span className="rounded border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-amber-200">No SL · regola strategia</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => onSelectTab("ladder")} className="flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-bold text-cyan-200 border border-cyan-500/30"><Layers className="h-3.5 w-3.5" />Configura</button>
                <button onClick={() => onSelectTab("tradingview")} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200"><Radio className="h-3.5 w-3.5" />Alert TV</button>
                {bot && <button onClick={() => onToggleBotStatus(bot.id, bot.status)} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200">{bot.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{bot.status === "active" ? "Pausa" : "Attiva paper"}</button>}
                {!bot && <button onClick={onOpenCreateModal} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black">Crea istanza {pair.split("/")[0]}</button>}
              </div>
              {bot && <p className="mt-3 text-[10px] font-mono text-slate-500">Secret webhook presente nel bot: per sicurezza non viene mostrata in questa scheda.</p>}
            </section>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-100/90">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p>Le simulazioni e i risultati paper non certificano performance reali. Un alert ricevuto non significa che un ordine sia stato inviato a Hyperliquid.</p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-[#090d14] p-5">
        <h2 className="font-bold text-white">Ultimi eventi paper</h2>
        {recentOrders.length === 0 ? <p className="mt-3 text-xs text-slate-500">Nessun alert simulato ancora.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs font-mono"><thead className="text-slate-500"><tr><th className="p-2">Ora</th><th className="p-2">Asset</th><th className="p-2">Azione</th><th className="p-2">Prezzo</th><th className="p-2">PnL paper</th></tr></thead><tbody>{recentOrders.slice(0, 8).map((order) => <tr key={order.id} className="border-t border-slate-800"><td className="p-2 text-slate-400">{new Date(order.timestamp).toLocaleString()}</td><td className="p-2 text-white">{order.pair}</td><td className="p-2 text-cyan-300">{order.type}</td><td className="p-2 text-slate-300">{Number(order.price).toFixed(2)}</td><td className="p-2 text-slate-300">{Number(order.pnlUsdt || 0).toFixed(2)}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
