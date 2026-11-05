import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { cycles, trades, webhookLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { TestPanel, WebhookUrl, RuleChip } from "./actions";
import { PINE } from "@/lib/pine";
import { BASE_USD } from "@/lib/strategy";

export const dynamic = "force-dynamic";

const color: Record<string, string> = {
  executed: "text-emerald-400",
  ignored: "text-zinc-500",
  rejected: "text-red-400",
  error: "text-red-500",
};

export default async function Home() {
  await ensureSchema();
  const secret = process.env.WEBHOOK_SECRET || "bulllab";
  const [open, closed, logs, tr] = await Promise.all([
    db.select().from(cycles).where(eq(cycles.status, "open")),
    db.select().from(cycles).where(eq(cycles.status, "closed")),
    db.select().from(webhookLogs).orderBy(desc(webhookLogs.id)).limit(40),
    db.select().from(trades).orderBy(desc(trades.id)).limit(60),
  ]);
  const realized = [...open, ...closed].reduce((a, c) => a + c.realizedPnl, 0);
  const lastVapi: Record<string, number> = {};
  for (const t of tr) if (!(t.symbol in lastVapi)) lastVapi[t.symbol] = t.vapi;

  const statusOf = (s: string) => {
    const c = open.find((x) => x.symbol === s);
    if (!c) return { label: "FLAT — in attesa VAPI ≤ −25", cls: "text-zinc-500 border-zinc-700" };
    if (c.exitStage > 0) return { label: `IN USCITA · stage ${c.exitStage}`, cls: "text-amber-300 border-amber-500/50" };
    return { label: `LADDER ${c.entries}/3`, cls: "text-cyber border-cyber/50" };
  };

  return (
    <main className="min-h-screen relative">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="relative p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* ===================== HEADER ===================== */}
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <img src="/images/logo.jpg" alt="Bull Lab — Powered by AltcoinItalia" className="h-16 md:h-20 w-auto object-contain mix-blend-screen drop-shadow-[0_0_25px_rgba(255,122,24,0.25)]" />
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="font-display text-cyber glow-cyan text-lg font-bold tracking-widest">BULL LAB</div>
              <div className="text-[11px] tracking-[0.35em] text-zinc-500">VAPI LADDER · 3H · BY ASINTOMATICO</div>
            </div>
            <div className="relative">
              <img src="/images/profile.jpg" alt="Asintomatico" className="w-16 h-16 rounded-full object-cover ring-2 ring-cyber/60 shadow-[0_0_22px_rgba(34,211,238,0.45)]" />
              <span className="absolute -top-1 -right-1 font-display text-[9px] font-black tracking-wider text-black bg-neon rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                PAPER
              </span>
            </div>
          </div>
        </header>

        {/* ===================== WEBHOOK ===================== */}
        <section className="blk blk-cyan rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="font-display text-[11px] font-bold tracking-widest text-cyber">WEBHOOK TRADINGVIEW →</span>
          <WebhookUrl />
          <span className="text-xs text-zinc-500">secret: <code className="font-tech text-zinc-300">{secret}</code> · base {BASE_USD} USDT · fee 0,035%</span>
        </section>

        {/* ===================== POSIZIONI ===================== */}
        <section className="grid md:grid-cols-3 gap-4">
          {["BTC", "ETH"].map((s, i) => {
            const c = open.find((x) => x.symbol === s);
            const st = statusOf(s);
            return (
              <div key={s} className={`blk rounded-lg p-4 ${i === 0 ? "blk-cyan" : "blk-orange"}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`font-display font-bold text-xl ${i === 0 ? "text-cyber glow-cyan" : "text-neon glow-orange"}`}>{s}USDT</h2>
                  <span className={`text-[11px] font-semibold tracking-wider border rounded px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-sm">
                  <div><div className="text-[10px] tracking-widest text-zinc-500">ULTIMO VAPI RX</div><div className="font-tech text-base">{lastVapi[s]?.toFixed(2) ?? "—"}</div></div>
                  <div><div className="text-[10px] tracking-widest text-zinc-500">RUNG COMPILATI</div><div className="font-tech text-base">{c ? c.entries : 0} / 3</div></div>
                  <div><div className="text-[10px] tracking-widest text-zinc-500">QTY APERTA</div><div className="font-tech text-base">{c ? c.qty.toFixed(6) : "0"}</div></div>
                  <div><div className="text-[10px] tracking-widest text-zinc-500">PREZZO MEDIO</div><div className="font-tech text-base">{c && c.qty ? (c.cost / c.qty).toFixed(2) : "—"}</div></div>
                  <div className="col-span-2"><div className="text-[10px] tracking-widest text-zinc-500">PNL REALIZZATO CICLO</div>
                    <div className={`font-tech text-base ${c && c.realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{c ? c.realizedPnl.toFixed(2) : "0.00"} $</div>
                  </div>
                </div>
                {c && (
                  <div className="mt-3 flex gap-1">
                    {[0, 1, 2].map((r) => (
                      <div key={r} className={`h-1.5 flex-1 rounded ${r < c.entries ? (r === 0 ? "bg-cyber" : r === 1 ? "bg-neon" : "bg-red-500") : "bg-zinc-800"}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="blk blk-orange rounded-lg p-4 flex flex-col justify-center">
            <div className="text-[10px] tracking-widest text-zinc-500">PNL REALIZZATO TOTALE</div>
            <div className={`font-display font-black text-3xl mt-1 ${realized >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {realized >= 0 ? "+" : ""}{realized.toFixed(2)} $
            </div>
            <div className="text-xs text-zinc-500 mt-2">{closed.length} cicli chiusi · {open.length} aperti</div>
          </div>
        </section>

        {/* ===================== REGOLE ===================== */}
        <section className="blk rounded-lg p-4">
          <h2 className="font-display text-sm font-bold tracking-widest text-zinc-300 mb-3">
            REGOLE <span className="text-neon">CONFERMATE DAL SERVER</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <RuleChip code="R1" label="Max 3 BUY · NO stop loss · hold con scala piena" />
            <RuleChip code="R2" label="Max 1 BUY per candela 3H" />
            <RuleChip code="R3" label={`Scala 1× / 1,5× / 2,5× su base ${BASE_USD} USDT`} />
            <RuleChip code="R4" label="Livelli BUY VAPI ≤ −25 / −32 / −40" />
            <RuleChip code="R5" label="1 BUY per scalino (una volta per ciclo)" />
            <RuleChip code="R6" label="Uscite: 1B ≥12 chiudi · 2B ≥5 50%, ≥15 resto · 3B ≥0 50%, ≥15 metà, ≥22 tutto" />
            <RuleChip code="BUY" label="Trigger intrabar al tocco (fase: touch)" />
            <RuleChip code="SELL" label="Solo a chiusura candela 3H (fase: close)" />
            <RuleChip code="TV" label="Alert: Any alert() call · messaggio generato dallo script" />
          </div>
        </section>

        {/* ===================== TEST ===================== */}
        <section className="blk blk-cyan rounded-lg p-4">
          <h2 className="font-display text-sm font-bold tracking-widest text-cyber mb-3">🧪 TEST WEBHOOK — STESSO ENDPOINT DI TRADINGVIEW</h2>
          <TestPanel secret={secret} />
        </section>

        {/* ===================== LOG WEBHOOK ===================== */}
        <section className="blk rounded-lg p-4">
          <h2 className="font-display text-sm font-bold tracking-widest text-zinc-300 mb-1">📡 LOG WEBHOOK</h2>
          <p className="text-xs text-zinc-500 mb-3">Ogni richiesta ricevuta, con esito e motivo. Se qui non compare nulla dopo un alert, la richiesta da TradingView non arriva al server (URL, 2FA, piano TV, redirect www).</p>
          <div className="max-h-80 overflow-y-auto font-tech text-xs space-y-1.5">
            {logs.length === 0 && <p className="text-zinc-600">// nessuna richiesta ricevuta</p>}
            {logs.map((l) => (
              <div key={l.id} className="border-b border-zinc-800/70 pb-1.5">
                <span className="text-zinc-600">{l.createdAt.toISOString().slice(5, 19)}</span>{" "}
                <span className={`${color[l.status]} font-bold`}>[{l.status.toUpperCase()}]</span>{" "}
                <span className="text-zinc-300">{l.reason}</span>
                <div className="text-zinc-600 truncate" title={l.raw}>{l.raw}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ===================== TRADES ===================== */}
        <section className="blk rounded-lg p-4">
          <h2 className="font-display text-sm font-bold tracking-widest text-zinc-300 mb-3">📒 OPERAZIONI PAPER</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-tech">
              <thead className="text-zinc-500 text-left text-[10px] tracking-widest">
                <tr><th className="pb-2 pr-3">DATA</th><th className="pb-2 pr-3">SYM</th><th className="pb-2 pr-3">LATO</th><th className="pb-2 pr-3">PREZZO</th><th className="pb-2 pr-3">QTY</th><th className="pb-2 pr-3">VAPI</th><th className="pb-2 pr-3">PNL $</th><th className="pb-2">NOTA</th></tr>
              </thead>
              <tbody>
                {tr.length === 0 && <tr><td colSpan={8} className="text-zinc-600 pt-2">// nessuna operazione</td></tr>}
                {tr.map((t) => (
                  <tr key={t.id} className="border-t border-zinc-800/70">
                    <td className="pr-3 text-zinc-500">{t.createdAt.toISOString().slice(5, 16)}</td>
                    <td className="pr-3">{t.symbol}</td>
                    <td className={`pr-3 font-bold ${t.side === "BUY" ? "text-emerald-400" : "text-red-400"}`}>{t.side}</td>
                    <td className="pr-3">{t.price}</td>
                    <td className="pr-3">{t.qty.toFixed(6)}</td>
                    <td className="pr-3">{t.vapi.toFixed(2)}</td>
                    <td className={`pr-3 ${t.side === "SELL" ? (t.pnl >= 0 ? "text-emerald-400" : "text-red-400") : ""}`}>{t.side === "SELL" ? t.pnl.toFixed(2) : ""}</td>
                    <td className="text-zinc-400">{t.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===================== SETUP TV ===================== */}
        <section className="blk blk-orange rounded-lg p-4 space-y-3 text-sm">
          <h2 className="font-display text-sm font-bold tracking-widest text-neon">⚙️ SETUP TRADINGVIEW</h2>
          <ol className="list-decimal ml-5 space-y-1.5 text-zinc-300">
            <li>Grafico <b>BTCUSDT</b> e <b>ETHUSDT</b> su timeframe <b>3h</b> · aggiungi lo script Pine qui sotto.</li>
            <li>Crea alert → Condizione: indicatore <b>BL_VAPI_LADDER</b> → <b>&quot;Any alert() function call&quot;</b>. Lascia il campo <b>messaggio vuoto</b>: lo script genera il JSON.</li>
            <li>Nelle impostazioni dello script imposta il ticker corretto (BTCUSDT / ETHUSDT) e lo stesso secret del server.</li>
            <li>Webhook URL: usa quello in alto (https, porta 443, <b>senza redirect</b> www ↔ non-www).</li>
            <li>Abilita la <b>2FA</b> su TradingView (obbligatoria per i webhook) e usa un piano a pagamento.</li>
            <li>Se modifichi lo script, <b>ricrea gli alert</b> (TV li associa alla versione dello script).</li>
          </ol>
          <p className="text-zinc-400">Formato JSON atteso dal server:</p>
          <pre className="font-tech bg-black/80 border border-zinc-800 p-2 rounded text-xs overflow-x-auto text-cyber">
            {`{"secret":"${secret}","ticker":"BTCUSDT","event":"touch","vapi":-26.5,"price":60000,"bar_time":"1700000000000"}`}
          </pre>
          <details>
            <summary className="cursor-pointer font-display text-xs font-bold tracking-widest text-cyber">▸ SCRIPT PINE V5 (BULL LAB VAPI LADDER 3H)</summary>
            <pre className="bg-black/80 border border-zinc-800 p-3 rounded text-xs overflow-x-auto mt-2 text-zinc-300">{PINE}</pre>
          </details>
        </section>

        {/* ===================== MIGRAZIONE ===================== */}
        <section className="blk blk-cyan rounded-lg p-4 space-y-3 text-sm">
          <h2 className="font-display text-sm font-bold tracking-widest text-cyber">🚀 SOVRASCRIVI IL REPO GITHUB (v1 → v2)</h2>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/setup/bull-lab-v2.zip" download
               className="font-display text-xs font-bold tracking-wider px-4 py-2 rounded bg-neon text-black hover:shadow-[0_0_18px_rgba(255,122,24,0.6)] transition">
              ⬇ SCARICA IL PROGETTO COMPLETO (.ZIP)
            </a>
            <span className="text-xs text-zinc-500">zip pronto da caricare su GitHub · dentro c'è anche <code className="font-tech text-zinc-300">README.txt</code> e <code className="font-tech text-zinc-300">MIGRAZIONE.md</code></span>
          </div>
          <ol className="list-decimal ml-5 space-y-1.5 text-zinc-300">
            <li>Scomprimi lo zip → cartella <b>bull-lab-new</b>.</li>
            <li>Apri il terminale nella clonazione di <b>bull-lab-bot2</b> ed esegui i comandi sotto.</li>
            <li><b>git push</b> → Vercel ri-deploya da solo su <b>bot.bulllab.one</b> (dominio invariato, env preservate).</li>
            <li>In Vercel aggiungi <b>WEBHOOK_SECRET</b> (stesso valore dello script Pine). Le tabelle su Neon nascono da sole.</li>
            <li>In TradingView: nuovo script Pine (sezione qui sopra), secret identico, <b>ricrea gli alert</b>.</li>
            <li>Verifica il <b>Log Webhook</b> su questa pagina.</li>
          </ol>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] tracking-widest text-zinc-500 mb-1">MAC / LINUX</div>
              <pre className="font-tech text-[11px] bg-black/80 border border-zinc-800 p-3 rounded overflow-x-auto text-emerald-300">
{`cd bull-lab-bot2
find . -maxdepth 1 ! -name ".git" ! -name "." -exec rm -rf {} +
cp -R ~/Downloads/bull-lab-new/. .
git add -A && git commit -m "Bull Lab v2" && git push`}
              </pre>
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-zinc-500 mb-1">WINDOWS (POWERSHELL)</div>
              <pre className="font-tech text-[11px] bg-black/80 border border-zinc-800 p-3 rounded overflow-x-auto text-emerald-300">
{`cd bull-lab-bot2
Get-ChildItem -Force | ? Name -ne ".git" | Remove-Item -Recurse -Force
Copy-Item "$env:USERPROFILE\\Downloads\\bull-lab-new\\*" . -Recurse -Force
git add -A; git commit -m "Bull Lab v2"; git push`}
              </pre>
            </div>
          </div>
        </section>

        {/* ===================== FOOTER ===================== */}
        <footer className="flex items-center justify-between flex-wrap gap-3 pb-4 text-xs text-zinc-600">
          <span>BULL LAB · POWERED BY ALTCOINITALIA · <span className="text-neon">by Asintomatico</span></span>
          <span className="font-tech">VAPI LADDER 3H · MODE: <span className="text-neon font-bold">PAPER</span> · NEXT: integrazione Hyperliquid live</span>
        </footer>
      </div>
    </main>
  );
}
