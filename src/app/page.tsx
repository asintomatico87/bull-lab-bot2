"use client";

import React, { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import DashboardTab from "@/components/DashboardTab";
import TradingViewWebhookTab from "@/components/TradingViewWebhookTab";
import VapiLadderTab from "@/components/VapiLadderTab";
import OrdersTab from "@/components/OrdersTab";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [bots, setBots] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStopping, setIsStopping] = useState(false);

  const fetchBots = useCallback(async () => {
    const res = await fetch("/api/bots", { cache: "no-store" });
    const data = await res.json();
    if (res.ok && Array.isArray(data.bots)) setBots(data.bots);
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders?limit=40", { cache: "no-store" });
    const data = await res.json();
    if (res.ok && Array.isArray(data.orders)) setOrders(data.orders);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchBots(), fetchOrders()]).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [fetchBots, fetchOrders]);

  const toggleBot = async (id: number, status: string) => {
    const res = await fetch("/api/bots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: status === "active" ? "paused" : "active" }),
    });
    if (res.ok) await fetchBots();
  };

  const pauseBots = async () => {
    setIsStopping(true);
    try {
      await fetch("/api/emergency-stop", { method: "POST" });
      await fetchBots();
    } finally {
      setIsStopping(false);
    }
  };

  const publishBot = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossibile salvare l'istanza.");
    await fetchBots();
  };

  const activeBotsCount = bots.filter((bot) => bot.status === "active").length;
  const totalPnL = bots.reduce((sum, bot) => sum + Number(bot.totalPnL || 0), 0);

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} marketData={null} activeBotsCount={activeBotsCount} totalPnL={totalPnL} onEmergencyStop={pauseBots} isStopping={isStopping} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? <div className="py-20 text-center font-mono text-cyan-300">Caricamento Bull Lab paper...</div> : <>
          {activeTab === "dashboard" && <DashboardTab
            bots={bots}
            recentOrders={orders}
            onOpenCreateModal={() => setActiveTab("ladder")}
            onToggleBotStatus={toggleBot}
            onDeleteBot={() => {}}
            onSelectTab={setActiveTab}
            onSelectBotForTradingView={() => setActiveTab("tradingview")}
            onEditBot={() => setActiveTab("ladder")}
          />}
          {activeTab === "ladder" && <VapiLadderTab bots={bots.filter((bot) => bot.strategyKey === "vapi_ladder")} onPublishBot={publishBot} />}
          {activeTab === "tradingview" && <TradingViewWebhookTab bots={bots.filter((bot) => bot.strategyKey === "vapi_ladder")} />}
          {activeTab === "orders" && <OrdersTab orders={orders} onRefresh={fetchOrders} onTradeExecuted={() => { void fetchBots(); void fetchOrders(); }} />}
        </>}
      </main>
      <footer className="border-t border-slate-800 bg-[#05070b] px-4 py-5 text-center text-[11px] text-slate-500">
        Bull Lab VAPI Ladder 3H · BTC/USDT + ETH/USDT · Paper only · Nessun exchange collegato
      </footer>
    </div>
  );
}
