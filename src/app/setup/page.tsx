import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { CopyButton } from "@/components/CopyButton";
import { SelfTest } from "@/components/SelfTest";
import { Card, SectionLabel } from "@/components/ui";
import { db } from "@/db";
import { timeAgo } from "@/lib/format";
import { legacyStrategyScript, PAYLOAD_FIELDS, pineScript, TEST_MESSAGES } from "@/lib/pine";
import { getDiagnosis } from "@/lib/queries";
import { getSettings, hlNetwork, liveConfigured } from "@/lib/settings";
import { BUY_TIERS, EXIT_PLANS } from "@/lib/strategy";

export const dynamic = "force-dynamic";

function Code({ text, label }: { text: string; label?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/50">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">{label ?? ""}</span>
        <CopyButton text={text} />
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all p-3 text-xs leading-relaxed text-slate-300">{text}</pre>
    </div>
  );
}

function Check({ ok, label, detail }: { ok: boolean | "warn"; label: string; detail?: string }) {
  const color = ok === true ? "text-emerald-400" : ok === "warn" ? "text-amber-400" : "text-rose-400";
  return (
    <li className="flex gap-3 py-2">
      <span className={`mt-0.5 font-mono font-bold ${color}`}>{ok === true ? "✓" : ok === "warn" ? "!" : "✕"}</span>
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {detail && <p className="text-xs text-slate-500">{detail}</p>}
      </div>
    </li>
  );
}

const CAUSES: { group: string; items: { t: string; d: string }[] }[] = [
  {
    group: "A · TradingView non invia nulla (nel Log webhook non compare mai “tradingview”)",
    items: [
      { t: "Piano e sicurezza", d: "I webhook richiedono un piano TradingView a pagamento (Essential o superiore) e la 2FA attiva sull'account." },
      { t: "Webhook URL non spuntato", d: "Alert → scheda Notifiche → “Webhook URL” attivo, con l'URL completo https://…/api/webhook/tradingview." },
      { t: "Alert spento, scaduto o “Solo una volta”", d: "Gli alert hanno una scadenza e si disattivano dopo il primo scatto se scegli “Solo una volta”. Controlla il registro alert." },
      { t: "Condizione alert sbagliata", d: "Con la strategia: Condizione = BL_VAPI_LADDER → “Any alert() function call”. Non impostare filtri di frequenza nel dialogo: ogni alert() ha già la sua." },
      { t: "Grafico non 3H o ticker sbagliato", d: "L'alert eredita simbolo e timeframe del grafico: servono due alert, BTC 3H ed ETH 3H." },
      { t: "Regole URL di TradingView", d: "Solo 80/443, nessun redirect seguito, risposta entro 3 secondi, niente IPv6." },
    ],
  },
  {
    group: "B · Vercel (la richiesta non raggiunge il tuo codice)",
    items: [
      { t: "Deployment Protection", d: "Settings → Deployment Protection: “Vercel Authentication” intercetta le chiamate esterne con 401 prima del codice. Disattivala in Production." },
      { t: "Redirect di dominio", d: "bot.bulllab.one → www/apex o http→https: TradingView non segue i redirect. Usa l'URL finale, già https." },
      { t: "URL di preview", d: "Gli URL *.vercel.app di preview sono protetti e cambiano a ogni deploy. Usa il dominio di produzione." },
      { t: "Env var e redeploy", d: "Cambiare una variabile su Vercel non aggiorna il deploy esistente: serve un nuovo deploy (scope Production)." },
      { t: "Stato in memoria", d: "Su serverless ogni richiesta può finire su un'istanza diversa: ladder, `sells` e anti-duplicati devono stare nel DB (qui ci sono)." },
      { t: "Runtime Logs", d: "Progetto → Logs → filtra /api/webhook/tradingview: se non compare nessuna richiesta, non è mai arrivata." },
    ],
  },
  {
    group: "C · Il webhook arriva ma non parte l'ordine (guarda la colonna “Codice”)",
    items: [
      { t: "AUTH_FAILED / AUTH_MISSING", d: "Secret diverso tra alert e bot. Il valore in uso è nella sezione 3 (o in WEBHOOK_SECRET se impostata)." },
      { t: "BAD_JSON / PLACEHOLDER_NOT_RESOLVED", d: "Messaggio non JSON oppure placeholder {{…}} non sostituiti: l'alert non è agganciato all'indicatore/strategia giusti." },
      { t: "TF_MISMATCH", d: "Arriva un campo tf/interval diverso da 180. Il vecchio script non manda `tf`: nessun problema." },
      { t: "SYMBOL_UNSUPPORTED", d: "Ticker non riconducibile a BTC/ETH (accetta BTCUSDT, BTCUSDT.P, BINANCE:BTCUSD, BTC-PERP…)." },
      { t: "RUNG_OUT_OF_ORDER", d: "Il payload dice rung 2/3 ma il bot è ancora al rung 1. Succede se l'alert è stato attivato a ladder iniziato o dopo un reset: allinea con Reset o ignora." },
      { t: "TIER_ALREADY_FILLED / DUPLICATE_BAR", d: "Comportamento corretto: rung già riempito nel ciclo, oppure secondo BUY sulla stessa candela 3H (R2)." },
      { t: "TARGET_NOT_REACHED", d: "A chiusura 3H il VAPI non ha raggiunto il livello di uscita: 0/15/22 con 3 BUY, 5/15 con 2, 12 con 1." },
      { t: "NOT_AT_BAR_CLOSE", d: "CLOSE_LONG ricevuto a metà candela: alert non impostato “Una volta alla chiusura barra”." },
      { t: "KILL_SWITCH / COIN_DISABLED", d: "Acquisti sospesi o simbolo disattivato in Impostazioni." },
      { t: "“In paper non parte nessun ordine”", d: "In paper il bot deve comunque registrare ciclo e ordini con fill simulato. Se non li registra il flusso è rotto: verificabile in Storico." },
    ],
  },
];

