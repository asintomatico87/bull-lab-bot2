"use client";

import React, { useEffect, useState } from "react";
import {
  GitBranch,
  Database,
  Cloud,
  KeyRound,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Rocket,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Step = {
  id: string;
  icon: React.ElementType;
  title: string;
  where: string;
  what: string[];
  code?: string;
  note?: string;
};

const STEPS: Step[] = [
  {
    id: "github",
    icon: GitBranch,
    title: "1 · Metti il codice su GitHub",
    where: "github.com",
    what: [
      "Crea un account gratuito su github.com (se non ce l'hai).",
      "Clicca il + in alto a destra → New repository.",
      "Nome: bull-lab-bot. Spunta Private. Non aggiungere README. Crea.",
      "Nella pagina che appare copia il comando della sezione «…or push an existing repository».",
      "Dal progetto, nel terminale, esegui i comandi qui sotto (uno alla volta).",
    ],
    code: `# opzione senza token: login dal browser
bash scripts/publish-github.sh

# oppure manuale
git remote add origin https://github.com/TUO-UTENTE/bull-lab-bot.git
git branch -M main
git push -u origin main`,
    note: "Niente token da copiare? Usa GitHub Desktop (Publish repository, privato) oppure salta GitHub con `bash scripts/deploy-vercel.sh`. Se git chiede la password, incolla un Personal Access Token, non la password dell'account. Il file .env resta escluso dal repository.",
  },
  {
    id: "database",
    icon: Database,
    title: "2 · Crea il database di produzione",
    where: "neon.com",
    what: [
      "Registrati su neon.com (piano gratuito) oppure supabase.com.",
      "New Project → nome bull-lab → regione Frankfurt (la più vicina all'Italia).",
      "Copia la stringa «Connection string» che inizia con postgresql:// e contiene sslmode=require.",
      "Tienila da parte: ti servirà due volte, qui e su Vercel.",
    ],
    note: "Non usare il database di questa preview: è interno e non raggiungibile da internet.",
  },
  {
    id: "tabelle",
    icon: Database,
    title: "3 · Crea le tabelle e i dati iniziali",
    where: "terminale del progetto",
    what: [
      "Nella cartella del progetto apri il terminale.",
      "Lancia i due comandi qui sotto, sostituendo la stringa con quella di Neon.",
      "Il primo crea le tabelle, il secondo inserisce le strategie e il bot VAPI Ladder.",
    ],
    code: `DATABASE_URL="postgresql://..." npx drizzle-kit push
DATABASE_URL="postgresql://..." node src/db/run-seed.js`,
  },
  {
    id: "vercel",
    icon: Cloud,
    title: "4 · Carica il sito su Vercel",
    where: "vercel.com",
    what: [
      "Vai su vercel.com → Continue with GitHub (così vede i tuoi repository).",
      "Add New… → Project → Import il repository bull-lab-bot.",
      "Framework: Next.js (lo riconosce da solo). Non cambiare Build Command.",
      "Prima di premere Deploy apri «Environment Variables» e inserisci le 4 variabili del passo 5.",
      "Premi Deploy e attendi 1-2 minuti.",
    ],
  },
  {
    id: "env",
    icon: KeyRound,
    title: "5 · Inserisci le 4 variabili",
    where: "Vercel → Settings → Environment Variables",
    what: [
      "DATABASE_URL = la stringa di Neon del passo 2.",
      "NEXT_PUBLIC_APP_URL = https://bot.bulllab.one",
      "DASHBOARD_USER = un nome utente a piacere.",
      "DASHBOARD_PASSWORD = una password lunga, diversa da quelle che usi altrove.",
      "Dopo l'aggiunta, Vercel chiede un Redeploy: fallo.",
    ],
    note: "Le due variabili DASHBOARD_* attivano la richiesta di utente e password sul cruscotto. Webhook e healthcheck restano pubblici.",
  },
  {
    id: "dominio",
    icon: Globe,
    title: "6 · Collega bot.bulllab.one",
    where: "Vercel + one.com",
    what: [
      "Su Vercel: Settings → Domains → Add → scrivi bot.bulllab.one → Add.",
      "Vercel mostra un record CNAME con il valore da usare (tipo cname.vercel-dns.com).",
      "Su one.com: Control Panel → Domain → DNS settings → Create new record → CNAME.",
      "Hostname: bot — Is an alias of: il valore mostrato da Vercel — TTL: vuoto → Create record.",
      "Attendi la propagazione: da pochi minuti fino a 72 ore. Vercel emette HTTPS da solo.",
    ],
  },
  {
    id: "verifica",
    icon: ShieldCheck,
    title: "7 · Controlla che sia tutto ok",
    where: "il tuo nuovo indirizzo",
    what: [
      "Apri https://bot.bulllab.one e inserisci utente e password del passo 5.",
      "Apri https://bot.bulllab.one/api/config-status: le 5 voci devono essere tutte verdi (true).",
      "Se una è rossa, il testo sotto spiega cosa manca.",
      "Nel cruscotto, scheda Vai Live (Facile), il riquadro «Stato messa in produzione» deve dire PRONTO.",
    ],
  },
  {
    id: "tradingview",
    icon: Rocket,
    title: "8 · Aggiorna TradingView",
    where: "tradingview.com",
    what: [
      "L'URL del webhook cambia: era quello della preview, ora è il tuo dominio.",
      "Apri ogni alert → Impostazioni → URL Webhook e incolla il nuovo indirizzo.",
      "Nuovo indirizzo: https://bot.bulllab.one/api/webhook/tradingview",
      "La secret del bot NON cambia: non serve rifare gli alert, solo sostituire l'URL.",
      "Prova con un alert manuale e controlla che compaia nella scheda Ordini & Log.",
    ],
    note: "Il primo ciclo fallo in modalità paper con base size piccola. Solo dopo passa alle chiavi live.",
  },
];

const STORAGE_KEY = "bulllab-deploy-progress";

export default function DeployWizard() {
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>("github");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((item) => item !== id) : [...done, id];
    setDone(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const progress = Math.round((done.length / STEPS.length) * 100);

  return (
    <div className="cyber-card rounded-2xl p-5 sm:p-6 border border-cyan-500/40 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-black text-white">Porta online il sito — 8 passi</h2>
            <p className="text-[11px] text-slate-400">
              GitHub → Neon (database) → Vercel → dominio one.com → TradingView. Il progresso resta salvato in questo
              browser.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-28 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-cyan-300">
            {done.length}/{STEPS.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const isOpen = open === step.id;
          const isDone = done.includes(step.id);
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-all ${
                isDone
                  ? "bg-emerald-950/20 border-emerald-500/40"
                  : isOpen
                  ? "bg-[#070d17] border-cyan-500/40"
                  : "bg-[#06090e] border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5 p-3">
                <button
                  onClick={() => toggle(step.id)}
                  aria-label={`Segna come completato: ${step.title}`}
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isDone
                      ? "bg-emerald-500 border-emerald-400 text-black"
                      : "border-slate-600 text-transparent hover:border-cyan-400"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <Icon className={`w-4 h-4 shrink-0 ${isDone ? "text-emerald-400" : "text-cyan-400"}`} />
                <button
                  onClick={() => setOpen(isOpen ? null : step.id)}
                  className="flex-1 text-left flex items-center justify-between gap-2"
                >
                  <span className={`text-xs sm:text-sm font-bold ${isDone ? "text-emerald-300" : "text-white"}`}>
                    {step.title}
                    <span className="ml-2 text-[10px] font-mono text-slate-500">{step.where}</span>
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>

              {isOpen && (
                <div className="px-3 pb-3 pl-11 space-y-2">
                  <ol className="space-y-1 text-[11px] text-slate-300 leading-relaxed list-decimal list-inside">
                    {step.what.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>

                  {step.code && (
                    <div className="relative">
                      <pre className="bg-[#05080d] border border-slate-800 rounded-lg p-3 text-[10.5px] font-mono text-cyan-200 overflow-x-auto whitespace-pre">
{step.code}
                      </pre>
                      <button
                        onClick={() => copy(step.id, step.code as string)}
                        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white"
                      >
                        {copied === step.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copiato
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copia
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {step.note && (
                    <p className="text-[10.5px] text-amber-200/90 bg-amber-950/20 border border-amber-500/30 rounded-lg p-2 leading-relaxed">
                      {step.note}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-[11px] text-emerald-200/90">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          Ordine consigliato: fai prima GitHub e Neon (passi 1-3), poi Vercel (4-5) e solo alla fine il dominio (6). Così
          ogni pezzo è pronto quando colleghi il successivo.
        </p>
      </div>
    </div>
  );
}
