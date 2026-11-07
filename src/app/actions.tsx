"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PriceState = { BTC: number | null; ETH: number | null; prevBTC: number | null; prevETH: number | null; ok: boolean };

function PriceBox({ coin, price, prev, tone }: { coin: string; price: number | null; prev: number | null; tone: "cyan" | "orange" }) {
  const up = price !== null && prev !== null && price > prev;
  const down = price !== null && prev !== null && price < prev;
  const fmt = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className={`glass rounded-2xl px-5 py-3 flex items-center justify-between gap-4 ${tone === "cyan" ? "glass-cyan" : "glass-orange"}`}>
      <div>
        <p className="kicker">{coin} / USDC · Hyperliquid</p>
        <p className={`metric text-3xl md:text-4xl mt-1 ${up ? "text-emerald-300" : down ? "text-rose-300" : "text-white"}`}>
          {price !== null ? `${fmt(price)} $` : "—"}
        </p>
      </div>
      <span className={`text-2xl font-black ${up ? "text-emerald-300" : down ? "text-rose-300" : "text-slate-600"}`}>{up ? "▲" : down ? "▼" : "•"}</span>
    </div>
  );
}

export function LivePrices() {
  const [p, setP] = useState<PriceState>({ BTC: null, ETH: null, prevBTC: null, prevETH: null, ok: true });
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await fetch("/api/prices", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (j.ok) setP((o) => ({ BTC: j.BTC, ETH: j.ETH, prevBTC: o.BTC, prevETH: o.ETH, ok: true }));
        else setP((o) => ({ ...o, ok: false }));
      } catch {
        if (alive) setP((o) => ({ ...o, ok: false }));
      }
    }
    tick();
    const id = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return (
    <section aria-label="Prezzi in tempo reale" className="space-y-2">
      <div className="grid md:grid-cols-2 gap-4">
        <PriceBox coin="BTC" price={p.BTC} prev={p.prevBTC} tone="cyan" />
        <PriceBox coin="ETH" price={p.ETH} prev={p.prevETH} tone="orange" />
      </div>
      {!p.ok && <p className="text-xs text-amber-200">Prezzo momentaneamente non disponibile, riprovo tra pochi secondi.</p>}
    </section>
  );
}

export function SiteHeader({ liveLabel }: { liveLabel: string }) {
  return (
    <header className="rounded-[28px] px-5 md:px-8 py-6 md:py-7 flex items-center justify-between gap-5 flex-wrap border border-orange-400/25 bg-gradient-to-r from-[#061018] via-[#0b1220] to-[#1a0e06]">
      <div className="wordmark">
        <span className="word-bull">Bull</span>
        <span className="word-lab">LAB</span>
        <span className="word-sub">Powered by AltcoinItalia · by Asintomatico</span>
        <span className="h1 text-lg md:text-xl text-cyan-200">Trading Automatizzato</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5">
          <span className="live-dot" />
          <span className="text-xs font-extrabold tracking-widest text-cyan-200">{liveLabel}</span>
        </div>
      </div>
    </header>
  );
}

export function WebhookUrl({ path = "/api/webhook" }: { path?: string }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(window.location.origin + path), [path]);
  return <div className="flex flex-wrap gap-3 items-center">
    <code className="text-cyan-200 break-all bg-slate-950 px-3 py-2 rounded-lg border border-cyan-800/50">{url}</code>
    <button className="button-secondary" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? "Copiato ✓" : "Copia indirizzo"}</button>
  </div>;
}

export function SystemLiveToggle({ system, live, ready }: { system: "vapi-btc" | "vapi-eth" | "rsi-btc" | "rsi-eth"; live: boolean; ready: boolean }) {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(on: boolean) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "systemLive", system, live: on, confirm: word }) });
      const j = await r.json();
      if (!j.ok) setMsg(j.error || "Operazione non riuscita");
      else { setWord(""); router.refresh(); }
    } catch { setMsg("Operazione non riuscita"); }
    finally { setBusy(false); }
  }
  return (
    <div className="rounded-2xl bg-black/35 border border-white/10 p-4 mt-4 space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Questo sistema</p>
      <p className={`font-extrabold ${live ? "text-rose-300" : "text-orange-300"}`}>{live ? "LIVE HYPERLIQUID" : "PAPER"}</p>
      {live ? (
        <button className="button-secondary w-full" disabled={busy} onClick={() => go(false)}>Torna a PAPER</button>
      ) : (
        <>
          <input className="input-field w-full" placeholder="Scrivi LIVE" value={word} onChange={(e) => setWord(e.target.value)} />
          <button className="button-danger w-full" disabled={busy || !ready} onClick={() => go(true)}>Passa a soldi veri</button>
          {!ready && <p className="text-xs text-slate-400">Si attiva appena su Vercel sono presenti HL_ACCOUNT_ADDRESS e HL_AGENT_PRIVATE_KEY.</p>}
        </>
      )}
      {msg && <p className="text-xs text-rose-200">{msg}</p>}
    </div>
  );
}

