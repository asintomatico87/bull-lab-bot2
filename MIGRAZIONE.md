# Migrazione Bull Lab v1 → v2 (GitHub + Vercel)

Sostituisci il vecchio progetto **bull-lab-bot2** con questo, mantendo repo, Vercel e sottodominio.

## 1. Scarica il nuovo progetto
Dal cruscotto, pulsante **"Scarica progetto v2 (.zip)"** (o `https://bot.bulllab.one/setup/bull-lab-new.zip`).
Scomprimilo: ottieni la cartella `bull-lab-new`.

## 2. Sostituisci i file nel repo (da terminale)

**Mac / Linux** (dentro la tua clonazione di bull-lab-bot2):
```bash
cd bull-lab-bot2
find . -maxdepth 1 ! -name ".git" ! -name "." -exec rm -rf {} +   # svuota ma mantiene .git
cp -R ~/Downloads/bull-lab-new/. .                               # copia il nuovo progetto
git add -A
git commit -m "Bull Lab v2 — VAPI Ladder server"
git push
```

**Windows (PowerShell)**:
```powershell
cd bull-lab-bot2
Get-ChildItem -Force | Where-Object Name -ne ".git" | Remove-Item -Recurse -Force
Copy-Item "$env:USERPROFILE\Downloads\bull-lab-new\*" . -Recurse -Force
git add -A
git commit -m "Bull Lab v2 — VAPI Ladder server"
git push
```

> Se non hai una clonazione locale: crea un repo GitHub vuoto o cancella quello vecchio, poi dentro la cartella `bull-lab-new` esegui:
> `git init && git add -A && git commit -m "Bull Lab v2" && git remote add origin git@github.com:TUO-USER/bull-lab-bot2.git && git push -f origin main`

## 3. Vercel (1 minuto)
- Il deploy parte **automaticamente** allo stesso sottodominio `bot.bulllab.one`.
- Settings → Environment Variables: assicurati che esistano
  - `DATABASE_URL` (quella Neon, già presente)
  - `WEBHOOK_SECRET` (nuovo, es. `BL_QYYNXKA` — deve essere identico a quello dello script Pine)
  - opzionali: `BASE_USD=500`, `FEE_BPS=3.5`
- Le tabelle su Neon vengono **create automaticamente** alla prima richiesta: non serve nessun comando.

## 4. TradingView
1. Sostituisci il vecchio script con lo **script Pine v5** (nel cruscotto, sezione Setup).
2. Imposta `Ticker` = BTCUSDT / ETHUSDT e lo stesso `Webhook secret` di Vercel.
3. **Ricrea** gli alert (TV li associa alla versione dello script):
   - Condizione: `BL_VAPI_LADDER` → **Any alert() function call**
   - Messaggio: **vuoto** (lo genera lo script)
   - Webhook URL: `https://bot.bulllab.one/api/webhook`
   - Scadenza: open-ended
4. Richiedi un alert di prova o usa il pannello **Test Webhook** del cruscotto.

## 5. Verifica
Apri `https://bot.bulllab.one`: nel **Log Webhook** deve comparire la richiesta con esito.
Se compare `accepted/executed` → il bot paper è operativo.
