# Applica il pacchetto Bull Lab paper BTC/ETH

## Contenuto

Questo archivio sovrascrive i file elencati con il percorso relativo al root del progetto. Include anche `src/app/globals.css`, che mancava nel bundle sorgente ricevuto, e una nuova API protetta per leggere gli esiti webhook senza esporre i payload.

## Procedura

1. Fai un backup del repository e un backup del database prima di iniziare.
2. Estrai l’archivio nella root del repository. Sovrascrivi i file omonimi. Se il progetto ha già un `.gitignore`, integra le righe fornite invece di cancellare le tue regole.
3. **Non copiare o condividere `.env`, `.env.local`, password, token o chiavi API.** L’archivio non contiene credenziali; `.env.example` contiene solo segnaposto. Lascia il tuo `.env` locale fuori da Git.
4. Installa i pacchetti e verifica il codice:

   ```bash
   npm ci
   npm run typecheck
   npm run build
   ```

5. Configura localmente `DATABASE_URL` in `.env` oppure le variabili in Vercel. Con backup pronto, applica l’aggiornamento schema:

   ```bash
   npx drizzle-kit push
   ```

6. Crea solo le istanze paper che mancano:

   ```bash
   node src/db/run-seed.js
   ```

7. Per il deploy, controlla in GitHub Desktop che `.env` e altri file sensibili non siano nella lista **Changes**. Poi fai commit, push e attendi il deploy Vercel.
8. Verifica Basic Auth, i due bot paper e gli endpoint; solo dopo segui `TRADINGVIEW-ALERTS.md` per impostare i due alert separati.

## Limiti

La build non è stata provata contro il database dell’utente né contro un alert TradingView reale, perché non sono state usate credenziali o account esterni. Il progetto è **paper only**: non invia ordini reali e non ha un connettore Hyperliquid. Il backtest grafico usa dati sintetici dimostrativi. Non procedere alla fase live con questo archivio.
