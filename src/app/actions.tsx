"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-neon" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RuleChip({ code, label }: { code: string; label: string }) {
  return (
    <div className="flex items-center gap-2 blk rounded px-3 py-2">
      <span className="font-display text-neon text-xs font-bold border border-neon/40 rounded px-1.5 py-0.5 bg-neon/10">{code}</span>
      <span className="text-sm text-zinc-300 leading-tight">{label}</span>
      <CheckIcon />
    </div>
  );
}

export function WebhookUrl() {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  if (typeof window !== "undefined" && !url) setUrl(window.location.origin + "/api/webhook");
  function copy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  if (!url) return <span className="font-tech text-cyber text-sm">/api/webhook</span>;
  return (
    <div className="flex items-center gap-2">
      <code className="font-tech text-sm text-cyber bg-black/60 border border-cyber/30 rounded px-3 py-1.5 break-all">{url}</code>
      <button onClick={copy} className="shrink-0 font-display text-[11px] font-bold tracking-wider px-3 py-1.5 rounded border border-neon/50 text-neon hover:bg-neon/10 transition">
        {copied ? "COPIATO" : "COPIA"}
      </button>
    </div>
  );
}

export function TestPanel({ secret }: { secret: string }) {
  const router = useRouter();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [event, setEvent] = useState("touch");
  const [vapi, setVapi] = useState("-26");
  const [price, setPrice] = useState("60000");
  const [bar, setBar] = useState(String(Date.now()));
  const [res, setRes] = useState("");

  async function send() {
    const r = await fetch("/api/webhook", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ secret, ticker: symbol, event, vapi: Number(vapi), price: Number(price), bar_time: bar }),
    });
    setRes(JSON.stringify(await r.json()));
    router.refresh();
  }
  async function reset() {
    if (!confirm("Cancellare tutti i dati paper?")) return;
    await fetch("/api/reset", { method: "POST" });
    router.refresh();
  }
  const inp = "bg-black/70 border border-zinc-700 rounded px-2 py-1 text-sm focus:border-cyber/60 outline-none";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <select className={inp} value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          <option>BTCUSDT</option>
          <option>ETHUSDT</option>
        </select>
        <select className={inp} value={event} onChange={(e) => setEvent(e.target.value)}>
          <option value="touch">touch (BUY intrabar)</option>
          <option value="close">close (SELL a chiusura)</option>
        </select>
        <label className="flex items-center gap-1.5 text-zinc-400">
          VAPI <input className={inp + " w-20"} value={vapi} onChange={(e) => setVapi(e.target.value)} />
        </label>
        <label className="flex items-center gap-1.5 text-zinc-400">
          Prezzo <input className={inp + " w-24"} value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="flex items-center gap-1.5 text-zinc-400">
          Bar <input className={inp + " w-40 font-tech text-xs"} value={bar} onChange={(e) => setBar(e.target.value)} />
        </label>
        <button onClick={() => setBar(String(Date.now()))} className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs hover:border-cyber/50 transition">
          Nuova candela
        </button>
        <button onClick={send} className="px-3 py-1 rounded bg-neon text-black font-display font-bold text-xs tracking-wider hover:shadow-[0_0_16px_rgba(255,122,24,0.6)] transition">
          INVIA SEGNALE TEST
        </button>
        <button onClick={reset} className="px-3 py-1 rounded bg-red-950 border border-red-800 text-red-400 text-xs hover:border-red-500 transition">
          RESET
        </button>
      </div>
      {res && <pre className="font-tech text-xs bg-black/80 border border-zinc-800 p-2 rounded overflow-x-auto text-cyber">{res}</pre>}
    </div>
  );
}
