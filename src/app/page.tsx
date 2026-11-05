"use client";

import React, { useState, useEffect, useCallback } from "react";
import BullLabLogo from "@/components/BullLabLogo";
import Navbar from "@/components/Navbar";
import DashboardTab from "@/components/DashboardTab";
import ExchangeGuideTab from "@/components/ExchangeGuideTab";
import TradingViewWebhookTab from "@/components/TradingViewWebhookTab";
import BacktesterTab from "@/components/BacktesterTab";
import VapiLabTab from "@/components/VapiLabTab";
import VapiLadderTab from "@/components/VapiLadderTab";
import GoLiveGuideTab from "@/components/GoLiveGuideTab";
import ChartTab from "@/components/ChartTab";
import OrdersTab from "@/components/OrdersTab";
import BotModal from "@/components/BotModal";
import { AlertTriangle, CheckCircle2, RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [marketData, setMarketData] = useState<any>(null);
  const [currentPair, setCurrentPair] = useState<string>("BTC/USDT");
  const [bots, setBots] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshingMarket, setIsRefreshingMarket] = useState<boolean>(false);

  // Modals & Banners
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [modalInitialData, setModalInitialData] = useState<any>(null);
  const [editingBot, setEditingBot] = useState<any>(null);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);

  // 1. Fetch Market Data
  const fetchMarketData = useCallback(async () => {
    setIsRefreshingMarket(true);
    try {
      const res = await fetch(`/api/market-data?pair=${encodeURIComponent(currentPair)}`);
      const data = await res.json();
      setMarketData(data);
    } catch (err) {
      console.error("Market data fetch error:", err);
    } finally {
      setIsRefreshingMarket(false);
    }
  }, [currentPair]);

  // 2. Fetch Bots
  const fetchBots = async () => {
    try {
      const res = await fetch("/api/bots");
      const data = await res.json();
      if (data.bots) {
        setBots(data.bots);
      }
    } catch (err) {
      console.error("Bots fetch error:", err);
    }
  };

  // 3. Fetch Orders
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders?limit=40");
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Orders fetch error:", err);
    }
  };

  // Initial Load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchMarketData(), fetchBots(), fetchOrders()]);
      setLoading(false);
    }
    init();
  }, [fetchMarketData]);

  // Market Polling (every 12 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarketData();
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Toggle Bot Status (active / paused)
  const handleToggleBotStatus = async (botId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const res = await fetch("/api/bots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: botId, status: nextStatus }),
      });
      if (res.ok) {
        setBots((prev) =>
          prev.map((b) => (b.id === botId ? { ...b, status: nextStatus } : b))
        );
      }
    } catch (err) {
      console.error("Failed to toggle bot status:", err);
    }
  };

  // Delete Bot
  const handleDeleteBot = async (botId: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo bot?")) return;
    try {
      const res = await fetch(`/api/bots?id=${botId}`, { method: "DELETE" });
      if (res.ok) {
        setBots((prev) => prev.filter((b) => b.id !== botId));
      }
    } catch (err) {
      console.error("Failed to delete bot:", err);
    }
  };

  // Emergency Kill-Switch
  const handleEmergencyStop = async () => {
    setIsStopping(true);
    try {
      const res = await fetch("/api/emergency-stop", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setEmergencyAlert(data.message);
        await Promise.all([fetchBots(), fetchOrders()]);
        setTimeout(() => setEmergencyAlert(null), 8000);
      }
    } catch (err) {
      console.error("Emergency stop failed:", err);
    } finally {
      setIsStopping(false);
    }
  };

  // Deploy from backtester
  const handleDeployFromBacktest = (params: any) => {
    setModalInitialData(params);
    setIsCreateModalOpen(true);
  };

  // Deploy the VAPI 3H strategy from the VAPI Lab
  const handleCreateVapiBot = (payload: any) => {
    setModalInitialData(payload);
    setIsCreateModalOpen(true);
  };

  const activeBotsCount = bots.filter((b) => b.status === "active").length;
  const totalPnL = bots.reduce((acc, b) => acc + Number(b.totalPnL || 0), 0);

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Navbar with brand, live tickers and kill-switch */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        marketData={marketData}
        activeBotsCount={activeBotsCount}
        totalPnL={totalPnL}
        onEmergencyStop={handleEmergencyStop}
        isStopping={isStopping}
      />

      {/* Emergency Alert Toast */}
      {emergencyAlert && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 animate-bounce">
          <div className="p-4 rounded-xl bg-rose-950 border border-rose-500 text-rose-200 text-xs sm:text-sm font-mono flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{emergencyAlert}</span>
            </div>
            <button
              onClick={() => setEmergencyAlert(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
            <div className="text-cyan-400 font-mono text-sm tracking-widest uppercase">
              Inizializzazione Bull Lab Trading Engine...
            </div>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <DashboardTab
                bots={bots}
                recentOrders={orders}
                onOpenCreateModal={() => {
                  setEditingBot(null);
                  setModalInitialData(null);
                  setIsCreateModalOpen(true);
                }}
                onToggleBotStatus={handleToggleBotStatus}
                onDeleteBot={handleDeleteBot}
                onSelectTab={setActiveTab}
                onSelectBotForTradingView={() => {}}
                onEditBot={(bot) => {
                  setEditingBot(bot);
                  setModalInitialData(bot);
                  setIsCreateModalOpen(true);
                }}
                onHistoryCleared={() => {
                  fetchBots();
                  fetchOrders();
                }}
              />
            )}

            {activeTab === "vapi" && (
              <VapiLabTab
                bots={bots}
                onCreateVapiBot={handleCreateVapiBot}
              />
            )}

            {activeTab === "ladder" && (
              <VapiLadderTab
                allLadderBots={bots.filter((b) => b.strategyKey === "vapi_ladder")}
                onPublishBot={async (payload) => {
                  const res = await fetch("/api/bots", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (res.ok) {
                    await fetchBots();
                  }
                }}
              />
            )}

            {activeTab === "golive" && (
              <GoLiveGuideTab
                bots={bots}
                onTradeExecuted={() => {
                  fetchOrders();
                  fetchBots();
                }}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === "exchanges" && <ExchangeGuideTab />}

            {activeTab === "tradingview" && (
              <TradingViewWebhookTab
                bots={bots}
                onTradeExecuted={() => {
                  fetchOrders();
                  fetchBots();
                }}
              />
            )}

            {activeTab === "backtester" && (
              <BacktesterTab onDeployAsBot={handleDeployFromBacktest} />
            )}

            {activeTab === "chart" && (
              <ChartTab
                marketData={marketData}
                currentPair={currentPair}
                setCurrentPair={setCurrentPair}
                onRefresh={fetchMarketData}
                isRefreshing={isRefreshingMarket}
              />
            )}

            {activeTab === "orders" && (
              <OrdersTab
                orders={orders}
                onRefresh={fetchOrders}
                onTradeExecuted={() => {
                  fetchOrders();
                  fetchBots();
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Bot Configuration Modal */}
      <BotModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingBot(null);
          setModalInitialData(null);
        }}
        onCreated={() => {
          fetchBots();
          fetchOrders();
          setEditingBot(null);
          setModalInitialData(null);
          setActiveTab("dashboard");
        }}
        initialData={modalInitialData}
        editBot={editingBot}
      />

      {/* Cyberpunk Bull Lab Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#05070b] py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <BullLabLogo size="md" showTagline={false} />
            <div className="pl-4 border-l border-slate-800">
              <div className="text-white font-bold font-mono">Bull Lab Trading System</div>
              <div className="text-[11px] text-amber-400 font-mono">by Asintomatico · AltcoinItalia</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-mono text-slate-400">
            <a
              href="https://www.bulllab.one/it"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <span>bulllab.one</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://affiliates.ourbit.com/intro"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              <span>OurBit No-KYC</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.bitbase.com/affiliate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <span>Bitbase Affiliate</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://hyperliquid.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>Hyperliquid DEX L1</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-center md:text-right text-[11px] text-slate-500 max-w-sm">
            Tutti gli algoritmi e i dati tecnici sono forniti a scopo educativo e di ricerca quantitativa. Non costituiscono sollecitazione al pubblico risparmio.
          </div>
        </div>
      </footer>
    </div>
  );
}
