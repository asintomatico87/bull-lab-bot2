# Bull Lab VAPI Ladder 3H · BTC + ETH

Cruscotto Next.js con due istanze della stessa strategia: BTC/USDT ed ETH/USDT. Entrambe usano VAPI LazyBear 3H, ladder 1x / 1,5x / 2,5x, acquisti intrabar e vendite a chiusura candela.

## Stato attuale: PAPER ONLY

- Gli alert TradingView vengono validati, deduplicati e simulati nel database.
- Le simulazioni mostrano prezzi, quantità e PnL paper; **nessun ordine viene inviato a Hyperliquid o a un altro exchange**.
- La scheda backtest usa OHLCV sintetici dimostrativi, non dati storici: le sue statistiche non sono una stima di performance.
- L’Auto-Pilot senza TradingView, gli ordini manuali e il collegamento exchange sono disabilitati.
- L’assenza dello stop loss resta una regola della strategia scelta dall’utente.

## Sviluppo locale

```bash
npm ci
cp .env.example .env        # inserisci il DATABASE_URL nel file locale, mai nel repository
npx drizzle-kit push        # applica anche event_id univoco ai log webhook
node src/db/run-seed.js     # crea soltanto i bot paper BTC ed ETH mancanti
npm run dev
```

Non condividere `.env`, password o chiavi. In produzione imposta almeno `DATABASE_URL`, `DASHBOARD_USER`, `DASHBOARD_PASSWORD` e `NEXT_PUBLIC_APP_URL` nelle variabili d’ambiente del provider. Se in produzione manca la Basic Auth, la dashboard chiude l’accesso.

## Alert TradingView

Segui `TRADINGVIEW-ALERTS.md`. Crea un alert separato per asset: chart 3H, script generato per il bot corretto, condizione **Any alert() function call**, webhook URL HTTPS pubblico e campo Message vuoto. Il Pine gestisce la frequenza buy/sell.

## Endpoint

| Endpoint | Scopo |
|---|---|
| `POST /api/webhook/tradingview` | valida gli alert VAPI Ladder e registra fill paper deduplicati |
| `GET /api/bots`, `POST/PATCH /api/bots` | legge, crea/aggiorna e mette in pausa le due istanze BTC/ETH |
| `GET /api/orders` | log delle sole simulazioni TradingView |
| `POST /api/emergency-stop` | mette in pausa i bot paper |
| `POST /api/autopilot` | disabilitato intenzionalmente |
| `POST /api/exchanges` | disabilitato finché non verrà scritto un connettore reale |

## Sicurezza operativa

Il webhook è pubblico per consentire a TradingView di chiamarlo, ma richiede la secret del bot. Il GET del webhook non restituisce i log. I payload persistiti hanno la secret oscurata e gli alert con lo stesso `eventId` non vengono simulati due volte. Le API del cruscotto sono protette dalla Basic Auth in produzione.
