"use client";

import React, { useState } from "react";
import {
  Terminal,
  Activity,
  Send,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
} from "lucide-react";

interface OrdersTabProps {
  orders: any[];
  onRefresh: () => void;
  onTradeExecuted: () => void;
}

export default function OrdersTab({ orders, onRefresh, onTradeExecuted }: OrdersTabProps) {
  const [filterPair, setFilterPair] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");

  // Manual trade form
  const [manualPair, setManualPair] = useState<string>("BTC/USDT");
  const [manualAction, setManualAction] = useState<string>("BUY_LONG");
  const [manualPrice, setManualPrice] = useState<string>("84250.00");
  const [manualAmount, setManualAmount] = useState<string>("0.05");
  const [manualPlatform, setManualPlatform] = useState<string>("hyperliquid_dex");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; success: boolean } | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (filterPair !== "ALL" && o.pair !== filterPair) return false;
    if (filterSource !== "ALL" && o.source !== filterSource) return false;
    return true;
  });

  const handleManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: manualPair,
          type: manualAction,
          price: parseFloat(manualPrice),
          amount: parseFloat(manualAmount),
          platform: manualPlatform,
          notes: "Ordine manuale piazzato dal terminale Bull Lab",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ text: `Ordine #${data.order.id} eseguito con successo!`, success: true });
        onTradeExecuted();
        onRefresh();
      } else {
        setMsg({ text: data.error || "Errore durante l'esecuzione", success: false });
      }
    } catch (err: any) {
      setMsg({ text: err.message, success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="cyber-card rounded-2xl p-6 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono font-bold uppercase mb-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Bull Lab Order Book & Execution Terminal
          </div>
          <h2 className="text-2xl font-black text-white">Registro Esecuzioni & Terminale</h2>
          <p className="text-xs text-slate-400 mt-1">
            Archivio immutabile degli ordini inviati tramite bot, webhook TradingView e ordini manuali.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Ricarica Storico</span>
        </button>
      </div>

      {/* Grid: Manual Trade Form on Left, Table on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Manual Terminal (1 col) */}
        <div className="cyber-card rounded-2xl p-5 border border-cyan-500/30 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Send className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase font-mono">Piazza Ordine Rapido</h3>
          </div>

          <form onSubmit={handleManualOrder} className="space-y-3 font-mono text-xs">
            {msg && (
              <div
                className={`p-2.5 rounded-lg border text-xs ${
                  msg.success
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                }`}
              >
                {msg.text}
              </div>
            )}

            <div>
              <label className="text-slate-400">Coppia:</label>
              <select
                value={manualPair}
                onChange={(e) => {
                  setManualPair(e.target.value);
                  setManualPrice(e.target.value.includes("ETH") ? "2480.00" : "84250.00");
                  setManualAmount(e.target.value.includes("ETH") ? "1.5" : "0.05");
                }}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="BTC/USDT">BTC / USDT</option>
                <option value="ETH/USDT">ETH / USDT</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400">Azione:</label>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setManualAction("BUY_LONG")}
                  className={`py-1.5 rounded font-bold border transition-all ${
                    manualAction === "BUY_LONG"
                      ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  BUY LONG
                </button>
                <button
                  type="button"
                  onClick={() => setManualAction("SELL_SHORT")}
                  className={`py-1.5 rounded font-bold border transition-all ${
                    manualAction === "SELL_SHORT"
                      ? "bg-rose-950 border-rose-500 text-rose-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  SELL SHORT
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-400">Prezzo ($):</label>
              <input
                type="number"
                step="0.5"
                required
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400">Quantità:</label>
              <input
                type="number"
                step="0.01"
                required
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400">Piattaforma di Routing:</label>
              <select
                value={manualPlatform}
                onChange={(e) => setManualPlatform(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="hyperliquid_dex">Hyperliquid L1 (DEX)</option>
                <option value="ourbit_nokyc">OurBit (No-KYC)</option>
                <option value="bitbase">Bitbase Pro</option>
                <option value="paper_trading">Paper Trading Simulator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg glow-cyan-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Invio..." : "ESEGUI ORDINE SUBITO"}
            </button>
          </form>
        </div>

        {/* Orders Table (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 cyber-card p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Coppia:</span>
              <button
                onClick={() => setFilterPair("ALL")}
                className={`px-2 py-0.5 rounded ${filterPair === "ALL" ? "bg-slate-700 text-white" : "text-slate-400"}`}
              >
                Tutte
              </button>
              <button
                onClick={() => setFilterPair("BTC/USDT")}
                className={`px-2 py-0.5 rounded ${filterPair === "BTC/USDT" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400"}`}
              >
                BTC
              </button>
              <button
                onClick={() => setFilterPair("ETH/USDT")}
                className={`px-2 py-0.5 rounded ${filterPair === "ETH/USDT" ? "bg-amber-500/20 text-amber-300" : "text-slate-400"}`}
              >
                ETH
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Origine:</span>
              <button
                onClick={() => setFilterSource("ALL")}
                className={`px-2 py-0.5 rounded ${filterSource === "ALL" ? "bg-slate-700 text-white" : "text-slate-400"}`}
              >
                Tutte
              </button>
              <button
                onClick={() => setFilterSource("WEBHOOK_TRADINGVIEW")}
                className={`px-2 py-0.5 rounded ${filterSource === "WEBHOOK_TRADINGVIEW" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400"}`}
              >
                Webhook
              </button>
              <button
                onClick={() => setFilterSource("BOT_STRATEGY")}
                className={`px-2 py-0.5 rounded ${filterSource === "BOT_STRATEGY" ? "bg-amber-500/20 text-amber-300" : "text-slate-400"}`}
              >
                Bot Strategy
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="cyber-card rounded-2xl p-4 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#070b12] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Data/Ora</th>
                    <th className="py-2.5 px-3">Coppia</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Prezzo</th>
                    <th className="py-2.5 px-3">Quantità</th>
                    <th className="py-2.5 px-3">Controvalore</th>
                    <th className="py-2.5 px-3">PnL</th>
                    <th className="py-2.5 px-3">Piattaforma</th>
                    <th className="py-2.5 px-3">Origine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                        Nessun ordine trovato con i filtri selezionati.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order: any) => {
                      const isWin = Number(order.pnlUsdt || 0) > 0;
                      return (
                        <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400">
                            {new Date(order.timestamp).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">{order.pair}</td>
                          <td className="py-2.5 px-3">
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
                          <td className="py-2.5 px-3 text-slate-200">${Number(order.price).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-slate-200">{order.amount}</td>
                          <td className="py-2.5 px-3 text-slate-300">${Number(order.totalUsdt).toLocaleString()}</td>
                          <td
                            className={`py-2.5 px-3 font-bold ${
                              Number(order.pnlUsdt) === 0
                                ? "text-slate-400"
                                : isWin
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {Number(order.pnlUsdt) > 0 ? "+" : ""}${order.pnlUsdt || "0.00"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                              {order.platform}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-400">{order.source}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
