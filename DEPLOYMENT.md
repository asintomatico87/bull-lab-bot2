# Deploy Bull Lab · BTC + ETH paper

Questa versione è limitata a due bot VAPI Ladder 3H, BTC/USDT ed ETH/USDT. Il webhook registra solo simulazioni paper. **Non configura né esegue ordini su Hyperliquid o altri exchange.**

## 1. Backup e aggiornamento database

Prima di sostituire i file, crea un backup del repository e del database Neon. Non includere `.env` nel repository.

Dalla cartella del progetto, con Node.js installato:

```bash
npm install
npx drizzle-kit push
```

`drizzle-kit push` aggiunge `event_id` e il vincolo univoco usato per deduplicare gli alert. Poi crea i bot paper mancanti:

```bash
node src/db/run-seed.js
```

Lo script non inserisce ordini demo e non crea profili exchange. I bot BTC/ETH già esistenti vengono preservati.

## 2. Variabili Vercel

In **Vercel → Project → Settings → Environment Variables** configura:

- `DATABASE_URL` — connection string pooled di Neon con TLS;
- `NEXT_PUBLIC_APP_URL` — URL HTTPS definitivo, per esempio `https://bot.bulllab.one`;
- `DASHBOARD_USER` — nome utente Basic Auth;
- `DASHBOARD_PASSWORD` — password lunga e unica.

Senza Basic Auth, in produzione la dashboard chiude l’accesso. Il webhook TradingView resta raggiungibile pubblicamente, ma richiede la secret del bot; il suo metodo GET non restituisce i log.

## 3. Caricamento su GitHub Desktop

1. Conserva una copia del progetto attuale.
2. Sostituisci i file con le versioni aggiornate, mantenendo i percorsi `src/...`.
3. In GitHub Desktop controlla **Changes**: non devono comparire `.env`, token o chiavi.
4. Fai commit e **Push origin**. Se il progetto è collegato a Vercel, attendi il deploy.
5. Verifica `/api/health`, l’accesso con Basic Auth e che nel cruscotto appaiano i due bot paper.

## 4. Configurazione TradingView

Segui `TRADINGVIEW-ALERTS.md` per creare due alert, uno per simbolo, sul grafico 3H. Ogni alert usa il Pine generato per la coppia corrispondente, **Any alert() function call**, webhook URL HTTPS e messaggio vuoto.

## Limiti intenzionali

- `/api/autopilot` è disabilitato;
- gli ordini manuali sono disabilitati;
- i profili e le chiavi exchange non vengono raccolti;
- il PnL paper viene calcolato con prezzo e commissioni del segnale;
- backtest e grafici sintetici sono dimostrativi, non storici;
- il kill switch mette in pausa i bot paper, non tocca posizioni di un exchange.

La fase Hyperliquid richiederà un connettore separato, testnet, gestione sicura delle chiavi e riconciliazione ordini/posizioni. Non attivare ordini reali con questa build.
