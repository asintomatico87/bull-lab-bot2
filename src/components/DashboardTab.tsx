"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Bot,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  Crosshair,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Sliders,
  Radio,
  Plus,
  ShieldCheck,
  Clock,
  Sparkles,
  ExternalLink,
  Flame,
} from "lucide-react";

interface BotItem {
  id: number;
  name: string;
  pair: string;
  strategyKey: string;
  platform: string;
  mode: string;
  status: string;
  leverage: number;
  orderSizeUsdt: string;
  stopLossPct: string;
  takeProfitPct: string;
  timeframe: string;
  totalPnL: string;
  winCount: number;
  lossCount: number;
  webhookSecret: string;
  lastRunAt: string;
  config?: Record<string, unknown> | null;
}

interface DashboardTabProps {
  bots: BotItem[];
  recentOrders: any[];
  onOpenCreateModal: () => void;
  onToggleBotStatus: (botId: number, currentStatus: string) => void;
  onDeleteBot: (botId: number) => void;
  onSelectTab: (tab: string) => void;
  onSelectBotForTradingView: (botId: number) => void;
  onEditBot: (bot: BotItem) => void;
  onHistoryCleared?: () => void;
}

export default function DashboardTab({
  bots,
  recentOrders,
  onOpenCreateModal,
  onToggleBotStatus,
  onDeleteBot,
  onSelectTab,
  onSelectBotForTradingView,
  onEditBot,
  onHistoryCleared,
}: DashboardTabProps) {
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState<string | null>(null);

  const clearHistory = async () => {
    if (!confirm("Cancellare tutti gli ordini di test e azzerare le scale? I bot e le secret restano.")) return;
    setClearing(true);
    setClearMsg(null);
    try {
      const res = await fetch("/api/admin/clear-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "CLEAR" }),
      });
      const data = await res.json();
      if (data.success) {
        setClearMsg("Storico pulito. Scale a 0/3.");
        onHistoryCleared?.();
      } else {
        setClearMsg(data.error || "Operazione non riuscita");
      }
    } catch (e) {
      setClearMsg(String(e));
    } finally {
      setClearing(false);
    }
  };
  const [copiedSecretId, setCopiedSecretId] = useState<number | null>(null);

  const visibleBots = bots.filter((b) => b.strategyKey === "vapi_ladder");
  const totalPnL = visibleBots.reduce((acc, b) => acc + Number(b.totalPnL || 0), 0);
  const activeBots = visibleBots.filter((b) => b.status === "active").length;
  const totalWins = visibleBots.reduce((acc, b) => acc + (b.winCount || 0), 0);
  const totalLosses = visibleBots.reduce((acc, b) => acc + (b.lossCount || 0), 0);
  const totalTradesCount = totalWins + totalLosses;
  const globalWinRate = totalTradesCount > 0 ? ((totalWins / totalTradesCount) * 100).toFixed(1) : "—";

  const handleCopySecret = (botId: number, secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecretId(botId);
    setTimeout(() => setCopiedSecretId(null), 2000);
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case "hyperliquid_dex":
        return { label: "Hyperliquid (DEX)", color: "text-cyan-400 bg-cyan-950/60 border-cyan-500/40" };
      case "ourbit_nokyc":
        return { label: "OurBit (No-KYC)", color: "text-amber-400 bg-amber-950/60 border-amber-500/40" };
      case "bitbase":
        return { label: "Bitbase Pro", color: "text-blue-400 bg-blue-950/60 border-blue-500/40" };
      case "bybit":
        return { label: "Bybit V5", color: "text-purple-400 bg-purple-950/60 border-purple-500/40" };
      default:
        return { label: "Paper Trading", color: "text-slate-400 bg-slate-900 border-slate-700" };
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner Hero */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#0b121f] via-[#090d16] to-[#1a110a] border border-cyan-500/30 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold uppercase mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Bull Lab Automated Trading Engine v3.2
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Sistema di Trading Automatizzato <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-amber-400">
                Bitcoin & Ethereum
              </span>
            </h1>
            <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Sistema di trading automatizzato basato su dati quantitativi, con ordini a soglia di accumulazione e distribuzione.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg glow-cyan-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>NUOVO BOT AUTOMATIZZATO</span>
              </button>

              <button
                onClick={() => onSelectTab("ladder")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/50 text-xs font-bold transition-all"
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>VAPI Ladder 3H (6 Regole)</span>
              </button>

              <button
                onClick={() => onSelectTab("golive")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 text-xs font-bold transition-all glow-cyan-sm"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Vai Live</span>
              </button>

              <button
                onClick={() => onSelectTab("exchanges")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Guida Piattaforme No-KYC</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-col gap-3 min-w-[240px]">
            <div className="cyber-card p-4 rounded-xl border border-cyan-500/30 text-xs font-mono">
              <div className="text-slate-400 uppercase">Indice di Sentiment Bull Lab</div>
              <div className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-2">
                <span>76/100</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  AVIDITÀ
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed normal-case tracking-normal">
                Lettura composita 0–100 da dati di mercato, non una previsione: momentum BTC 24h, ampiezza del listino, variazione dei volumi, cambio di dominanza BTC, direzione a 7 giorni e tono delle notizie. Non costituisce consulenza finanziaria.
              </p>
            </div>

            <div className="cyber-card p-4 rounded-xl border border-slate-800 text-xs font-mono">
              <div className="text-slate-400 uppercase">Velocità di Esecuzione L1</div>
              <div className="text-lg font-bold text-cyan-400 mt-0.5">
                &lt; 0.2s Latenza Webhook
              </div>
              <div className="text-[11px] text-slate-400">Zero Slippage con Hyperliquid</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total PnL */}
        <div className="card-accent lift rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
            <span>PnL Realizzato Totale</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-black ${
              totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono">
            Tutti i bot attivi
          </div>
        </div>

        {/* Active Bots */}
        <div className="cyber-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
            <span>Bot Operativi</span>
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white">
            <span className="text-cyan-400">{activeBots}</span>
            <span className="text-slate-500 text-lg"> / {visibleBots.length}</span>
          </div>
          <div className="mt-1 text-xs text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Algoritmi in scansione
          </div>
        </div>

        {/* Win Rate */}
        <div className="cyber-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
            <span>Win Rate Globale</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-400">
            {totalTradesCount > 0 ? `${globalWinRate}%` : "—"}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono">
            {totalWins} Vittorie / {totalLosses} Perdite
          </div>
        </div>

        {/* Total Trades */}
        <div className="cyber-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
            <span>Ordini Eseguiti</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white">
            {recentOrders.length}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono">
            Solo esecuzioni registrate
          </div>
        </div>
      </div>

      {/* Automated Bots Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white uppercase font-mono">
              I Tuoi Bot di Trading Automatizzati ({visibleBots.length})
            </h2>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold border border-cyan-500/40 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuovo Bot</span>
          </button>
        </div>

        {/* Bots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visibleBots.map((bot) => {
            const isRunning = bot.status === "active";
            const platformBadge = getPlatformLabel(bot.platform);
            const botPnL = Number(bot.totalPnL || 0);

            return (
              <div
                key={bot.id}
                className={`cyber-card rounded-2xl p-5 border transition-all ${
                  isRunning
                    ? "border-slate-800 hover:border-cyan-500/40"
                    : "border-slate-800/60 opacity-80"
                }`}
              >
                {/* Header card */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-base">{bot.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${platformBadge.color}`}
                      >
                        {platformBadge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate-400">
                      <span className="text-cyan-300 font-bold">{bot.pair}</span>
                      <span>•</span>
                      <span>{bot.timeframe}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">{bot.leverage}x Leva</span>
                      <span>•</span>
                      <span className="capitalize">{bot.mode} Mode</span>
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleBotStatus(bot.id, bot.status)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        isRunning
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-900/60"
                          : "bg-amber-950 text-amber-300 border border-amber-500/50 hover:bg-amber-900/60"
                      }`}
                    >
                      {isRunning ? <Pause className="w-3 h-3 fill-emerald-400" /> : <Play className="w-3 h-3 fill-amber-300" />}
                      <span>{isRunning ? "ATTIVO" : "IN PAUSA"}</span>
                    </button>

                    <button
                      onClick={() => onDeleteBot(bot.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="Elimina Bot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-800 text-xs font-mono">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">PnL Bot</div>
                    <div
                      className={`text-sm font-black mt-0.5 ${
                        botPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {botPnL >= 0 ? "+" : ""}${botPnL.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Win / Loss</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {bot.winCount}W / {bot.lossCount}L
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">SL / TP Target</div>
                    <div className="text-xs font-bold text-slate-300 mt-0.5">
                      -{bot.stopLossPct}% / +{bot.takeProfitPct}%
                    </div>
                  </div>
                </div>

                {/* VAPI LADDER summary */}
                {bot.strategyKey === "vapi_ladder" && (
                  <div className="mt-3 p-2.5 rounded-lg bg-[#07100c] border border-emerald-500/30 text-[10px] font-mono space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-300 font-bold uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        VAPI Ladder · martingala 3H
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300">
                          buys {Number((bot.config?.ladderState as any)?.buys ?? 0)}/{String(bot.config?.maxBuys ?? 3)}
                        </span>
                        <button
                          onClick={() => onEditBot(bot)}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold"
                        >
                          Modifica
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(Array.isArray(bot.config?.levels) ? (bot.config!.levels as number[]) : [-25, -32, -40]).map((level, index) => (
                        <span key={index} className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                          {index + 1}· ≤ {level} ({String((bot.config?.multipliers as number[] | undefined)?.[index] ?? 1)}x)
                        </span>
                      ))}
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                        no stop loss
                      </span>
                    </div>
                  </div>
                )}

                {/* VAPI level engine summary */}
                {bot.strategyKey === "vapi_lazybear" && (
                  <div className="mt-3 p-2.5 rounded-lg bg-[#0a0f1a] border border-amber-500/30 text-[10px] font-mono space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-300 font-bold uppercase flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Scala 3H · soglie accumulo/distribuzione
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">
                          gate {bot.config?.gateLevels === false ? "OFF" : "ON"}
                        </span>
                        <button
                          onClick={() => onEditBot(bot)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold transition-colors"
                          title="Personalizza i livelli VAPI di questo bot"
                        >
                          <Sliders className="w-2.5 h-2.5" />
                          Modifica livelli
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                        LONG ≥ {String(bot.config?.longEntry ?? 10)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-teal-950/70 text-teal-300 border border-teal-500/30">
                        exit ≤ {String(bot.config?.longExit ?? -2)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-500/30">
                        SHORT ≤ {String(bot.config?.shortEntry ?? -10)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-orange-950/70 text-orange-300 border border-orange-500/30">
                        exit ≥ {String(bot.config?.shortExit ?? 2)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                        length {String(bot.config?.length ?? 10)} · conf {String(bot.config?.confirmation ?? 1)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Webhook Secret & Quick Actions */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                    <span>Secret:</span>
                    <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 select-all">
                      {bot.webhookSecret}
                    </code>
                    <button
                      onClick={() => handleCopySecret(bot.id, bot.webhookSecret)}
                      className="text-slate-400 hover:text-white"
                      title="Copia Secret"
                    >
                      {copiedSecretId === bot.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      onSelectBotForTradingView(bot.id);
                      onSelectTab("tradingview");
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    <span>Configura Alert TradingView</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders Stream */}
      <div className="cyber-card rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase font-mono">
              Ultime Esecuzioni del Sistema
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearHistory}
              disabled={clearing}
              className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"
            >
              {clearing ? "Pulizia..." : "Pulisci storico test"}
            </button>
            <button
              onClick={() => onSelectTab("orders")}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              Vedi tutti gli ordini →
            </button>
          </div>
        </div>

        {clearMsg && (
          <div className="mb-3 text-[11px] font-mono text-emerald-300">{clearMsg}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070b12] text-slate-400 font-mono">
              <tr>
                <th className="py-2 px-3">Data / Ora</th>
                <th className="py-2 px-3">Coppia</th>
                <th className="py-2 px-3">Tipo</th>
                <th className="py-2 px-3">Prezzo Fill</th>
                <th className="py-2 px-3">Quantità</th>
                <th className="py-2 px-3">Totale USDT</th>
                <th className="py-2 px-3">PnL</th>
                <th className="py-2 px-3">Piattaforma</th>
                <th className="py-2 px-3">Origine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recentOrders.slice(0, 5).map((order: any) => {
                const isWin = Number(order.pnlUsdt || 0) > 0;
                return (
                  <tr key={order.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-400">
                      {new Date(order.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2 px-3 font-bold text-white">{order.pair}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          order.type.includes("BUY")
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-950 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {order.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300">${Number(order.price).toLocaleString()}</td>
                    <td className="py-2 px-3 text-slate-300">{order.amount}</td>
                    <td className="py-2 px-3 text-slate-300">${Number(order.totalUsdt).toLocaleString()}</td>
                    <td
                      className={`py-2 px-3 font-bold ${
                        Number(order.pnlUsdt) === 0
                          ? "text-slate-400"
                          : isWin
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {Number(order.pnlUsdt) > 0 ? "+" : ""}${order.pnlUsdt || "0.00"}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                        {order.platform}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-400">{order.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
