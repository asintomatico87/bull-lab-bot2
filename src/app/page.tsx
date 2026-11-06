import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";

import { desc, eq } from "drizzle-orm";
import { ModePanel, PineCopy, RsiTestPanel, SiteHeader, SizeControl, SystemLiveToggle, TestPanel, WebhookUrl } from "./actions";
import { PINE } from "@/lib/pine";
import { RSI_PINE } from "@/lib/rsi-pine";
import { getRuntime } from "@/lib/settings";
import { hlOverview } from "@/lib/hyperliquid";
import { exposure, money, nextMove, qtyFmt, rungs, utcStamp, type CycleRow, type TradeRow } from "@/lib/desk";
import { cycles, trades, webhookLogs, rsiCycles, rsiTrades } from "@/db/schema";

export const dynamic = "force-dynamic";

function SystemCard({
  symbol, theme, mark, cycle, last, sizeUsd, live, ready,
}: {
  symbol: "BTC" | "ETH";
  theme: "cyan" | "orange";
  mark: string;
  cycle?: CycleRow;
  last?: TradeRow;
  sizeUsd: number;
  live: boolean;
  ready: boolean;
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
          <p className="kicker">{cyan ? "SISTEMA 01 · VAPI 3H" : "SISTEMA 02 · VAPI 3H"}</p>
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
      <SystemLiveToggle system={symbol === "BTC" ? "vapi-btc" : "vapi-eth"} live={live} ready={ready} />

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
  const rsiSizes = runtime.rsiSizes;
  const hl = runtime.hlAddress ? await hlOverview() : null;
  const [open, closed, logs, tr, rsiOpen, rsiClosed, rsiTr] = await Promise.all([
    db.select().from(cycles).where(eq(cycles.status, "open")),
    db.select().from(cycles).where(eq(cycles.status, "closed")),
    db.select().from(webhookLogs).orderBy(desc(webhookLogs.id)).limit(18),
    db.select().from(trades).orderBy(desc(trades.id)).limit(24),
    db.select().from(rsiCycles).where(eq(rsiCycles.status, "open")),
    db.select().from(rsiCycles).where(eq(rsiCycles.status, "closed")),
    db.select().from(rsiTrades).orderBy(desc(rsiTrades.id)).limit(20),
  ]);
  const realized = [...open, ...closed].reduce((total, c) => total + c.realizedPnl, 0);
  const lastOf = (s: string) => tr.find((t) => t.symbol === s);
  const btc = open.find((c) => c.symbol === "BTC");
  const eth = open.find((c) => c.symbol === "ETH");
  const rsiBtcOn = rsiOpen.some((c) => c.symbol === "BTC");
  const rsiEthOn = rsiOpen.some((c) => c.symbol === "ETH");
  const systemsOn = [!!btc, !!eth, rsiBtcOn, rsiEthOn].filter(Boolean).length;
  const liveCount = [runtime.live.vapi.BTC, runtime.live.vapi.ETH, runtime.live.rsi.BTC, runtime.live.rsi.ETH].filter(Boolean).length;
  const live = liveCount > 0 || logs.some((l) => l.status === "executed") || open.length > 0;

  return (
    <main className="stage">
      <div className="stage-bg" />
      <div className="stage-photo" style={{ backgroundImage: "url(/images/bg.jpg)" }} />
      <div className="stage-vignette" />

      <div className="relative mx-auto max-w-[1280px] px-4 md:px-8 py-6 md:py-8 space-y-6">
        <SiteHeader liveLabel={runtime.killSwitch ? "BLOCCATO" : liveCount > 0 ? `${liveCount}/4 LIVE` : live ? "PAPER LIVE" : "PAPER READY"} />

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
              <p className="metric text-4xl mt-2 text-white">{systemsOn}<span className="text-xl text-slate-500"> / 4</span></p>
              <p className="text-slate-400 text-sm mt-2">VAPI BTC {btc ? "on" : "flat"} · VAPI ETH {eth ? "on" : "flat"} · RSI BTC {rsiBtcOn ? "on" : "flat"} · RSI ETH {rsiEthOn ? "on" : "flat"}</p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="kicker">Cicli chiusi</p>
              <p className="metric text-4xl mt-2 text-orange-300">{closed.length}</p>
              <p className="text-slate-400 text-sm mt-2">BTC {money(sizes.BTC)} · ETH {money(sizes.ETH)} USDT</p>
            </div>
          </div>
          <ModePanel liveCount={liveCount} kill={runtime.killSwitch} ready={runtime.hlReady} testnet={runtime.hlTestnet} />
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
          <SystemCard symbol="BTC" theme="cyan" mark="/images/btc-mark.jpg" cycle={btc} last={lastOf("BTC")} sizeUsd={sizes.BTC} live={runtime.live.vapi.BTC} ready={runtime.hlReady} />
          <SystemCard symbol="ETH" theme="orange" mark="/images/eth-mark.jpg" cycle={eth} last={lastOf("ETH")} sizeUsd={sizes.ETH} live={runtime.live.vapi.ETH} ready={runtime.hlReady} />
        </section>

        <section className="space-y-4">
          <div>
            <p className="kicker">Sistemi 03–04 · RSI 45m</p>
            <h2 className="h1 text-2xl md:text-3xl text-white">RSI 45m · Long & Short</h2>
            <p className="text-slate-300 mt-1">Leva 1 · long/short al <b>tocco</b> RSI · uscite solo a <b>chiusura candela 45m</b> · 1 ingresso a candela · 1 barra vuota in mezzo · max 6 size. Uscite short: 50% ≤38, resto ≤30.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-5">
            {(["BTC", "ETH"] as const).map((sym) => {
              const L = rsiOpen.find((c) => c.symbol === sym && c.side === "long");
              const S = rsiOpen.find((c) => c.symbol === sym && c.side === "short");
              const last = rsiTr.find((t) => t.symbol === sym);
              const units = (L?.units ?? 0) + (S?.units ?? 0);
              return (
                <article key={sym} className="glass rounded-[28px] p-6 md:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="h1 text-3xl">{sym}<span className="text-slate-500 text-lg"> RSI</span></h3>
                    <span className="text-xs font-bold tracking-wider border border-slate-500 rounded-full px-3 py-1">{units.toFixed(0)}/6 SIZE</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 mt-5">
                    <div className="rounded-2xl bg-black/30 border border-emerald-500/20 p-4">
                      <p className="text-emerald-300 font-bold">LONG</p>
                      <p className="text-sm text-slate-300 mt-1">{L ? `${L.entries}/3 · qty ${qtyFmt(L.qty)}` : "Flat · attende RSI ≤ 23"}</p>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] text-slate-400">
                        {[{ n: 1, lv: "≤23", u: 1 }, { n: 2, lv: "≤18", u: 2 }, { n: 3, lv: "≤13", u: 3 }].map((r) => (
                          <div key={r.n} className={`rounded-lg p-2 border ${(L?.entries ?? 0) >= r.n ? "border-emerald-400 text-emerald-200" : "border-white/10"}`}>#{r.n} {r.lv}<br />{r.u}×</div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Uscita 50% ≥50 · resto ≥70</p>
                    </div>
                    <div className="rounded-2xl bg-black/30 border border-orange-500/20 p-4">
                      <p className="text-orange-300 font-bold">SHORT</p>
                      <p className="text-sm text-slate-300 mt-1">{S ? `${S.entries}/3 · qty ${qtyFmt(S.qty)}` : "Flat · attende RSI ≥ 77"}</p>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] text-slate-400">
                        {[{ n: 1, lv: "≥77", u: 1 }, { n: 2, lv: "≥82", u: 2 }, { n: 3, lv: "≥87", u: 3 }].map((r) => (
                          <div key={r.n} className={`rounded-lg p-2 border ${(S?.entries ?? 0) >= r.n ? "border-orange-400 text-orange-200" : "border-white/10"}`}>#{r.n} {r.lv}<br />{r.u}×</div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Uscita 50% ≤38 · resto ≤30</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-3">PnL long {money(L?.realizedPnl ?? 0)} · short {money(S?.realizedPnl ?? 0)} · ultimo RSI {last ? last.rsi.toFixed(2) : "—"}</p>
                  <SizeControl symbol={sym} value={sym === "BTC" ? rsiSizes.BTC : rsiSizes.ETH} book="rsi" />
                  <SystemLiveToggle system={sym === "BTC" ? "rsi-btc" : "rsi-eth"} live={sym === "BTC" ? runtime.live.rsi.BTC : runtime.live.rsi.ETH} ready={runtime.hlReady} />
                </article>
              );
            })}
          </div>
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
              <p className="kicker">Test manuale VAPI</p>
              <h3 className="text-xl font-bold mt-1">Simulazione — non è il VAPI del grafico</h3>
              <TestPanel secret={secret} />
            </div>
            <div>
              <p className="kicker">RSI 45m</p>
              <h3 className="text-xl font-bold mt-1">Script Pine · webhook dedicato</h3>
              <p className="text-slate-300 mt-2">Grafico 45m, indicatore <b>BL_RSI_45</b>. Ingressi al tocco, uscite a chiusura candela. Alert: Any alert() function call. Non tocca gli alert VAPI 3H.</p>
              <div className="mt-3"><p className="field-label">Webhook RSI</p><WebhookUrl path="/api/webhook/rsi" /></div>
              <div className="mt-4"><PineCopy pine={RSI_PINE} /></div>
              <details className="mt-3"><summary className="text-cyan-200">Mostra codice RSI</summary><pre className="mt-3 max-h-80 overflow-auto text-xs bg-black/50 p-4 rounded-2xl">{RSI_PINE}</pre></details>
              <div className="mt-5"><RsiTestPanel secret={secret} /></div>
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
