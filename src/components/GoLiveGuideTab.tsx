"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Rocket,
  Cpu,
  Radio,
  Wallet,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Zap,
  Clock,
  HelpCircle,
  Key,
  Layers,
  AlertCircle,
} from "lucide-react";
import DeployWizard from "@/components/DeployWizard";
import DownloadPanel from "@/components/DownloadPanel";
import TwoBotsSetup from "@/components/TwoBotsSetup";

interface GoLiveGuideTabProps {
  bots: any[];
  onTradeExecuted: () => void;
  onNavigateTab: (tab: string) => void;
}

export default function GoLiveGuideTab({
  bots,
  onTradeExecuted,
  onNavigateTab,
}: GoLiveGuideTabProps) {
  const [selectedMode, setSelectedMode] = useState<"no_tv" | "with_tv">("no_tv");
  const [autoPilotActive, setAutoPilotActive] = useState<boolean>(true);
  const [runningCheck, setRunningCheck] = useState<boolean>(false);
  const [lastCheckResult, setLastCheckResult] = useState<any>(null);

  // Exchange profiles state
  const [profiles, setProfiles] = useState<any[]>([]);
  const [newPlatform, setNewPlatform] = useState<string>("hyperliquid_dex");
  const [newName, setNewName] = useState<string>("Mio Wallet Hyperliquid Live");
  const [newKey, setNewKey] = useState<string>("");
  const [newWallet, setNewWallet] = useState<string>("");
  const [isTestnet, setIsTestnet] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Absolute webhook URL: TradingView requires a full public HTTPS address
  const [origin, setOrigin] = useState<string>("");
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  // Production readiness (domain, password, database, webhook)
  const [status, setStatus] = useState<any>(null);
  useEffect(() => {
    fetch("/api/config-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);
  const webhookUrl = origin
    ? `${origin}/api/webhook/tradingview`
    : "https://il-tuo-dominio.com/api/webhook/tradingview";

  const ladderBot =
    bots.find((b) => b.strategyKey === "vapi_ladder") ?? bots[0];

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/exchanges");
      const data = await res.json();
      if (data.profiles) setProfiles(data.profiles);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const runAutopilotCheck = async (options?: {
    overrideVapi?: number | null;
    resetCandleLock?: boolean;
    resetAllLadder?: boolean;
  }) => {
    setRunningCheck(true);
    try {
      const res = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: ladderBot?.id,
          overrideVapi: options?.overrideVapi ?? null,
          resetCandleLock: options?.resetCandleLock ?? false,
          resetAllLadder: options?.resetAllLadder ?? false,
        }),
      });
      const data = await res.json();
      setLastCheckResult(data);
      onTradeExecuted();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningCheck(false);
    }
  };

  // Run one live check on mount so user immediately sees real 3H candle + VAPI
  useEffect(() => {
    runAutopilotCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const kycMap: Record<string, string> = {
        hyperliquid_dex: "DECENTRALIZED",
        ourbit_nokyc: "NO_KYC",
        bitbase: "LOW_KYC",
        bybit: "FULL_KYC",
      };
      const res = await fetch("/api/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          platformKey: newPlatform,
          kycType: kycMap[newPlatform] ?? "NO_KYC",
          apiKey: newKey,
          walletAddress: newWallet,
          isTestnet,
          balanceUsdt: "5000",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileMsg("✅ Cassiere collegato e salvato nel database Bull Lab!");
        setNewKey("");
        await fetchProfiles();
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const ladderState =
    lastCheckResult?.ladderState ??
    ladderBot?.config?.ladderState ?? {
      buys: 0,
      sells: 0,
      investedUsdt: 0,
    };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HERO: SPIEGATO COME A UN BIMBO DI 10 ANNI */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#0c192c] via-[#091220] to-[#1d1308] border border-cyan-500/40 shadow-2xl overflow-hidden">
        <div className="absolute -top-12 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold uppercase mb-3">
            <Rocket className="w-3.5 h-3.5 text-emerald-400" />
            Guida Ultra-Semplice · Come a un bimbo di 10 anni
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Come funziona davvero e come metterlo{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">
              in funzione con soldi veri
            </span>
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
            Immagina il tuo Trading System come un gioco fatto di{" "}
            <strong className="text-white">3 mattoncini LEGO</strong> che si parlano tra loro.
            La bella notizia?{" "}
            <strong className="text-emerald-400">
              NON sei obbligato a usare (né a pagare) TradingView!
            </strong>{" "}
            Il tuo sito Bull Lab sa già calcolare l&apos;indicatore VAPI da solo ogni 3 ore.
          </p>

          {/* 3 LEGO BLOCKS */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#070b12]/90 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs font-black">
                  MATTONCINO 1 · L&apos;OROLOGIO
                </span>
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Chi guarda il grafico ogni 3 ore?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ogni 3 ore si chiude una candela su Bitcoin. Qualcuno deve guardare quanto vale il{" "}
                <strong>VAPI</strong> (es. <code>-27</code> oppure <code>+15</code>). Può farlo{" "}
                <strong className="text-emerald-400">Bull Lab da solo (Gratis)</strong> oppure{" "}
                <strong className="text-cyan-300">TradingView</strong>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#070b12]/90 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-black">
                  MATTONCINO 2 · IL VIGILE
                </span>
                <Cpu className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Chi controlla le tue 6 Regole?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                È questo sito (<strong>Bull Lab</strong>). Tiene il conto dei 3 salvadanai:{" "}
                <strong>1° a -25 (1x)</strong>, <strong>2° a -32 (1,5x)</strong>,{" "}
                <strong>3° a -40 (2,5x)</strong>. Se ha già comprato in questa candela, blocca tutto
                fino alle 3 ore successive.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#070b12]/90 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-black">
                  MATTONCINO 3 · IL CASSIERE
                </span>
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Dove stanno i soldi e dove compra?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                I tuoi USDT restano nel tuo account su <strong>Hyperliquid (DEX No-KYC)</strong> o{" "}
                <strong>OurBit / Bybit</strong>. Tu dai a Bull Lab un{" "}
                <em>&quot;permesso solo per comprare/vendere&quot;</em> (Chiave API), che{" "}
                <strong>non può mai prelevare</strong> i tuoi soldi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIGURAZIONE PULITA: due bot definitivi */}
      <TwoBotsSetup />

      {/* PACCHETTO SCARICABILE */}
      <DownloadPanel />

      {/* PORTA ONLINE: GITHUB → NEON → VERCEL → DOMINIO */}
      <DeployWizard />

      {/* DOVE SONO / ACCESSO / DOMINIO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 cyber-card rounded-2xl p-5 border border-cyan-500/40 space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase text-cyan-300">
            <ShieldCheck className="w-4 h-4" /> Il tuo indirizzo Bull Lab
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={origin || "caricamento..."}
              className="flex-1 min-w-[220px] bg-[#05080d] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 select-all"
            />
            <a
              href="/"
              className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-bold"
            >
              Apri il cruscotto
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 leading-relaxed">
            <div className="p-3 rounded-xl bg-[#06090e] border border-slate-800">
              <div className="font-mono font-bold text-white mb-1">Come accedo al cruscotto?</div>
              Apri questo stesso indirizzo: la <strong>Dashboard dei bot è la home page</strong>. Non serve alcun login:
              bot, ordini, VAPI e webhook sono tutti qui. Salvalo tra i preferiti.
            </div>
            <div className="p-3 rounded-xl bg-[#06090e] border border-slate-800">
              <div className="font-mono font-bold text-white mb-1">Questo indirizzo è definitivo?</div>
              È l&apos;indirizzo della <strong>preview</strong>: resta valido finché l&apos;ambiente è attivo. Per un uso
              reale e continuativo serve un <strong>dominio tuo</strong> (es.{" "}
              <code className="text-cyan-300">bot.bulllab.one</code>): in quel caso cambi solo l&apos;URL dentro
              TradingView, il resto è identico.
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200/90 leading-relaxed">
            <strong>Attenzione alla privacy:</strong> il cruscotto non ha password, quindi chiunque abbia il link può
            vedere i bot e crearne di nuovi. Non incollarlo in post pubblici. I soldi restano comunque protetti: per
            muoverli serve la secret del webhook e la chiave API dell&apos;exchange, che vivono solo qui dentro.
          </div>

          {status && (
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold uppercase text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Stato messa in produzione
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    status.readyForLiveTrading
                      ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-950/70 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {status.readyForLiveTrading ? "PRONTO" : "DA COMPLETARE"}
                </span>
              </div>
              <div className="space-y-1.5">
                {status.checks?.map((check: any) => (
                  <div
                    key={check.id}
                    className="flex items-start gap-2 text-[10px] font-mono leading-snug"
                  >
                    <span className={check.ok ? "text-emerald-400" : "text-rose-400"}>
                      {check.ok ? "✓" : "✗"}
                    </span>
                    <span className={check.ok ? "text-slate-300" : "text-slate-400"}>
                      <strong className={check.ok ? "text-emerald-300" : "text-rose-300"}>
                        {check.label}
                      </strong>
                      {!check.ok && <span className="block text-slate-500">{check.hint}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="cyber-card rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase text-amber-300">
            <Key className="w-4 h-4" /> Webhook da incollare in TradingView
          </div>
          <div className="p-3 rounded-xl bg-[#05080d] border border-slate-700 text-[11px] font-mono text-cyan-300 break-all">
            {webhookUrl}
          </div>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(webhookUrl);
              setCopiedWebhook(true);
              setTimeout(() => setCopiedWebhook(false), 2000);
            }}
            className="w-full py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold"
          >
            {copiedWebhook ? "✓ Copiato" : "Copia indirizzo completo"}
          </button>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Deve essere HTTPS e pubblico. Se in futuro cambi dominio, aggiorna questo campo negli alert di TradingView.
          </p>
        </div>
      </div>

      {/* SOTTODOMINIO SU ONE.COM */}
      <div className="cyber-card rounded-2xl p-5 border border-amber-500/40 space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase text-amber-300">
          <Layers className="w-4 h-4" /> Crea il sottodominio su one.com
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Un sottodominio è una &quot;stanza&quot; del tuo dominio: <code className="text-cyan-300">bot.bulllab.one</code>{" "}
          invece di <code className="text-slate-400">bulllab.one</code>. Non si compra: si crea gratis nel pannello dove hai
          preso il dominio. Il valore da mettere nella colonna destra te lo dà l&apos;hosting che scegli (esempio Vercel).
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
          {[
            { label: "Tipo", value: "CNAME" },
            { label: "Hostname / Nome", value: "bot" },
            { label: "Alias di / Valore", value: "cname.vercel-dns.com" },
            { label: "TTL", value: "3600 (default)" },
          ].map((field) => (
            <div key={field.label} className="p-2 rounded-lg bg-[#06090e] border border-slate-800">
              <div className="text-slate-500 uppercase">{field.label}</div>
              <div className="text-amber-200 font-bold break-all">{field.value}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono text-slate-400 leading-relaxed">
          Percorso su one.com: <strong className="text-white">Control Panel → Domain → DNS settings → Create new record → CNAME</strong>.
          Se usi un VPS invece di Vercel, il tipo è <strong className="text-white">A</strong> e il valore è l&apos;IP del server.
          La propagazione richiede da pochi minuti fino a 72 ore.
        </div>
      </div>

      {/* QUANDO SCATTA L'ORDINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cyber-card rounded-2xl p-5 border border-emerald-500/40">
          <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase">Senza TradingView · Regola attuale</div>
          <h3 className="mt-1 text-lg font-black text-white">Buy appena tocca · Sell solo a chiusura</h3>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Il <strong className="text-emerald-300">BUY parte subito</strong>: appena il VAPI live tocca −25 (o −32/−40)
            il motore compra, anche se la candela 3H è ancora aperta.
          </p>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Il <strong className="text-cyan-300">SELL invece aspetta la chiusura</strong>: si guarda il VAPI definitivo
            delle 3 ore e solo se è ≥ 0 / 15 / 22 vende la fetta prevista. Un tocco positivo a metà candela che poi rientra
            non fa vendere.
          </p>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Resta il vincolo della Regola 2: massimo un buy per candela, anche se il VAPI resta sotto il livello per ore.
          </p>
        </div>
        <div className="cyber-card rounded-2xl p-5 border border-cyan-500/40">
          <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase">Con il tuo TradingView Premium · stessa regola</div>
          <h3 className="mt-1 text-lg font-black text-white">Lo script è già ibrido, come il motore</h3>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Lo script generato in <strong className="text-white">Ladder 3H</strong> usa{" "}
            <strong className="text-emerald-300">Once Per Bar</strong> per gli alert di acquisto e{" "}
            <strong className="text-cyan-300">Once Per Bar Close</strong> per quelli di vendita, con{" "}
            <code className="text-cyan-300">calc_on_every_tick = true</code>.
          </p>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Nell&apos;alert di TradingView scegli condizione <em>&quot;Qualsiasi chiamata della funzione alert()&quot;</em> e{" "}
            <strong className="text-white">non impostare un filtro di frequenza</strong>: ogni chiamata porta già la sua
            frequenza corretta. Se ricopi lo script dopo aver cambiato un livello, ricrea anche l&apos;alert.
          </p>
        </div>
      </div>

      {/* MODE SELECTOR: SENZA TRADINGVIEW vs CON TRADINGVIEW */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white uppercase font-mono flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Scegli la strada più comoda per te:
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMode("no_tv")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                selectedMode === "no_tv"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 glow-cyan-sm"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              ⭐ STRADA 1: SENZA TradingView (La più facile & 100% Gratis)
            </button>
            <button
              onClick={() => setSelectedMode("with_tv")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                selectedMode === "with_tv"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500 glow-cyan-sm"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              📡 STRADA 2: CON TradingView (Webhook Alert)
            </button>
          </div>
        </div>

        {selectedMode === "no_tv" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: WHY NO TRADINGVIEW IS BETTER + LIVE CONSOLE */}
            <div className="lg:col-span-2 cyber-card rounded-2xl p-6 border border-emerald-500/40 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase">
                    Consigliato · Zero Abbonamenti Esterni
                  </span>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    Motore Autonomo Bull Lab 3H (Senza TradingView)
                  </h3>
                </div>
                <button
                  onClick={() => setAutoPilotActive(!autoPilotActive)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border transition-all ${
                    autoPilotActive
                      ? "bg-emerald-950 text-emerald-300 border-emerald-500/60"
                      : "bg-slate-900 text-slate-400 border-slate-700"
                  }`}
                >
                  {autoPilotActive ? "🟢 AUTO-PILOT 3H: ATTIVO" : "⏸️ AUTO-PILOT: IN PAUSA"}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#06090e] border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
                <div className="font-bold text-white text-sm">
                  Perché puoi fare a meno di TradingView?
                </div>
                <p>
                  Su TradingView, per mandare i segnali automatici (Webhook) devi pagare l&apos;abbonamento{" "}
                  <strong>TradingView Essential/Plus (~15-30€/mese)</strong> e ricordarti di rinnovare gli
                  alert quando scadono.
                </p>
                <p>
                  Invece la formula del <strong>VAPI di LazyBear</strong> usa solo 4 numeri pubblici di
                  ogni candela a 3 ore: <em>Apertura, Massimo, Minimo, Chiusura e Volume</em>.{" "}
                  <strong className="text-emerald-400">
                    Bull Lab scarica già questi numeri gratis direttamente dall&apos;exchange ogni 3 ore
                  </strong>
                  , calcola il VAPI al centesimo e applica le tue 6 regole!
                </p>
              </div>

              {/* INTERACTIVE LIVE TESTER FOR THE 6 RULES */}
              <div className="p-5 rounded-2xl bg-[#070d17] border border-cyan-500/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Provalo Adesso: Simula o Controlla la Candela 3H Reale
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Clicca il bottone principale per leggere il VAPI reale di mercato in questo istante,
                      oppure simula i 3 gradini della tua Martingala per vedere il bot comprare e vendere!
                    </p>
                  </div>
                </div>

                {/* Big Action Button: Real Market Check */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    disabled={runningCheck}
                    onClick={() => runAutopilotCheck({ overrideVapi: null })}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-black font-black text-xs shadow-lg transition-all disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>
                      {runningCheck
                        ? "Lettura candela 3H..."
                        : "CONTROLLA CANDELA 3H REALE ADESSO"}
                    </span>
                  </button>

                  <button
                    disabled={runningCheck}
                    onClick={() => runAutopilotCheck({ resetAllLadder: true })}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Azzera Scala (0/3)</span>
                  </button>
                </div>

                {/* Quick Simulation Buttons to watch R1-R6 step by step */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-mono text-slate-400 mb-2">
                     Oppure clicca in sequenza questi 4 bottoni per vedere con i tuoi occhi le 6 regole
                    in azione:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      disabled={runningCheck}
                      onClick={() =>
                        runAutopilotCheck({ overrideVapi: -26.4, resetCandleLock: true })
                      }
                      className="p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-left transition-all"
                    >
                      <div className="text-[10px] font-mono text-emerald-400 font-bold">
                        PASSO 1 · VAPI -26.4
                      </div>
                      <div className="text-xs font-extrabold text-white mt-0.5">
                        1° Buy (1x · 500$)
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Soglia ≤ -25</div>
                    </button>

                    <button
                      disabled={runningCheck}
                      onClick={() =>
                        runAutopilotCheck({ overrideVapi: -33.8, resetCandleLock: true })
                      }
                      className="p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-left transition-all"
                    >
                      <div className="text-[10px] font-mono text-emerald-400 font-bold">
                        PASSO 2 · VAPI -33.8
                      </div>
                      <div className="text-xs font-extrabold text-white mt-0.5">
                        2° Buy (1,5x · 750$)
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Soglia ≤ -32</div>
                    </button>

                    <button
                      disabled={runningCheck}
                      onClick={() =>
                        runAutopilotCheck({ overrideVapi: -41.2, resetCandleLock: true })
                      }
                      className="p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-left transition-all"
                    >
                      <div className="text-[10px] font-mono text-emerald-400 font-bold">
                        PASSO 3 · VAPI -41.2
                      </div>
                      <div className="text-xs font-extrabold text-white mt-0.5">
                        3° Buy (2,5x · 1250$)
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Soglia ≤ -40</div>
                    </button>

                    <button
                      disabled={runningCheck}
                      onClick={() =>
                        runAutopilotCheck({ overrideVapi: 23.5, resetCandleLock: true })
                      }
                      className="p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/40 text-left transition-all"
                    >
                      <div className="text-[10px] font-mono text-amber-400 font-bold">
                        PASSO 4 · VAPI +23.5
                      </div>
                      <div className="text-xs font-extrabold text-white mt-0.5">
                        Vendi secondo R6
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Prendi Profitto</div>
                    </button>
                  </div>
                </div>

                {/* Live Result Output Box */}
                {lastCheckResult && (
                  <div className="p-4 rounded-xl bg-[#05080d] border border-slate-700 font-mono text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <span className="text-cyan-400 font-bold">
                        RISULTATO MOTORE 3H ({lastCheckResult.source || "LIVE"}):
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">
                        Buy a mercato: {ladderState.buys} / 3 · Investito: $
                        {ladderState.investedUsdt ?? 0}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed font-sans text-sm">
                      {lastCheckResult.explanation || lastCheckResult.message}
                    </p>
                    {lastCheckResult.order && (
                      <div className="p-2 rounded bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[11px]">
                        Ordine #{lastCheckResult.order.id} registrato:{" "}
                        <strong>{lastCheckResult.order.type}</strong> su{" "}
                        <strong>{lastCheckResult.order.pair}</strong> per{" "}
                        <strong>${lastCheckResult.order.totalUsdt} USDT</strong> @ $
                        {lastCheckResult.order.price}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: THE 3 SIMPLE STEPS TO GO LIVE WITHOUT TRADINGVIEW */}
            <div className="cyber-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                I 3 Passi per partire SENZA TradingView
              </h3>
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="p-3.5 rounded-xl bg-[#06090e] border border-slate-800">
                  <div className="font-mono font-bold text-cyan-400 mb-1">
                    PASSO 1 · Scegli la Base Size
                  </div>
                  Nella scheda <strong>Ladder 3H</strong> imposti il valore del 1° acquisto (es.{" "}
                  <strong>100$</strong> o <strong>500$</strong>). Tieni sempre da parte almeno{" "}
                  <strong>5 volte</strong> quella cifra (1x + 1,5x + 2,5x = 5x totale).
                </div>

                <div className="p-3.5 rounded-xl bg-[#06090e] border border-slate-800">
                  <div className="font-mono font-bold text-amber-400 mb-1">
                    PASSO 2 · Collega il Cassiere qui sotto
                  </div>
                  Inserisci nel box qui sotto la tua chiave API di{" "}
                  <strong>Hyperliquid (DEX No-KYC)</strong> o <strong>OurBit</strong>. All&apos;inizio
                  lascia attiva la spunta <strong>Modalità Testnet / Paper</strong> per fare pratica a
                  rischio zero.
                </div>

                <div className="p-3.5 rounded-xl bg-[#06090e] border border-slate-800">
                  <div className="font-mono font-bold text-emerald-400 mb-1">
                    PASSO 3 · Lascia acceso l&apos;Auto-Pilot 3H
                  </div>
                  Ad ogni chiusura di candela di 3 ore (00:00, 03:00, 06:00, 09:00, 12:00, 15:00,
                  18:00, 21:00), il motore controlla il VAPI e spara gli ordini seguendo le tue 6
                  regole.
                </div>
              </div>

              <button
                onClick={() => onNavigateTab("ladder")}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>Vai a personalizzare i livelli in Ladder 3H</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* STRADA 2: CON TRADINGVIEW */
          <div className="cyber-card rounded-2xl p-6 border border-cyan-500/40 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase font-bold">
              <Radio className="w-4 h-4" />
              Guida Passo-Passo con TradingView (In 4 Click)
            </div>
            <h3 className="text-xl font-black text-white">
              Preferisci vedere i triangolini sul grafico di TradingView? Ecco i 4 passi:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-[#06090e] border border-slate-800 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  CLICK 1 · Copia lo Script
                </span>
                <p className="pt-1">
                  Vai nella scheda <strong>Ladder 3H</strong>, scorri in basso fino al box{" "}
                  <strong>Pine Script v5</strong> e clicca sul pulsante arancione{" "}
                  <strong>&quot;Copia&quot;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#06090e] border border-slate-800 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  CLICK 2 · Imposta 3 Ore (3H)
                </span>
                <p className="pt-1">
                  Apri TradingView su <strong>BTCUSDT</strong>, imposta il tempo delle candele in
                  alto a sinistra su <strong>3h (3 Ore)</strong>, apri in basso{" "}
                  <strong>Pine Editor</strong>, incolla il codice e premi{" "}
                  <strong>&quot;Aggiungi al grafico&quot;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#06090e] border border-slate-800 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                  CLICK 3 · Crea l&apos;Alert
                </span>
                <p className="pt-1">
                  Clicca sull&apos;icona della <strong>Sveglia (Crea Alert)</strong>. Nella voce{" "}
                  <em>Condizione</em> scegli <strong>&quot;Bull Lab VAPI Ladder 3H&quot;</strong> e
                  sotto seleziona{" "}
                  <strong>&quot;Qualsiasi chiamata della funzione alert()&quot;</strong>.
                  Non toccare la frequenza: lo script gestisce da solo{" "}
                  <strong>buy intrabar</strong> e <strong>sell a chiusura</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#06090e] border border-emerald-500/40 space-y-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  CLICK 4 · Incolla il Webhook
                </span>
                <p className="pt-1">
                  Nella scheda <em>Notifiche</em> dell&apos;alert spunta <strong>URL Webhook</strong> e incolla
                  l&apos;indirizzo <strong>completo</strong> (TradingView non accetta percorsi relativi):
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={webhookUrl}
                    className="w-full bg-[#05080d] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-cyan-300 select-all"
                  />
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(webhookUrl);
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    }}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold"
                  >
                    {copiedWebhook ? "Copiato" : "Copia"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Deve essere un indirizzo pubblico HTTPS, raggiungibile da internet. Il messaggio dell&apos;alert lo
                  genera lo script: non scriverlo a mano.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COLLEGA IL CASSIERE (EXCHANGE API / WALLET) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="cyber-card rounded-2xl p-6 border border-amber-500/30 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-bold">
            <Key className="w-4 h-4" />
            Collega il tuo Cassiere (Exchange o DEX)
          </div>
          <h3 className="text-lg font-black text-white">
            Aggiungi Connessione API / Wallet
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Su <strong>Hyperliquid</strong> ti basta generare una{" "}
            <em>&quot;API Agent Key&quot;</em> (non serve KYC e non può prelevare fondi).
          </p>

          <form onSubmit={handleSaveExchange} className="space-y-3 text-xs font-mono">
            {profileMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                {profileMsg}
              </div>
            )}
            <div>
              <label className="text-slate-400">Piattaforma:</label>
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-2 text-white"
              >
                <option value="hyperliquid_dex">Hyperliquid L1 DEX (Zero KYC - Top)</option>
                <option value="ourbit_nokyc">OurBit Futures (No-KYC Affiliate)</option>
                <option value="bitbase">Bitbase Pro Affiliate</option>
                <option value="bybit">Bybit V5 Unified API</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400">Nome Conto:</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400">
                {newPlatform === "hyperliquid_dex"
                  ? "Indirizzo Wallet (0x...):"
                  : "Indirizzo / Subaccount (opzionale):"}
              </label>
              <input
                type="text"
                placeholder="0x4B20...02db"
                value={newWallet}
                onChange={(e) => setNewWallet(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300"
              />
            </div>

            <div>
              <label className="text-slate-400">
                {newPlatform === "hyperliquid_dex"
                  ? "Agent Session Private Key (Solo Trading):"
                  : "API Key / Secret:"}
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••••••"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="mt-1 w-full bg-[#06090e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-300"
              />
            </div>

            <label className="flex items-center gap-2 text-slate-300 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={isTestnet}
                onChange={(e) => setIsTestnet(e.target.checked)}
                className="accent-cyan-400"
              />
              <span>Modalità Protetta (Paper / Testnet prima dei soldi veri)</span>
            </label>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold text-xs shadow-lg glow-orange-sm transition-all"
            >
              {savingProfile ? "Salvataggio..." : "SALVA E COLLEGA CASSIERE"}
            </button>
          </form>
        </div>

        {/* LIST OF CONNECTED EXCHANGES */}
        <div className="lg:col-span-2 cyber-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white uppercase font-mono">
                I Tuoi Cassieri Collegati ({profiles.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">Pronti per esecuzione</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-[#06090e] border border-slate-800 flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-white">{p.name}</div>
                    <div className="text-[11px] font-mono text-cyan-400">{p.platformKey}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      p.isTestnet
                        ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/40"
                        : "bg-amber-950/60 text-amber-300 border-amber-500/40"
                    }`}
                  >
                    {p.isTestnet ? "PAPER / TESTNET" : "LIVE MAINNET"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                  <span>Key: {p.apiKeyMasked || "Configurata"}</span>
                  <span className="text-emerald-400 font-bold">
                    ${Number(p.balanceUsdt || 0).toLocaleString()} USDT
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