export function ModePanel({ liveCount, kill, ready, testnet }: { liveCount: number; kill: boolean; ready: boolean; testnet: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function post(body: Record<string, unknown>) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!j.ok) setMsg(j.error || "Operazione non riuscita");
      else router.refresh();
    } catch { setMsg("Operazione non riuscita"); }
    finally { setBusy(false); }
  }
  return (
    <div className="glass rounded-3xl p-5 space-y-3">
      <p className="kicker">Esecuzione</p>
      <p className={`h1 text-2xl ${liveCount > 0 && !kill ? "text-rose-300" : "text-orange-300"}`}>{kill ? "BLOCCATO" : liveCount > 0 ? `${liveCount}/4 LIVE` : "TUTTO PAPER"}</p>
      <p className="text-sm text-slate-300 leading-relaxed">
        {ready ? (testnet ? "Chiavi Hyperliquid · TESTNET" : "Chiavi Hyperliquid · MAINNET") : "Chiavi Hyperliquid assenti."}
        {" "}Ogni sistema ha il proprio tasto LIVE. Kill switch ferma tutti.
      </p>
      <button className={kill ? "button-primary w-full" : "button-danger w-full"} disabled={busy} onClick={() => post({ action: "kill", kill: !kill })}>
        {kill ? "Disattiva kill switch" : "Kill switch · ferma gli ordini"}
      </button>
      <button className="button-secondary w-full" disabled={busy} onClick={async () => {
        if (!confirm("Cancella TUTTI i cicli e le operazioni del cruscotto (BTC e ETH). Non chiude posizioni su Hyperliquid. Continuare?")) return;
        setBusy(true); setMsg("");
        try {
          const r = await fetch("/api/reset", { method: "POST" });
          if (!r.ok) setMsg("Azzeramento non riuscito");
          else { setMsg("Cicli paper azzerati. Ora puoi passare al LIVE."); router.refresh(); }
        } catch { setMsg("Azzeramento non riuscito"); }
        finally { setBusy(false); }
      }}>Azzera cicli paper</button>
      {msg && <p className="text-sm text-cyan-200">{msg}</p>}
    </div>
  );
}

export function SizeControl({ symbol, value, book = "vapi" }: { symbol: "BTC" | "ETH"; value: number; book?: "vapi" | "rsi" }) {
  const router = useRouter();
  const [usd, setUsd] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => setUsd(String(value)), [value]);
  const n = Number(usd);
  const min = book === "rsi" ? 1 : 10;
  const ok = Number.isFinite(n) && n >= min;
  const scale = book === "rsi" ? `${n} / ${n * 2} / ${n * 3}` : `${n} / ${n * 1.5} / ${n * 2.5}`;
  async function save() {
    if (!ok) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol, usd: n, book }) });
      const j = await r.json();
      if (!j.ok) setMsg(j.error || "Salvataggio non riuscito");
      else { setMsg("Size salvata. Vale dai prossimi ingressi."); router.refresh(); }
    } catch {
      setMsg("Salvataggio non riuscito");
    } finally { setBusy(false); }
  }
  return (
    <div className="rounded-2xl bg-black/35 border border-white/10 p-4 mt-6">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{book === "rsi" ? "Size RSI · 1× (12 USDT default)" : "Size VAPI · 1×"}</p>
      <div className="flex flex-wrap items-end gap-3 mt-2">
        <label className="field-label">USDT
          <input className="input-field w-36" type="number" min={min} step={book === "rsi" ? 1 : 10} value={usd} onChange={(e) => { setUsd(e.target.value); setMsg(""); }} />
        </label>
        <button className="button-primary" disabled={busy || !ok} onClick={save}>{busy ? "Salvo…" : "Salva size"}</button>
      </div>
      <p className="text-xs text-slate-400 mt-2">Scala: {ok ? scale : "—"} USDT · vale dai prossimi ingressi. Non cambia gli scalini già aperti.</p>
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
      const r = await fetch("/api/webhook", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ secret, ticker: symbol, event, vapi: Number(vapi), price: Number(price), bar_time: bar, paper: true }) });
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

export function RsiTestPanel({ secret }: { secret: string }) {
  const router = useRouter();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [event, setEvent] = useState("touch");
  const [rsi, setRsi] = useState("22");
  const [price, setPrice] = useState("60000");
  const [bar, setBar] = useState(() => String(Date.now()));
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      const r = await fetch("/api/webhook/rsi", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ secret, ticker: symbol, event, rsi: Number(rsi), price: Number(price), bar_time: bar, paper: true }),
      });
      setRes(await r.json());
      router.refresh();
    } catch {
      setRes({ ok: false, reason: "Impossibile contattare il server." });
    } finally { setBusy(false); }
  }
  const input = "input-field";
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300"><b>touch</b> = ingresso long/short al tocco. <b>close</b> = uscita solo a chiusura candela. Tra due ingressi serve una candela vuota (90 min).</p>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="field-label">Moneta<select className={input} value={symbol} onChange={(e) => setSymbol(e.target.value)}><option>BTCUSDT</option><option>ETHUSDT</option></select></label>
        <label className="field-label">Segnale<select className={input} value={event} onChange={(e) => setEvent(e.target.value)}><option value="touch">touch (ingresso)</option><option value="close">close (uscita)</option></select></label>
        <label className="field-label">RSI simulato<input className={input + " w-24"} type="number" step="any" value={rsi} onChange={(e) => setRsi(e.target.value)} /></label>
        <label className="field-label">Prezzo<input className={input + " w-28"} type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <button className="button-secondary" onClick={() => setBar(String(Date.now()))}>Nuova candela 45m</button>
        <button className="button-primary" disabled={busy} onClick={send}>{busy ? "Invio…" : "Test RSI"}</button>
      </div>
      {res && <div className={`rounded-xl border px-4 py-3 text-sm ${res.status === "executed" ? "border-emerald-600/60 text-emerald-200" : "border-amber-600/60 text-amber-100"}`}><b>{res.status}</b> — {res.reason || res.error}</div>}
    </div>
  );
}
