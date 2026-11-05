"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  DollarSign,
  Cpu,
  Layers,
  Key,
  Flame,
  ArrowRight,
  TrendingDown,
  Info,
  Sliders,
  Award,
} from "lucide-react";

interface PlatformInfo {
  id: string;
  name: string;
  category: "DEX_NO_KYC" | "CEX_NO_KYC" | "CEX_FULL_KYC";
  categoryLabel: string;
  url: string;
  kycLevel: "ZERO KYC" | "LOW / NO KYC" | "KYC OBBLIGATORIO";
  makerFee: string;
  takerFee: string;
  apiEaseScore: number; // 1-5
  overallRating: number; // out of 10
  latency: string;
  leverageMax: string;
  recommended: boolean;
  bullLabVerdict: string;
  pros: string[];
  cons: string[];
  apiGuide: string[];
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: "hyperliquid",
    name: "Hyperliquid (Perp L1 DEX)",
    category: "DEX_NO_KYC",
    categoryLabel: "DEX Decentralizzato L1",
    url: "https://hyperliquid.xyz",
    kycLevel: "ZERO KYC",
    makerFee: "-0.002% (Rebate!) a 0.01%",
    takerFee: "0.035%",
    apiEaseScore: 5,
    overallRating: 9.8,
    latency: "< 0.2s (Sub-second)",
    leverageMax: "50x",
    recommended: true,
    bullLabVerdict: "🏆 SCELTA #1 ASSOLUTA PER BULL LAB. Il miglior DEX al mondo per bot algoritmici: 0 gas fee su L1 dedicata (HyperBFT), ZERO KYC, API WebSocket e REST ultra-veloci in Python/TypeScript, custodia fondi nel proprio wallet EVM (Arbitrum).",
    pros: [
      "Nessun KYC: autenticazione via firma crittografica wallet (EVM)",
      "Zero costi di gas su L1 per piazzare/cancellare ordini",
      "Maker fee ultra basse o addirittura negative (ti pagano se piazzi ordini limit)",
      "SDK open-source ufficiali e librerie CCXT / Python",
      "Liquidità paragonabile a Binance su BTC ed ETH",
    ],
    cons: [
      "Richiede un wallet Web3 (Metamask, Rabby) per il deposito iniziale da Arbitrum",
      "Offre solo perps e spot limitati ai token quotati su Hyperliquid",
    ],
    apiGuide: [
      "1. Connetti il tuo wallet (es. Rabby/Metamask) su Hyperliquid e deposita USDC su Arbitrum.",
      "2. Vai su 'Settings' -> 'API Keys / Agent Keys'.",
      "3. Genera una 'Session Agent Key' dedicata al tuo bot (questa chiave ha solo permessi di trading e NON può prelevare!).",
      "4. Copia la chiave privata dell'agente nel configuratore Bull Lab.",
    ],
  },
  {
    id: "ourbit",
    name: "OurBit Futures",
    category: "CEX_NO_KYC",
    categoryLabel: "CEX No-KYC Futures",
    url: "https://affiliates.ourbit.com/intro",
    kycLevel: "LOW / NO KYC",
    makerFee: "0.020%",
    takerFee: "0.040%",
    apiEaseScore: 4,
    overallRating: 8.9,
    latency: "~ 0.3s - 0.5s",
    leverageMax: "200x",
    recommended: true,
    bullLabVerdict: "⭐ OTTIMO COMPROMESSO NO-KYC + PROGRAMMA AFFILIATI. Molto vantaggioso per chi vuole negoziare derivati crypto senza KYC fino a soglie elevate di prelievo, sfruttando rebates tramite affiliazione.",
    pros: [
      "Trading crypto-to-crypto senza verifica dell'identità (No-KYC)",
      "Programma affiliati OurBit con rebate automatico sulle commissioni generate dai bot",
      "Leva finanziaria elevata fino a 200x su coppie principali",
      "API REST e WebSocket compatibili con i formati CEX standard",
    ],
    cons: [
      "Exchange centralizzato: rischio di controparte come qualsiasi CEX offshore",
      "Liquidità inferiore sui mercati secondari (ma ottima su BTC ed ETH)",
    ],
    apiGuide: [
      "1. Registrati tramite il link affiliato OurBit (solo email e password, no documenti).",
      "2. Accedi al profilo utente -> 'API Management'.",
      "3. Crea una nuova chiave API abilitando 'Futures Trading' (disabilita 'Withdrawal').",
      "4. Salva API Key e Secret Key nel tuo bot Bull Lab.",
    ],
  },
  {
    id: "bitbase",
    name: "Bitbase Pro & Affiliate",
    category: "CEX_NO_KYC",
    categoryLabel: "Broker Crypto & Affiliate",
    url: "https://www.bitbase.com/affiliate",
    kycLevel: "LOW / NO KYC",
    makerFee: "0.050%",
    takerFee: "0.075%",
    apiEaseScore: 4,
    overallRating: 8.2,
    latency: "~ 0.5s",
    leverageMax: "10x - 20x",
    recommended: false,
    bullLabVerdict: "💡 INTERESSANTE PER CASH-OUT / AFFILIATI. Ottima struttura per chi integra soluzioni punto vendita o network di referral, ma per trading algoritmico puro ad alta frequenza le fee sono superiori a Hyperliquid.",
    pros: [
      "Programma affiliati ben strutturato con revenue share",
      "Forte presenza fisica in Europa e Spagna per cash in/cash out",
      "Integrazione semplice per automazioni di base",
    ],
    cons: [
      "Commissioni di trading leggermente superiori rispetto a DEX specializzati",
      "Minore profondità di book per ordini di grossa taglia a mercato",
    ],
    apiGuide: [
      "1. Crea un account partner/affiliato su Bitbase.",
      "2. Richiedi l'attivazione delle credenziali API nella sezione sviluppatori.",
      "3. Configura il webhook Bull Lab per instradare gli ordini su Bitbase.",
    ],
  },
  {
    id: "bybit",
    name: "Bybit V5 Unified API",
    category: "CEX_FULL_KYC",
    categoryLabel: "Tier-1 CEX Derivati",
    url: "https://www.bybit.com",
    kycLevel: "KYC OBBLIGATORIO",
    makerFee: "0.020%",
    takerFee: "0.055%",
    apiEaseScore: 5,
    overallRating: 9.1,
    latency: "< 0.15s (Ultra-fast)",
    leverageMax: "100x",
    recommended: false,
    bullLabVerdict: "⚡ LA MIGLIORE ESPERIENZA TECNICA CEX. API v5 eccellenti, supporto totale a CCXT e webhooks, ma richiede KYC di Livello 1 e presenta possibili limitazioni normative in alcune giurisdizioni.",
    pros: [
      "La migliore architettura API del settore CEX (Bybit V5 Unified)",
      "Liquidità monumentale su BTC ed ETH",
      "Websocket a latenza ultra-bassa e rate limits generosi",
    ],
    cons: [
      "KYC obbligatorio di livello 1 con documenti e selfie",
      "Restrizioni regolamentari in continuo mutamento per utenti europei",
    ],
    apiGuide: [
      "1. Completa KYC 1 su Bybit.",
      "2. Vai su 'Profilo' -> 'API' -> 'Crea nuova chiave API'.",
      "3. Scegli 'API di sistema / Integrazione di terze parti' o 'API generata dall'utente'.",
      "4. Seleziona permessi 'Ordini e Posizioni' (NON abilitare 'Prelievo').",
    ],
  },
  {
    id: "dydx",
    name: "dYdX v4 (Cosmos Chain)",
    category: "DEX_NO_KYC",
    categoryLabel: "DEX Decentralizzato Cosmos",
    url: "https://dydx.trade",
    kycLevel: "ZERO KYC",
    makerFee: "0.010%",
    takerFee: "0.050%",
    apiEaseScore: 4,
    overallRating: 8.7,
    latency: "~ 0.4s",
    leverageMax: "20x",
    recommended: false,
    bullLabVerdict: "🛡️ TOTALE DECENTRALIZZAZIONE SU COSMOS. 100% no-KYC e no-gas per piazzare ordini. Tuttavia il volume e l'ecosistema sono stati in parte superati da Hyperliquid nel 2025/2026.",
    pros: [
      "100% No-KYC: gira su blockchain Cosmos sovrana",
      "Nessun costo gas per ordini o cancellazioni",
      "Codice completamente open source",
    ],
    cons: [
      "Configurazione SDK client più macchinosa rispetto a Hyperliquid",
      "Bridge iniziale verso Cosmos richiede qualche passaggio",
    ],
    apiGuide: [
      "1. Connetti Keplr o Metamask su dYdX v4.",
      "2. Genera la chiave di sessione API trading.",
      "3. Inserisci le credenziali nel connettore dYdX di Bull Lab.",
    ],
  },
  {
    id: "binance",
    name: "Binance Futures USD-M",
    category: "CEX_FULL_KYC",
    categoryLabel: "Tier-1 CEX",
    url: "https://www.binance.com",
    kycLevel: "KYC OBBLIGATORIO",
    makerFee: "0.020%",
    takerFee: "0.050%",
    apiEaseScore: 4,
    overallRating: 8.5,
    latency: "< 0.15s",
    leverageMax: "125x",
    recommended: false,
    bullLabVerdict: "⚠️ LIQUIDITÀ MASSIMA MA RESTRIZIONI SUI DERIVATI. Storicamente il punto di riferimento, ma per i residenti in Italia e UE i futures crypto sono fortemente limitati o bloccati per motivi MiCA/CONSOB.",
    pros: [
      "La liquidità più profonda del mondo",
      "Miliardi di script Python e indicatori già pronti",
    ],
    cons: [
      "KYC rigorosissimo",
      "Restrizioni MiCA/CONSOB sui derivati per residenti italiani",
      "Rischio blocco conto improvviso per compliance",
    ],
    apiGuide: [
      "1. Accedi a Binance -> 'Gestione API'.",
      "2. Crea chiave con restrizione IP se usi server cloud fisso.",
      "3. Abilita trading Futures USD-M.",
    ],
  },
];

