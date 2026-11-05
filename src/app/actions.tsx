"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function WebhookUrl() {
  const [url, setUrl] = useState("/api/webhook");
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(window.location.origin + "/api/webhook"), []);
  return <div className="flex flex-wrap gap-3 items-center">
    <code className="text-cyan-200 break-all bg-slate-950 px-3 py-2 rounded-lg border border-cyan-800/50">{url}</code>
    <button className="button-secondary" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? "Copiato ✓" : "Copia indirizzo"}</button>
  </div>;
}

export function SizeControl({ symbol, value }: { symbol: "BTC" | "ETH"; value: number }) {
  const router = useRouter();
  const [usd, setUsd] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => setUsd(String(value)), [value]);
  const n = Number(usd);
  const ok = Number.isFinite(n) && n >= 10;
  async function save() {
    if (!ok) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol, usd: n }) });
      const j = await r.json();
      if (!j.ok) setMsg(j.error || "Salvataggio non riuscito");
      else { setMsg("Size salvata. Vale dai prossimi BUY."); router.refresh(); }
    } catch {
      setMsg("Salvataggio non riuscito");
    } finally { setBusy(false); }
  }
  return (
    <div className="rounded-2xl bg-black/35 border border-white/10 p-4 mt-6">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Size base · 1×</p>
      <div className="flex flex-wrap items-end gap-3 mt-2">
        <label className="field-label">USDT
          <input className="input-field w-36" type="number" min={10} step="10" value={usd} onChange={(e) => { setUsd(e.target.value); setMsg(""); }} />
        </label>
        <button className="button-primary" disabled={busy || !ok} onClick={save}>{busy ? "Salvo…" : "Salva size"}</button>
      </div>
      <p className="text-xs text-slate-400 mt-2">Scala: {ok ? `${n} / ${n * 1.5} / ${n * 2.5}` : "—"} USDT · non modifica i BUY già aperti</p>
      {msg && <p className="text-sm text-cyan-200 mt-1">{msg}</p>}
    </div>
  );
}

export function PineCopy({ pine }: { pine: string }) {
  const [copied, setCopied] = useState(false);
  return <button className="button-primary" onClick={async () => { await navigator.clipboard.writeText(pine); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Script copiato ✓" : "Copia tutto lo script Pine v5"}</button>;
}

type Result = { ok?: boolean; status?: string; reason?: string; error?: string };
export function TestPanel({ secret }: { secret: string }) {
  const router = useRouter();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [event, setEvent] = useState("touch");
  const [vapi, setVapi] = useState("-26");
  const [price, setPrice] = useState("60000");
  const [bar, setBar] = useState(() => String(Date.now()));
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const r = await fetch("/api/webhook", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ secret, ticker: symbol, event, vapi: Number(vapi), price: Number(price), bar_time: bar }) });
      setRes(await r.json());
      router.refresh();
    } catch {
      setRes({ ok: false, reason: "Impossibile contattare il server. Ricarica la pagina e riprova." });
    } finally { setBusy(false); }
  }
  async function reset() {
    if (!confirm("Cancella TUTTI i cicli, le operazioni e i log PAPER, anche quelli arrivati da TradingView. Fallo solo prima di attivare gli alert. Continuare?")) return;
    const r = await fetch("/api/reset", { method: "POST" });
    if (r.ok) { setRes(null); router.refresh(); }
    else setRes({ ok: false, reason: "Reset non riuscito." });
  }
  const input = "input-field";
  return <div className="space-y-4">
    <p className="rounded-lg border border-cyan-800/60 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100"><strong>Simulazione manuale:</strong> −26 e 60000 sono valori di esempio scritti qui. Non sono il VAPI e il prezzo attuali di TradingView. Il test aggiorna però il <strong>medesimo stato PAPER</strong> che useranno gli alert reali: prima di attivarli, puoi azzerare i dati di prova nelle opzioni avanzate.</p>
    <div className="flex flex-wrap gap-3 items-end">
      <label className="field-label">Moneta<select className={input} value={symbol} onChange={e => setSymbol(e.target.value)}><option>BTCUSDT</option><option>ETHUSDT</option></select></label>
      <label className="field-label">Segnale<select className={input} value={event} onChange={e => setEvent(e.target.value)}><option value="touch">BUY · intrabar</option><option value="close">SELL · chiusura 3H</option></select></label>
      <label className="field-label">VAPI simulato<input type="number" step="any" className={input + " w-28"} value={vapi} onChange={e => setVapi(e.target.value)} /></label>
      <label className="field-label">Prezzo simulato USDT<input type="number" step="any" className={input + " w-32"} value={price} onChange={e => setPrice(e.target.value)} /></label>
      <button className="button-primary" disabled={busy} onClick={send}>{busy ? "Invio…" : "Invia test"}</button>
    </div>
    <details className="text-sm text-slate-400"><summary className="cursor-pointer">Opzioni avanzate: cambiare candela / azzerare paper</summary>
      <div className="flex flex-wrap gap-3 items-end mt-3">
        <label className="field-label">ID candela<input className={input} value={bar} onChange={e => setBar(e.target.value)} /></label>
        <button className="button-secondary" onClick={() => setBar(String(Date.now()))}>Nuova candela</button>
        <button className="button-danger" onClick={reset}>Cancella dati paper</button>
      </div>
    </details>
    {res && <div role="status" className={`rounded-xl border px-4 py-3 text-base ${res.status === "executed" ? "border-emerald-600/60 bg-emerald-950/40 text-emerald-200" : res.status === "ignored" ? "border-amber-600/60 bg-amber-950/40 text-amber-100" : "border-rose-600/60 bg-rose-950/40 text-rose-200"}`}>
      <strong>{res.status === "executed" ? "✓ Segnale eseguito in PAPER" : res.status === "ignored" ? "○ Segnale ricevuto, nessuna operazione" : "! Test non riuscito"}</strong>
      <p className="mt-1">{res.reason || res.error}</p>
      {res.status === "ignored" && <p className="text-sm opacity-80 mt-2">È normale se il VAPI non raggiunge la soglia, la candela è già stata usata o non c’è una posizione da vendere.</p>}
      {res.status === "executed" && <p className="text-sm opacity-80 mt-2">Questo prova solo sito e database. TradingView va configurato separatamente.</p>}
    </div>}
  </div>;
}
