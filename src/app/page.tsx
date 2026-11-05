import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { cycles, trades, webhookLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PineCopy, TestPanel, WebhookUrl } from "./actions";
import { PINE } from "@/lib/pine";
import { BASE_USD } from "@/lib/strategy";

export const dynamic = "force-dynamic";
const badge = (status: string) => status === "executed" ? "text-emerald-300" : status === "ignored" ? "text-amber-200" : "text-rose-300";

export default async function Home() {
  await ensureSchema();
  const secret = process.env.WEBHOOK_SECRET || "bulllab";
  const [open, closed, logs, tr] = await Promise.all([
    db.select().from(cycles).where(eq(cycles.status, "open")),
    db.select().from(cycles).where(eq(cycles.status, "closed")),
    db.select().from(webhookLogs).orderBy(desc(webhookLogs.id)).limit(30),
    db.select().from(trades).orderBy(desc(trades.id)).limit(40),
  ]);
  const realized = [...open, ...closed].reduce((total, c) => total + c.realizedPnl, 0);
  const title = "font-display text-lg md:text-xl font-bold text-white tracking-wide";
  const card = "panel rounded-2xl p-5 md:p-7";

  return <main className="min-h-screen relative">
    <div className="absolute inset-0 bg-grid pointer-events-none" />
    <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10 space-y-7">
      <header className="panel rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <img src="/images/logo.jpg" alt="Bull Lab" className="h-14 md:h-20 max-w-[66%] object-contain mix-blend-screen" />
        <div className="flex items-center gap-4"><div className="text-right"><h1 className="font-display text-cyan-300 text-sm md:text-lg font-bold">VAPI LADDER 3H</h1><span className="text-amber-300 font-bold text-sm">● SOLO PAPER</span></div><img src="/images/profile.jpg" alt="Asintomatico" className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-cyan-400/70" /></div>
      </header>

      <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 px-5 py-4 text-amber-100 text-base md:text-lg leading-relaxed">
        <strong>Prima di tutto:</strong> il test qui sotto funziona anche <strong>senza TradingView</strong>. Se risponde “eseguito”, sito e database comunicano. Gli ordini rimangono simulati: non viene inviato nulla a Hyperliquid.
      </div>

      <nav aria-label="Passaggi di configurazione" className="flex flex-wrap gap-3">
        <a className="quick-link" href="#test">1 · Prova il server</a><a className="quick-link" href="#pine">2 · Copia lo script Pine</a><a className="quick-link" href="#alert">3 · Imposta TradingView</a><a className="quick-link" href="#logs">Log e operazioni</a>
      </nav>

      <section id="test" className={card}>
        <div className="step">PASSO 1</div><h2 className={title}>Prova il webhook</h2>
        <p className="explain">Premi <b>Invia test</b> con i valori già scritti (BTC, BUY, VAPI −26). È un’operazione <b>paper</b> da 500 USDT, non un ordine reale. Se lo ripeti sulla stessa candela, “ignorato” è corretto.</p>
        <TestPanel secret={secret} />
      </section>

      <section id="pine" className={card}>
        <div className="step">PASSO 2</div><h2 className={title}>Script Pine v5 — qui, pronto da copiare</h2>
        <p className="explain">Questo <b>unico script</b> controlla entrambe le condizioni: invia il BUY quando il VAPI tocca il livello <b>durante</b> una candela 3H; invia la chiusura della candela per valutare il SELL. Il server mantiene la posizione, gli scaglioni già comprati e le vendite già eseguite. Non servono due alert diversi per BUY e SELL.</p>
        <div className="flex flex-wrap items-center gap-3 mb-4"><PineCopy pine={PINE} /><span className="text-slate-300 text-sm">Clicca, poi incolla in TradingView → Pine Editor → Salva → Aggiungi al grafico.</span></div>
        <details className="rounded-xl border border-slate-700 bg-slate-950/80 p-4"><summary className="cursor-pointer font-semibold text-cyan-200 text-base">Mostra il codice completo sullo schermo</summary><pre className="mt-4 max-h-[460px] overflow-auto whitespace-pre text-sm text-slate-200 leading-relaxed font-mono">{PINE}</pre></details>
        <p className="text-sm text-slate-400 mt-3">Nel Pine Editor devi incollare <b>tutto</b>, partendo da <code>//@version=5</code>. Il vecchio script non va usato insieme a questo.</p>
      </section>

      <section id="alert" className={card}>
        <div className="step">PASSO 3</div><h2 className={title}>Crea gli alert su TradingView</h2>
        <div className="space-y-4 mt-4">
          <div className="instruction"><b className="text-cyan-300">A ·</b> Apri il grafico <b>BTCUSDT</b> su timeframe <b>3H</b>, aggiungi lo script copiato sopra. Nelle impostazioni dello script lascia periodo <b>10</b>, ticker <b>BTCUSDT</b> e imposta il Webhook secret indicato sotto.</div>
          <div className="instruction"><b className="text-cyan-300">B ·</b> Crea <b>un solo alert per BTC</b> con Condizione <b>BL_VAPI_LADDER → Any alert() function call</b>. Lascia il messaggio dell’alert com’è: il testo JSON viene generato da <code>alert()</code> nello script. Abilita la voce <b>Webhook URL</b> e incolla l’indirizzo qui sotto.</div>
          <div className="instruction"><b className="text-cyan-300">C ·</b> Ripeti su <b>ETHUSDT, timeframe 3H</b>: aggiungi lo stesso script ma imposta <b>Ticker = ETHUSDT</b>; crea un secondo alert per ETH. Per entrambi, lo stesso secret e lo stesso indirizzo webhook.</div>
        </div>
        <div className="rounded-xl bg-slate-950/80 border border-cyan-800/50 p-4 mt-5 space-y-3">
          <div><span className="field-label">Indirizzo webhook (da inserire in entrambi gli alert)</span><WebhookUrl /></div>
          <div><span className="field-label">Webhook secret (nel campo dello script Pine)</span><code className="text-lg text-amber-200 break-all">{secret}</code></div>
        </div>
        <p className="text-sm text-slate-300 mt-4">Se modifichi lo script, ricrea gli alert: TradingView conserva una copia della versione usata quando li hai creati. Serve la 2FA sull’account TradingView per i webhook.</p>
      </section>

      <section className="grid md:grid-cols-3 gap-4" aria-label="Posizioni paper">
        {["BTC", "ETH"].map((symbol) => { const c = open.find((v) => v.symbol === symbol); return <div className="panel rounded-2xl p-5" key={symbol}>
          <h2 className="font-display text-xl text-cyan-200 font-bold">{symbol} / USDT</h2><p className="text-lg text-white font-semibold mt-2">{c ? `Posizione aperta · ${c.entries}/3 BUY` : "Nessuna posizione aperta"}</p>
          <p className="text-slate-300 mt-2">{c ? `Quantità: ${c.qty.toFixed(6)} · Prezzo medio: ${(c.cost / c.qty).toFixed(2)} $` : "Primo BUY quando VAPI ≤ −25"}</p>
          {c && <p className="text-amber-200 mt-2">Uscite eseguite: {c.exitStage === 0 ? "nessuna" : c.exitStage}</p>}
        </div>; })}
        <div className="panel rounded-2xl p-5"><h2 className="font-display text-lg text-amber-200 font-bold">PnL realizzato</h2><p className={`text-3xl font-bold mt-3 ${realized >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{realized.toFixed(2)} $</p><p className="text-slate-400 mt-2">{closed.length} cicli chiusi · base {BASE_USD} USDT</p></div>
      </section>

      <section className={card}><h2 className={title}>Regole attive · BUY e SELL insieme</h2><div className="grid md:grid-cols-2 gap-5 mt-4 text-base text-slate-200 leading-relaxed">
        <div className="instruction"><strong className="text-cyan-200">BUY intrabar</strong><p>Massimo 3 per ciclo: VAPI ≤ −25 / −32 / −40, importi {BASE_USD} / {BASE_USD * 1.5} / {BASE_USD * 2.5} USDT. Solo lo scalino successivo, uno per candela 3H. Niente altri BUY dopo una vendita parziale.</p></div>
        <div className="instruction"><strong className="text-amber-200">SELL alla chiusura 3H</strong><p>1 BUY: ≥12 chiude tutto. 2 BUY: ≥5 vende 50%, poi ≥15 chiude il resto. 3 BUY: ≥0 vende 50%, poi ≥15 metà del rimanente, poi ≥22 chiude tutto. Una tappa per candela. Nessuno stop loss.</p></div>
      </div></section>

      <section id="logs" className={card}><h2 className={title}>Ultimi segnali ricevuti</h2><p className="explain">Se un alert TradingView non compare qui, non è arrivato al bot. “Ignorato” significa che è arrivato ma non soddisfa la regola.</p><div className="max-h-96 overflow-y-auto space-y-2">
        {logs.length === 0 && <p className="text-slate-300">Nessun segnale ricevuto per ora.</p>}
        {logs.map(l => <div key={l.id} className="border-b border-slate-700/70 pb-2 text-sm md:text-base flex flex-wrap gap-x-3"><time className="text-slate-400">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</time><b className={badge(l.status)}>{l.status.toUpperCase()}</b><span className="text-slate-200">{l.reason}</span></div>)}
      </div></section>

      <section className={card}><h2 className={title}>Operazioni paper</h2><div className="overflow-x-auto mt-4"><table className="w-full text-sm md:text-base text-left"><thead className="text-slate-300 border-b border-slate-600"><tr><th className="pb-3 pr-4">Data UTC</th><th className="pb-3 pr-4">Moneta</th><th className="pb-3 pr-4">Lato</th><th className="pb-3 pr-4">Prezzo</th><th className="pb-3 pr-4">Quantità</th><th className="pb-3 pr-4">PnL $</th><th className="pb-3">Regola</th></tr></thead><tbody>{tr.map(t => <tr key={t.id} className="border-b border-slate-800/80"><td className="py-2 pr-4 whitespace-nowrap">{t.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td><td className="pr-4">{t.symbol}</td><td className={`pr-4 font-bold ${t.side === "BUY" ? "text-emerald-300" : "text-amber-300"}`}>{t.side}</td><td className="pr-4">{t.price}</td><td className="pr-4">{t.qty.toFixed(6)}</td><td className="pr-4">{t.side === "SELL" ? t.pnl.toFixed(2) : "—"}</td><td>{t.note}</td></tr>)}{tr.length === 0 && <tr><td colSpan={7} className="py-4 text-slate-400">Nessuna operazione paper.</td></tr>}</tbody></table></div></section>

      <details className={card}><summary className="cursor-pointer text-lg font-semibold text-cyan-200">Devo scaricare di nuovo il progetto per GitHub?</summary><p className="explain">Solo se vuoi pubblicare queste modifiche sul tuo sito. Scarica lo zip aggiornato, sostituisci i file nella cartella del repository con GitHub Desktop, poi “Commit” e “Push origin”.</p><a href="/setup/bull-lab-v2.zip" download className="button-secondary inline-block">Scarica progetto aggiornato (.zip)</a></details>
      <footer className="text-slate-400 text-sm pb-6">BULL LAB · by Asintomatico · Modalità paper · Le condizioni sono valutate dai segnali TradingView, non dai prezzi Hyperliquid.</footer>
    </div>
  </main>;
}