export default function ExchangeGuideTab() {
  const [filter, setFilter] = useState<"ALL" | "DEX_NO_KYC" | "CEX_NO_KYC" | "CEX_FULL_KYC">("ALL");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformInfo>(PLATFORMS[0]);

  // Fee calculator state
  const [monthlyVolume, setMonthlyVolume] = useState<number>(50000); // 50k$ monthly volume
  const [makerTakerSplit, setMakerTakerSplit] = useState<number>(50); // 50% maker, 50% taker

  const filtered = PLATFORMS.filter((p) => {
    if (filter === "ALL") return true;
    return p.category === filter;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner / Strategic Synthesis */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#0d1624] via-[#0b1320] to-[#18110b] border border-cyan-500/30 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold uppercase mb-4">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Report Strategico Bull Lab Intelligence 2026
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Dove Automatizzare il Trading: <span className="text-cyan-400">Facilità</span> vs{" "}
            <span className="text-amber-400">Costi</span> vs <span className="text-emerald-400">Privacy No-KYC</span>
          </h2>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Per eseguire strategie sistematiche su Bitcoin ed Ethereum tramite API e segnali TradingView, la scelta della piattaforma fa la differenza tra guadagno e perdita per via delle <strong>commissioni di esecuzione</strong>, dei <strong>tempi di latenza</strong> e delle <strong>restrizioni burocratiche (KYC)</strong>.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#090d16]/80 p-4 rounded-xl border border-cyan-500/30">
              <div className="text-cyan-400 text-xs font-mono uppercase font-bold flex items-center gap-1.5">
                <Award className="w-4 h-4" /> 1° Scelta Assoluta: DEX
              </div>
              <div className="mt-1 text-lg font-extrabold text-white">Hyperliquid Perp L1</div>
              <p className="text-xs text-slate-400 mt-1">
                Zero KYC, zero gas fee, rebate su ordini maker, latenza sub-secondo. Fondi nel tuo wallet.
              </p>
            </div>

            <div className="bg-[#090d16]/80 p-4 rounded-xl border border-amber-500/30">
              <div className="text-amber-400 text-xs font-mono uppercase font-bold flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> 1° Scelta CEX No-KYC
              </div>
              <div className="mt-1 text-lg font-extrabold text-white">OurBit Futures</div>
              <p className="text-xs text-slate-400 mt-1">
                Zero KYC crypto-to-crypto, programma affiliati con rimborso fee e leva fino a 200x.
              </p>
            </div>

            <div className="bg-[#090d16]/80 p-4 rounded-xl border border-slate-700">
              <div className="text-slate-300 text-xs font-mono uppercase font-bold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-400" /> Migliore API CEX Tradizionale
              </div>
              <div className="mt-1 text-lg font-extrabold text-white">Bybit V5 Unified</div>
              <p className="text-xs text-slate-400 mt-1">
                API più stabile e documentata al mondo, ma richiede KYC di livello 1 con documenti.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Filtra Piattaforme:</span>
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === "ALL"
                ? "bg-slate-700 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            Tutte ({PLATFORMS.length})
          </button>
          <button
            onClick={() => setFilter("DEX_NO_KYC")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === "DEX_NO_KYC"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                : "bg-slate-900 text-slate-400 hover:text-cyan-300"
            }`}
          >
            DEX No-KYC (Hyperliquid, dYdX)
          </button>
          <button
            onClick={() => setFilter("CEX_NO_KYC")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === "CEX_NO_KYC"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : "bg-slate-900 text-slate-400 hover:text-amber-300"
            }`}
          >
            CEX No-KYC & Affiliate (OurBit, Bitbase)
          </button>
          <button
            onClick={() => setFilter("CEX_FULL_KYC")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === "CEX_FULL_KYC"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                : "bg-slate-900 text-slate-400 hover:text-purple-300"
            }`}
          >
            CEX Regolamentati (Bybit, Binance)
          </button>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Mostrando <span className="text-cyan-400 font-bold">{filtered.length}</span> opzioni
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#090d14]/90 shadow-xl">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#0e1420] text-slate-400 font-mono text-xs uppercase border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Piattaforma</th>
              <th className="py-3 px-3">KYC Status</th>
              <th className="py-3 px-3">Fee Maker / Taker</th>
              <th className="py-3 px-3">Facilità API</th>
              <th className="py-3 px-3">Latenza</th>
              <th className="py-3 px-3">Leva Max</th>
              <th className="py-3 px-3">Bull Lab Rating</th>
              <th className="py-3 px-4 text-right">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.map((p) => {
              const isSelected = selectedPlatform.id === p.id;
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPlatform(p)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-cyan-950/30 border-l-4 border-l-cyan-400"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  <td className="py-3 px-4 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      {p.recommended && (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                          TOP CHOICE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.categoryLabel}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        p.kycLevel === "ZERO KYC"
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                          : p.kycLevel === "LOW / NO KYC"
                          ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {p.kycLevel === "ZERO KYC" ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <ShieldAlert className="w-3 h-3" />
                      )}
                      {p.kycLevel}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <div className="text-emerald-400">{p.makerFee}</div>
                    <div className="text-slate-400 text-xs">{p.takerFee}</div>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      {"★".repeat(p.apiEaseScore)}
                      <span className="text-slate-500 text-xs font-normal">({p.apiEaseScore}/5)</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">{p.latency}</td>
                  <td className="py-3 px-3 font-mono font-bold text-cyan-300">{p.leverageMax}</td>
                  <td className="py-3 px-3 font-mono">
                    <span className="text-white font-extrabold text-sm">{p.overallRating}</span>
                    <span className="text-slate-500 text-xs">/10</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlatform(p);
                      }}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-xs font-semibold transition-colors"
                    >
                      Dettagli & Setup
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Platform Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Verdict & Pros/Cons */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cyber-card rounded-2xl p-6 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-mono text-cyan-400 font-semibold uppercase">
                  {selectedPlatform.categoryLabel}
                </div>
                <h3 className="text-2xl font-black text-white mt-1">{selectedPlatform.name}</h3>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={selectedPlatform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold border border-cyan-500/40 transition-all glow-cyan-sm"
                >
                  <span>Apri Sito Ufficiale</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Bull Lab Verdict Callout */}
            <div className="mt-5 p-4 rounded-xl bg-[#070b12] border border-cyan-500/30 text-slate-200 text-sm leading-relaxed">
              <div className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5 mb-1.5">
                <Flame className="w-4 h-4" /> Il Giudizio dei Trader Bull Lab
              </div>
              <p>{selectedPlatform.bullLabVerdict}</p>
            </div>

            {/* Pros and Cons */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5 mb-3">
                  <CheckCircle2 className="w-4 h-4" /> Punti di Forza
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {selectedPlatform.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <div className="text-xs font-mono font-bold text-rose-400 uppercase flex items-center gap-1.5 mb-3">
                  <XCircle className="w-4 h-4" /> Punti Deboli o Rischi
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {selectedPlatform.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Setup Guide Steps */}
            <div className="mt-6">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-cyan-400" />
                Come Configurare le API per Bull Lab su {selectedPlatform.name}
              </h4>
              <div className="space-y-2 font-mono text-xs">
                {selectedPlatform.apiGuide.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#06090e] border border-slate-800 text-slate-300"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Fee Simulator */}
        <div className="space-y-6">
          <div className="cyber-card rounded-2xl p-6 border border-amber-500/30 glow-orange-sm">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-bold mb-2">
              <DollarSign className="w-4 h-4" />
              Simulatore Costi di Trading & Commissioni
            </div>
            <h4 className="text-lg font-black text-white">Quanto Costa Automatizzare?</h4>
            <p className="text-xs text-slate-400 mt-1">
              Un bot che esegue 50-100 trade al mese può spendere cifre enormi in commissioni se non scegli la piattaforma giusta.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                  <span>Volume Mensile Transato:</span>
                  <span className="text-cyan-400 font-bold">${monthlyVolume.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="500000"
                  step="5000"
                  value={monthlyVolume}
                  onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                  <span>Ordini Limit (Maker):</span>
                  <span className="text-amber-400 font-bold">{makerTakerSplit}% Maker</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={makerTakerSplit}
                  onChange={(e) => setMakerTakerSplit(Number(e.target.value))}
                  className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>

              {/* Cost comparison breakdown */}
              <div className="p-4 rounded-xl bg-[#06090e] border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-[11px] text-slate-400 uppercase font-bold border-b border-slate-800 pb-1">
                  Costo Stimato Commissioni al Mese
                </div>

                {/* Hyperliquid */}
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-semibold">Hyperliquid DEX:</span>
                  <span className="text-emerald-400 font-bold">
                    ${((monthlyVolume * (makerTakerSplit / 100) * 0.0001) + (monthlyVolume * ((100 - makerTakerSplit) / 100) * 0.00035)).toFixed(2)}
                  </span>
                </div>

                {/* OurBit */}
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-semibold">OurBit Futures:</span>
                  <span className="text-slate-200 font-bold">
                    ${((monthlyVolume * (makerTakerSplit / 100) * 0.0002) + (monthlyVolume * ((100 - makerTakerSplit) / 100) * 0.0004)).toFixed(2)}
                  </span>
                </div>

                {/* Bybit */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Bybit V5:</span>
                  <span className="text-slate-300">
                    ${((monthlyVolume * (makerTakerSplit / 100) * 0.0002) + (monthlyVolume * ((100 - makerTakerSplit) / 100) * 0.00055)).toFixed(2)}
                  </span>
                </div>

                {/* Broker Tradizionale */}
                <div className="flex items-center justify-between text-rose-400">
                  <span>Broker Standard (0.10%):</span>
                  <span className="font-bold">${(monthlyVolume * 0.001).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>
                  Con <strong>Hyperliquid</strong> risparmi fino a{" "}
                  <strong>
                    ${((monthlyVolume * 0.001) - ((monthlyVolume * (makerTakerSplit / 100) * 0.0001) + (monthlyVolume * ((100 - makerTakerSplit) / 100) * 0.00035))).toFixed(0)}/mese
                  </strong>{" "}
                  rispetto ai broker classici!
                </span>
              </div>
            </div>
          </div>

          {/* Quick No-KYC Checklist */}
          <div className="cyber-card rounded-2xl p-6 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Perché Scegliere No-KYC / DEX nel 2026?
            </h4>
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                • <strong>Nessun blocco del conto:</strong> I CEX con KYC possono bloccare i fondi per settimane richiedendo buste paga e documenti di provenienza fondi.
              </p>
              <p>
                • <strong>Auto-custodia crittografica:</strong> Con un DEX come Hyperliquid, depositi da Arbitrum via smart contract e prelevi in qualsiasi istante senza autorizzazioni.
              </p>
              <p>
                • <strong>Nessun blocco IP o restrizioni geografiche:</strong> Le API girano liberamente su VPS o webhook senza restrizioni di residenza.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
