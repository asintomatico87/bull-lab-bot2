# Bull Lab Trading System

Cruscotto di trading automatizzato per Bitcoin ed Ethereum, con tema Bull Lab
(Powered by AltcoinItalia · by Asintomatico).

- **Strategia core:** VAPI Ladder 3H di LazyBear (martingala 1x / 1,5x / 2,5x a −25 / −32 / −40)
- **Trigger ibrido:** buy intrabar appena tocca il livello, sell solo alla chiusura della candela 3H
- **Ponte TradingView:** webhook con secret per bot, validazione server-side dei livelli
- **Modalità senza TradingView:** Auto-Pilot 3H che legge le candele dall'exchange
- **Exchange:** Hyperliquid DEX (No-KYC), OurBit, Bitbase, Bybit

## Avvio in locale

Il modo più rapido (dalla radice del progetto):

```bash
bash setup.sh
```

Fa tutto: controlla Node, installa le dipendenze, crea `.env`, crea le tabelle,
carica i dati iniziali e avvia il cruscotto su http://localhost:3000.

In alternativa, a mano:

```bash
npm install
cp .env.example .env.local     # inserisci la tua DATABASE_URL
npx drizzle-kit push           # crea le tabelle
node src/db/run-seed.js        # dati iniziali
npm run dev                    # http://localhost:3000
```

## Messo online

Guida completa passo-passo in [DEPLOYMENT.md](./DEPLOYMENT.md):
GitHub → Neon/Supabase → Vercel → sottodominio one.com → TradingView.

Script pronti, senza token da digitare:

```bash
bash scripts/publish-github.sh   # crea il repo privato e carica il codice (login dal browser)
bash scripts/deploy-vercel.sh    # in alternativa: pubblica su Vercel senza GitHub
```

Nel cruscotto, scheda **Vai Live (Facile)**, la stessa procedura è interattiva
e mostra lo stato di prontezza su `/api/config-status`.

## Endpoint principali

| Rotta | Uso |
|---|---|
| `POST /api/webhook/tradingview` | webhook alert TradingView (secret del bot) |
| `POST /api/autopilot` | esecuzione autonoma 3H senza TradingView |
| `GET/POST /api/vapi-ladder` | stato e backtest della scala |
| `POST /api/emergency-stop` | kill-switch: mette in pausa tutti i bot |
| `GET /api/config-status` | checklist di produzione |
| `GET /api/health` | healthcheck |

## Avvertenza

La martingala aumenta l'esposizione e la strategia non prevede stop loss.
Usa size ridotte, prova in paper trading e verifica i livelli sul feed
dell'exchange che usi per l'esecuzione.
