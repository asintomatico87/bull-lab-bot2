"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Info } from "lucide-react";

interface OrdersTabProps {
  orders: any[];
  onRefresh: () => void;
  onTradeExecuted: () => void;
}

export default function OrdersTab({ orders, onRefresh }: OrdersTabProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/webhook/logs", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && Array.isArray(data.logs)) setLogs(data.logs);
    } catch (error) {
      console.error("Webhook log fetch failed", error);
    }
  }, []);
  useEffect(() => { void loadLogs(); }, [loadLogs]);
  const refresh = async () => { onRefresh(); await loadLogs(); };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-[#090d14] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono uppercase text-amber-300">Paper trading log</div>
            <h1 className="mt-1 text-xl font-black text-white">Simulazioni ed esito alert</h1>
          </div>
          <button onClick={() => void refresh()} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-200"><RefreshCw className="h-3.5 w-3.5" />Aggiorna</button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-3 text-xs text-cyan-100/80"><Info className="mt-0.5 h-4 w-4 shrink-0" />I fill sono simulazioni paper, non ordini inviati a un exchange. Il PnL paper viene calcolato dai prezzi ricevuti e dalle fee configurate. I log non contengono la secret webhook.</div>
        {orders.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Nessun alert simulato valido.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs font-mono"><thead className="border-b border-slate-800 text-slate-500"><tr><th className="p-2">Data/Ora</th><th className="p-2">Coppia</th><th className="p-2">Azione</th><th className="p-2">Prezzo</th><th className="p-2">Qty</th><th className="p-2">USDT</th><th className="p-2">PnL paper</th><th className="p-2">Stato</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-slate-800/70"><td className="p-2 text-slate-400">{new Date(order.timestamp).toLocaleString()}</td><td className="p-2 text-white">{order.pair}</td><td className="p-2 text-cyan-300">{order.type}</td><td className="p-2 text-slate-300">{Number(order.price).toFixed(4)}</td><td className="p-2 text-slate-300">{Number(order.amount).toFixed(8)}</td><td className="p-2 text-slate-300">{Number(order.totalUsdt).toFixed(2)}</td><td className={`p-2 ${Number(order.pnlUsdt) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{Number(order.pnlUsdt || 0).toFixed(2)}</td><td className="p-2 text-amber-200">{order.status}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="rounded-2xl border border-slate-800 bg-[#090d14] p-5">
        <h2 className="font-bold text-white">Ultimi webhook (nessun payload o secret mostrati)</h2>
        {logs.length === 0 ? <p className="mt-3 text-xs text-slate-500">Nessun log webhook.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs font-mono"><thead className="border-b border-slate-800 text-slate-500"><tr><th className="p-2">Data/Ora</th><th className="p-2">Ticker</th><th className="p-2">Azione</th><th className="p-2">Stato</th><th className="p-2">Event ID</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b border-slate-800/70"><td className="p-2 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td><td className="p-2 text-white">{log.ticker}</td><td className="p-2 text-cyan-300">{log.action}</td><td className="p-2 text-amber-200">{log.status}</td><td className="max-w-48 truncate p-2 text-slate-500" title={log.eventId ?? ""}>{log.eventId ?? "—"}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
