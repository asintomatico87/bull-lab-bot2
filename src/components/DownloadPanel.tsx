"use client";

import React, { useEffect, useState } from "react";
import { Download, PackageCheck, ShieldCheck, Terminal, FolderDown, CheckCircle2 } from "lucide-react";

/**
 * Pannello di download del pacchetto completo, pronto per GitHub Desktop.
 * Mostra l'indirizzo assoluto così può essere aperto anche da un'altra scheda.
 */
export default function DownloadPanel() {
  const [origin, setOrigin] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const zipUrl = origin ? `${origin}/bull-lab-bot.zip` : "/bull-lab-bot.zip";

  const copy = async () => {
    await navigator.clipboard.writeText(zipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cyber-card rounded-2xl p-5 sm:p-6 border border-cyan-500/50 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FolderDown className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-black text-white">Scarica il pacchetto completo</h2>
            <p className="text-[11px] text-slate-400">
              Archivio di ~2 MB già pulito: senza <code>node_modules</code> e senza il file{" "}
              <code>.env</code> con la password.
            </p>
          </div>
        </div>
        <a
          href={zipUrl}
          download="bull-lab-bot.zip"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg transition-all"
        >
          <Download className="w-4 h-4" />
          SCARICA .ZIP
        </a>
      </div>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={zipUrl}
          className="w-full bg-[#05080d] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-cyan-300 select-all"
        />
        <button
          onClick={copy}
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300"
        >
          {copied ? "Copiato" : "Copia link"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono">
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#06090e] border border-slate-800">
          <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="text-slate-300">
            Contiene tutto: <strong className="text-white">61 file</strong>, strategia VAPI Ladder, guida e script.
          </span>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#06090e] border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="text-slate-300">
            <strong className="text-white">Nessun segreto</strong> dentro: ricrei il <code>.env</code> con{" "}
            <code>bash setup.sh</code>.
          </span>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#06090e] border border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="text-slate-300">
            Include il repository <strong className="text-white">già inizializzato</strong>: GitHub Desktop lo
            riconosce subito.
          </span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#05080d] border border-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-white uppercase">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Dopo aver scompattato
        </div>
        <pre className="text-[11px] font-mono text-cyan-200 whitespace-pre-wrap leading-relaxed">
{`cd ~/Downloads/bull-lab-bot
ls package.json          # deve rispondere "package.json"
bash setup.sh            # installa, configura e avvia`}
        </pre>
        <p className="text-[10px] text-slate-500">
          Al termine del setup apri http://localhost:3000. Per GitHub Desktop vedi la scheda{" "}
          <strong className="text-slate-300">Vai Live (Facile)</strong>.
        </p>
      </div>
    </div>
  );
}
