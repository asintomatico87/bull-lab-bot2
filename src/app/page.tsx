import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { cycles, trades, webhookLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ModePanel, PineCopy, SizeControl, TestPanel, WebhookUrl } from "./actions";
import { PINE } from "@/lib/pine";
import { getRuntime } from "@/lib/settings";
import { hlOverview } from "@/lib/hyperliquid";
import { exposure, money, nextMove, qtyFmt, rungs, utcStamp, type CycleRow, type TradeRow } from "@/lib/desk";

export const dynamic = "force-dynamic";

function SystemCard({
  symbol, theme, mark, cycle, last, sizeUsd,
}: {
  symbol: "BTC" | "ETH";
  theme: "cyan" | "orange";
  mark: string;
  cycle?: CycleRow;
  last?: TradeRow;
  sizeUsd: number;
}) {
  const open = !!cycle;
  const next = nextMove(cycle);
  const avg = cycle && cycle.qty ? cycle.cost / cycle.qty : 0;
  const cyan = theme === "cyan";
  return (
    <article className={`glass ${cyan ? "glass-cyan" : "glass-orange"} rounded-[28px] p-6 md:p-8 relative overflow-hidden`}>
      <div className="absolute -right-8 -top-10 w-44 h-44 opacity-70 pointer-events-none">
        <img src={mark} alt="" className="w-full h-full object-cover rounded-full mix-blend-screen" />
      </div>
      <div className="flex items-start justify-between gap-4 relative">
        <div>
          <p className="kicker">{cyan ? "SISTEMA 01" : "SISTEMA 02"}</p>
          <h2 className={`h1 text-4xl md:text-5xl mt-1 ${cyan ? "text-cyan-300" : "text-orange-400"}`}>{symbol}<span className="text-slate-500 text-xl md:text-2xl"> / USDT</span></h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold tracking-wider border ${open ? (cycle?.exitStage ? "border-amber-400 text-amber-200 bg-amber-500/10" : "border-emerald-400 text-emerald-200 bg-emerald-500/10") : "border-slate-500 text-slate-300 bg-slate-800/60"}`}>
          {open ? (cycle?.exitStage ? "IN USCITA" : "POSIZIONE APERTA") : "FLAT"}
        </span>
      </div>

      <p className="mt-5 text-lg md:text-xl font-semibold text-white">{next.title}</p>
      <p className="mt-1 text-slate-300 leading-relaxed max-w-xl">{next.text}</p>

      <div className="grid grid-cols-2 gap-4 mt-7">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Quantità</p>
          <p className="metric text-2xl md:text-3xl mt-1">{cycle ? qtyFmt(cycle.qty) : "0,000000"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Prezzo medio</p>
          <p className="metric text-2xl md:text-3xl mt-1">{cycle && cycle.qty ? money(avg) : "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Esposizione</p>
          <p className="metric text-2xl md:text-3xl mt-1">{cycle ? money(exposure(cycle)) : "0,00"} <span className="text-sm text-slate-400">USDT</span></p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">PnL ciclo</p>
          <p className={`metric text-2xl md:text-3xl mt-1 ${(cycle?.realizedPnl ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(cycle?.realizedPnl ?? 0)}</p>
        </div>
      </div>

      <div className="mt-7">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-3">Scala BUY · 3H</p>
        <div className="grid grid-cols-3 gap-3">
          {rungs(sizeUsd).map((r, i) => {
            const filled = (cycle?.entries ?? 0) > i;
            return (
              <div key={r.n} className="rounded-2xl bg-black/35 border border-white/5 p-3">
                <div className={`rung ${filled ? `on-${r.n}` : ""}`}><span /></div>
                <p className="mt-2 text-sm font-bold">{filled ? "COMPRATO" : `Scalino ${r.n}`}</p>
                <p className="text-xs text-slate-400">VAPI ≤ {r.vapi}</p>
                <p className="text-xs text-slate-400">{r.usd} USDT</p>
              </div>
            );
          })}
        </div>
      </div>

      <SizeControl symbol={symbol} value={sizeUsd} />

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300 border-t border-white/5 pt-4">
        <span>Ultimo VAPI: <b className="text-white">{last ? last.vapi.toFixed(2) : "—"}</b></span>
        <span>Ultimo prezzo: <b className="text-white">{last ? money(last.price) : "—"}</b></span>
        <span>Ultimo lato: <b className={last?.side === "BUY" ? "text-emerald-300" : last?.side === "SELL" ? "text-orange-300" : "text-white"}>{last?.side ?? "—"}</b></span>
      </div>
    </article>
  );
}

export default async function Home() {
  await ensureSchema();
  const secret = process.env.WEBHOOK_SECRET || "bulllab";
  const runtime = await getRuntime();
  const sizes = runtime.sizes;
  const hl = runtime.hlAddress ? await hlOverview() : null;
  const [open, closed, logs, tr] = await Promise.all([
    db.select().from(cycles).where(eq(cycles.status, "open")),
    db.select().from(cycles).where(eq(cycles.status, "closed")),
    db.select().from(webhookLogs).orderBy(desc(webhookLogs.id)).limit(18),
    db.select().from(trades).orderBy(desc(trades.id)).limit(24),
  ]);
  const realized = [...open, ...closed].reduce((total, c) => total + c.realizedPnl, 0);
  const lastOf = (s: string) => tr.find((t) => t.symbol === s);
  const btc = open.find((c) => c.symbol === "BTC");
  const eth = open.find((c) => c.symbol === "ETH");
  const live = logs.some((l) => l.status === "executed") || open.length > 0;

  return (
    <main className="stage">
      <div className="stage-bg" />
      <div className="stage-photo" style={{ backgroundImage: "url(/images/bg.jpg)" }} />
      <div className="stage-vignette" />

      <div className="relative mx-auto max-w-[1280px] px-4 md:px-8 py-6 md:py-8 space-y-6">
        <header className="glass rounded-[28px] px-5 md:px-7 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <img src="/images/logo.jpg?v=asi3" alt="Bull Lab" width={420} height={140} className="h-20 md:h-24 w-auto max-w-[min(520px,70vw)] object-contain rounded-xl bg-black shrink-0" />
            <div className="min-w-0">
              <p className="kicker">Bull Lab · by Asintomatico</p>
              <p className="h1 text-xl md:text-2xl text-white truncate">VAPI LADDER 3H</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5">
              <span className="live-dot" />
              <span className="text-xs font-extrabold tracking-widest text-cyan-200">{runtime.mode === "live" && !runtime.killSwitch ? "LIVE HYPERLIQUID" : live ? "PAPER LIVE" : "PAPER READY"}</span>
            </div>
            <img src="/images/profile.jpg?v=asi3" alt="Asintomatico" width={72} height={72} className="w-[72px] h-[72px] rounded-full object-cover bg-slate-800 ring-2 ring-cyan-300/80 shadow-[0_0_24px_rgba(34,211,238,.45)] shrink-0" />
          </div>
        </header>

        <div className="ticker">
            <span>BULL LAB · POWERED BY ALTCOINITALIA · BTC + ETH · 3H · MAX 3 BUY · NO STOP LOSS · BUY INTRABAR · SELL A CHIUSURA · SIZE DAL CRUSCOTTO · PAPER O LIVE HYPERLIQUID &nbsp;&nbsp;&nbsp; BULL LAB · POWERED BY ALTCOINITALIA · BTC + ETH · 3H · MAX 3 BUY · NO STOP LOSS · BUY INTRABAR · SELL A CHIUSURA · SIZE DAL CRUSCOTTO · PAPER O LIVE HYPERLIQUID &nbsp;&nbsp;&nbsp;</span>
        </div>

        <section className="grid lg:grid-cols-[1fr_280px] gap-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass rounded-3xl p-5">
              <p className="kicker">PnL realizzato</p>
              <p className={`metric text-4xl mt-2 ${realized >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{realized >= 0 ? "+" : ""}{money(realized)} $</p>
              <p className="text-slate-400 text-sm mt-2">Somma di tutti i cicli chiusi e parziali</p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="kicker">Sistemi attivi</p>
              <p className="metric text-4xl mt-2 text-white">{open.length}<span className="text-xl text-slate-500"> / 2</span></p>
              <p className="text-slate-400 text-sm mt-2">{btc ? "BTC in posizione" : "BTC flat"} · {eth ? "ETH in posizione" : "ETH flat"}</p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="kicker">Cicli chiusi</p>
              <p className="metric text-4xl mt-2 text-orange-300">{closed.length}</p>
              <p className="text-slate-400 text-sm mt-2">BTC {money(sizes.BTC)} · ETH {money(sizes.ETH)} USDT</p>
            </div>
          </div>
          <ModePanel mode={runtime.mode} kill={runtime.killSwitch} ready={runtime.hlReady} testnet={runtime.hlTestnet} />
        </section>

        {hl && (
          <section className="glass rounded-[28px] p-5 md:p-6">
            <p className="kicker">Conto Hyperliquid {hl.testnet ? "· TESTNET" : "· MAINNET"}</p>
            {"error" in hl && hl.error ? (
              <p className="mt-2 text-amber-200">Indirizzo configurato ma il conto non è leggibile in questo momento.</p>
            ) : (
              <div className="grid sm:grid-cols-3 gap-4 mt-3">
                <div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Equity</p><p className="metric text-2xl">{money(hl.equity)} $</p></div>
                <div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Prelevabile</p><p className="metric text-2xl">{money(hl.withdrawable)} $</p></div>
                <div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Posizioni</p>
                  <p className="text-sm mt-1">{hl.positions.length ? hl.positions.map((p) => `${p.coin} ${p.szi} · lev ${p.lev}x`).join(" · ") : "nessuna"}</p>
                </div>
              </div>
            )}
            {hl.address && <p className="text-xs text-slate-500 mt-3 break-all">{hl.address}</p>}
          </section>
        )}

        <section className="grid lg:grid-cols-2 gap-5" aria-label="I due sistemi">
          <SystemCard symbol="BTC" theme="cyan" mark="/images/btc-mark.jpg" cycle={btc} last={lastOf("BTC")} sizeUsd={sizes.BTC} />
          <SystemCard symbol="ETH" theme="orange" mark="/images/eth-mark.jpg" cycle={eth} last={lastOf("ETH")} sizeUsd={sizes.ETH} />
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-[28px] p-6">
            <p className="kicker">Feed segnali</p>
            <h3 className="h1 text-xl mt-1">Cosa arriva da TradingView</h3>
            <div className="mt-4 max-h-[360px] overflow-y-auto space-y-3 pr-1">
              {logs.length === 0 && <p className="text-slate-400">Nessun segnale ancora. Quando l’alert scatta, compare qui.</p>}
              {logs.map((l) => (
                <div key={l.id} className="rounded-2xl bg-black/30 border border-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                    <time>{utcStamp(l.createdAt)}</time>
                    <b className={l.status === "executed" ? "text-emerald-300" : l.status === "ignored" ? "text-amber-200" : "text-rose-300"}>{l.status.toUpperCase()}</b>
                  </div>
                  <p className="mt-1 text-sm text-slate-100 leading-snug">{l.reason}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-[28px] p-6">
            <p className="kicker">Operazioni paper</p>
            <h3 className="h1 text-xl mt-1">BUY e SELL registrati</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-400 text-xs uppercase tracking-wider">
                  <tr><th className="pb-3 pr-3">Quando</th><th className="pb-3 pr-3">Asset</th><th className="pb-3 pr-3">Lato</th><th className="pb-3 pr-3">Prezzo</th><th className="pb-3 pr-3">Qty</th><th className="pb-3">PnL</th></tr>
                </thead>
                <tbody>
                  {tr.map((t) => (
                    <tr key={t.id} className="border-t border-white/5">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-400">{utcStamp(t.createdAt)}</td>
                      <td className="pr-3 font-bold">{t.symbol}</td>
                      <td className={`pr-3 font-extrabold ${t.side === "BUY" ? "text-emerald-300" : "text-orange-300"}`}>{t.side}</td>
                      <td className="pr-3">{money(t.price)}</td>
                      <td className="pr-3">{qtyFmt(t.qty)}</td>
                      <td className={t.side === "SELL" ? (t.pnl >= 0 ? "text-emerald-300" : "text-rose-300") : "text-slate-500"}>{t.side === "SELL" ? money(t.pnl) : "—"}</td>
                    </tr>
                  ))}
                  {tr.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-400">Nessuna operazione paper.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <details className="glass rounded-[28px] p-6">
          <summary className="h1 text-lg text-cyan-200">Laboratorio · Pine, webhook e test</summary>
          <div className="mt-5 space-y-8">
            <div>
              <p className="kicker">Script</p>
              <h3 className="text-xl font-bold mt-1">Pine v5 — un solo script per BUY e SELL</h3>
              <p className="text-slate-300 mt-2 max-w-3xl">BUY al tocco intrabar, SELL solo a chiusura 3H. Prima di incollare nell’Editor Pine seleziona tutto (⌘A / Ctrl+A). Deve restare una sola riga <code>indicator(</code>.</p>
              <div className="flex flex-wrap items-center gap-3 mt-4"><PineCopy pine={PINE} /></div>
              <details className="mt-4"><summary className="text-cyan-200">Mostra il codice</summary><pre className="mt-3 max-h-80 overflow-auto text-xs bg-black/50 p-4 rounded-2xl">{PINE}</pre></details>
            </div>
            <div>
              <p className="kicker">Alert</p>
              <h3 className="text-xl font-bold mt-1">Due grafici, due alert, stesso webhook</h3>
              <p className="text-slate-300 mt-2">BTCUSDT 3H e ETHUSDT 3H. Condizione: Any alert() function call. Messaggio lasciato allo script. Secret uguale a Vercel.</p>
              <div className="mt-4 space-y-3">
                <div><p className="field-label">Indirizzo webhook</p><WebhookUrl /></div>
                <div><p className="field-label">Webhook secret</p><code className="text-orange-200 text-lg">{secret}</code></div>
              </div>
            </div>
            <div>
              <p className="kicker">Test manuale</p>
              <h3 className="text-xl font-bold mt-1">Simulazione — non è il VAPI del grafico</h3>
              <TestPanel secret={secret} />
            </div>
            <div>
              <p className="kicker">Hyperliquid · soldi veri</p>
              <ol className="mt-2 space-y-2 text-slate-300 text-sm leading-relaxed list-decimal ml-5">
                <li>Su Hyperliquid crea un <b>API wallet</b> (agent). Non usare la chiave del wallet principale.</li>
                <li>In Vercel aggiungi <code>HL_ACCOUNT_ADDRESS</code> (indirizzo pubblico del conto con i fondi) e <code>HL_AGENT_PRIVATE_KEY</code> (chiave dell’API wallet). Opzionale: <code>HL_TESTNET=true</code> per la testnet.</li>
                <li>Deposita USDC sul conto perps e imposta la leva di BTC ed ETH dall’interfaccia Hyperliquid.</li>
                <li>Dopo il redeploy, in alto a destra scrivi <b>LIVE</b> e premi «Passa a soldi veri». Il kill switch ferma gli ordini senza spegnere gli alert.</li>
              </ol>
            </div>
            <div>
              <p className="kicker">Deploy</p>
              <a href="/setup/bull-lab-v2.zip" download className="button-secondary inline-block mt-3">Scarica progetto aggiornato (.zip)</a>
            </div>
          </div>
        </details>

        <footer className="pb-8 text-sm text-slate-500 flex flex-wrap justify-between gap-2">
          <span>BULL LAB · by Asintomatico · Powered by AltcoinItalia</span>
          <span>Segnali da TradingView · esecuzione PAPER o Hyperliquid in base all’interruttore</span>
        </footer>
      </div>
    </main>
  );
}