export default async function SetupPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "bot.bulllab.one";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/api/webhook/tradingview`;

  const settings = await getSettings();
  const secret = settings.effectiveSecret;
  const diag = await getDiagnosis();

  let dbOk = true;
  try {
    await db.execute(sql`select 1`);
  } catch {
    dbOk = false;
  }

  return (
    <>
      <Card title="1 · Regole confermate (dal tuo VAPI LADDER 3H)">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <SectionLabel>Ladder · BUY intrabar</SectionLabel>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {BUY_TIERS.map((t) => (
                <li key={t.tier} className="flex justify-between border-b border-white/5 pb-1.5">
                  <span>
                    <span className="font-mono text-orange-300">R{t.tier}</span> · VAPI ≤ {t.vapi}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{t.size}× base USD</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              R1 max 3 BUY · R2 un BUY per candela 3H · R5 un BUY per rung e in ordine · nessuno stop loss.
            </p>
          </div>
          <div>
            <SectionLabel>Uscite · solo a candela confermata</SectionLabel>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {Object.entries(EXIT_PLANS).map(([n, plan]) => (
                <li key={n} className="flex gap-3 border-b border-white/5 pb-1.5">
                  <span className="w-14 shrink-0 font-mono text-xs text-slate-400">{n} BUY</span>
                  <span>{plan.map((s) => s.label).join(" · ")}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Piano gestito dal bot; il PnL sul prezzo medio è solo contabile.</p>
          </div>
        </div>
      </Card>

      <Card title="2 · Test connessione end-to-end">
        <p className="mb-3 text-sm text-slate-400">
          Esegue GET + POST (PING, nessun ordine) sull&apos;URL pubblico senza seguire redirect: replica ciò che fa TradingView.
        </p>
        <SelfTest />
      </Card>

      <Card title="3 · Stato configurazione">
        <ul className="divide-y divide-white/5">
          <Check ok={dbOk} label="Database raggiungibile" detail="DATABASE_URL" />
          <Check
            ok={diag.tvTotal > 0}
            label={diag.tvTotal > 0 ? `Webhook TradingView ricevuti: ${diag.tvTotal} (ultimo ${timeAgo(diag.lastTv?.receivedAt)})` : "Nessun webhook da TradingView ricevuto finora"}
            detail="Se zero: guarda le sezioni A/B della checklist."
          />
          <Check
            ok={settings.mode === "paper" ? true : liveConfigured()}
            label={`Modalità ${settings.mode.toUpperCase()}${settings.mode === "live" ? ` (${hlNetwork()})` : ""}`}
            detail={settings.mode === "live" ? "LIVE richiede HL_PRIVATE_KEY." : "Paper: ordini simulati ma registrati in dashboard e storico."}
          />
          <Check
            ok={liveConfigured() ? true : "warn"}
            label={liveConfigured() ? "HL_PRIVATE_KEY configurata" : "HL_PRIVATE_KEY non configurata"}
            detail="Serve solo al live: API wallet Hyperliquid, non la chiave del wallet principale."
          />
          <Check
            ok={settings.secretFromEnv ? "warn" : true}
            label={settings.secretFromEnv ? "Secret da WEBHOOK_SECRET (priorità sull'alert)" : "Secret salvato nel DB"}
          />
        </ul>
      </Card>

      <Card title="4 · URL e secret">
        <div className="grid gap-4 md:grid-cols-2">
          <Code text={url} label="Webhook URL — TradingView → Notifiche" />
          <Code text={secret} label="Webhook secret" />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Apri l&apos;URL nel browser: deve rispondere {`{"ok":true,…}`}, senza redirect né login. In alternativa al campo secret puoi usare{" "}
          <code className="text-slate-300">{url}?secret=…</code>.
        </p>
      </Card>

      <Card title="5 · Il tuo script (strategia originale, secret già impostato)">
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-slate-400">
          <li>Pine Editor → incolla → “Aggiungi al grafico” su BTC 3H, poi su ETH 3H.</li>
          <li>Alert (Alt+A): Condizione = <b className="text-slate-200">BL_VAPI_LADDER → Any alert() function call</b>; non toccare la frequenza nel dialogo (BUY = once per bar, uscite = once per bar close, già nel codice); Notifiche → Webhook URL.</li>
          <li>
            Il payload <code className="text-slate-300">BUY_LONG</code> / <code className="text-slate-300">CLOSE_LONG</code> con campi{" "}
            <code className="text-slate-300">ticker</code>, <code className="text-slate-300">vapi</code>,{" "}
            <code className="text-slate-300">rung</code>, <code className="text-slate-300">closePct</code> è supportato: puoi riusare la strategia
            senza modifiche. Il bot usa la propria size in USD e il proprio stato (fonte di verità) e ricava il ladder dal payload o dal VAPI.
          </li>
        </ol>
        <Code text={legacyStrategyScript(secret)} label="BL_VAPI_LADDER — strategia (tuo codice)" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Code text={TEST_MESSAGES.buyLegacy(secret)} label="Esempio BUY_LONG accettato" />
          <Code text={TEST_MESSAGES.closeLegacy(secret)} label="Esempio CLOSE_LONG accettato" />
        </div>
      </Card>

      <Card title="6 · Variante indicatore (opzionale)">
        <p className="mb-3 text-sm text-slate-400">
          Se preferisci un indicatore leggero: manda un BUY quando il VAPI tocca −25 (il bot sceglie il prossimo rung del ladder e blocca i
          doppioni) e un BAR_CLOSE a ogni chiusura 3H.
        </p>
        <Code text={pineScript(secret)} label="BL_VAPI — indicatore + alert" />
        <p className="mb-2 mt-5 text-sm text-slate-400">Prova da terminale (nessun ordine):</p>
        <Code text={`curl -i -X POST '${url}' -H 'Content-Type: application/json' -d '${TEST_MESSAGES.ping(secret)}'`} label="PING" />
      </Card>

      <Card title="7 · Campi payload accettati">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-white/5">
              {PAYLOAD_FIELDS.map(([k, v]) => (
                <tr key={k}>
                  <td className="w-64 py-2 pr-4 font-mono text-xs text-orange-300">{k}</td>
                  <td className="py-2 text-slate-400">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="8 · Checklist: cosa può andare storto">
        <div className="space-y-6">
          {CAUSES.map((g) => (
            <div key={g.group}>
              <h3 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-orange-300">{g.group}</h3>
              <ul className="divide-y divide-white/5">
                {g.items.map((i) => (
                  <li key={i.t} className="py-2">
                    <p className="text-sm font-medium text-slate-200">{i.t}</p>
                    <p className="text-sm text-slate-400">{i.d}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title="9 · Variabili d'ambiente">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-white/5">
              {[
                ["DATABASE_URL", "Obbligatoria. Postgres (Neon / Vercel Postgres). Poi: npx drizzle-kit push"],
                ["WEBHOOK_SECRET", "Opzionale: se assente usa il secret generato nel DB."],
                ["ADMIN_PASSWORD / ADMIN_USER", "Consigliata: Basic Auth sulla dashboard (utente predefinito admin)."],
                ["HL_PRIVATE_KEY", "Solo LIVE: API wallet Hyperliquid."],
                ["HL_NETWORK", "mainnet (default) oppure testnet."],
                ["HL_SLIPPAGE_PCT", "Slippage massimo ordini IOC (default 3)."],
                ["HL_LEVERAGE", "Opzionale: leverage cross impostato prima dei BUY."],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="py-2 pr-4 font-mono text-xs text-amber-300">{k}</td>
                  <td className="py-2 text-slate-400">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
