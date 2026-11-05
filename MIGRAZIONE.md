# Bull Lab v2 — ripartiamo semplice

## 1. Pubblica il codice con GitHub Desktop
1. Scarica `bull-lab-v2.zip` e decomprimilo.
2. Apri la cartella locale del repository `bull-lab-bot2` in Finder (GitHub Desktop → Repository → Show in Finder).
3. Copia **il contenuto** della cartella `bull-lab-v2` nella cartella del repository, sostituendo i file esistenti. Se nella cartella del repository restano file vecchi non presenti nello zip, eliminali (ma **non** eliminare la cartella nascosta `.git`).
4. In GitHub Desktop: scrivi un messaggio, premi **Commit to main** e poi **Push origin**. Non occorrono username/password nel Terminale.
5. In Vercel → Deployments: attendi il nuovo deploy **Ready** e controlla che corrisponda all'ultimo commit.

## 2. Vercel
Settings → Environment Variables:
- `DATABASE_URL`: indirizzo di connessione Neon. L'avviso “Needs Attention” indica solo che è un segreto visibile ai membri del progetto; non è un errore di connessione.
- `WEBHOOK_SECRET`: crea una stringa lunga e uguale a quella che imposterai nelle proprietà dello script Pine.
- `DASHBOARD_PASSWORD`: password per proteggere la dashboard, consigliata; `DASHBOARD_USER` è il nome utente (se assente: `admin`). La vecchia password della dashboard va bene.
- `BASE_USD`: opzionale, default `500`.

Dopo le modifiche alle variabili, fai un **nuovo deploy**. Non pubblicare mai il valore di `DATABASE_URL` o del secret nelle schermate.

## 3. Neon
Non fare nulla: la nuova app crea le sue tre tabelle (`cycles`, `trades`, `webhook_logs`) automaticamente alla prima visita. Le tabelle `bot_settings` e `symbol_config` erano del vecchio progetto e non sono usate da questa versione.

## 4. TradingView
Apri la dashboard → sezione **PASSO 2: Script Pine v5** → pulsante **Copia tutto lo script**. Incolla in Pine Editor. Imposta il grafico a 3H e il secret uguale a Vercel. Crea **un alert per BTC** e **un alert per ETH**, condizione “Any alert() function call”, Webhook URL `https://bot.bulllab.one/api/webhook`. Non sostituire il messaggio prodotto da `alert()`.

Il bot è PAPER: non manda ordini a Hyperliquid. Premi **Invia test** nella dashboard per provare server e database prima di impostare TradingView.
