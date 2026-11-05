# Bull Lab — da zero al nuovo bot su bot.bulllab.one

Guida unica, in ordine. Tempo totale: ~20 minuti. Non serve sapere git.

**Cosa è già pronto in questo progetto** (l'ho verificato io: build, typecheck e test del webhook passano):

- `.gitignore` che esclude `.env` e `node_modules` (senza questo, `git add -A` pubblicherebbe le tue chiavi);
- `scripts/deploy-github.sh`: mette in sicurezza il repo, salva il vecchio codice in un branch + tag di backup, fa commit e push;
- `.env.example` con tutte le variabili;
- `/api/health` che dice se DB, schema, modalità e secret sono a posto.

**Cosa devi fare tu** (servono le tue credenziali, non posso farle al posto tuo): push su GitHub, variabili su Vercel, alert su TradingView.

---

## Passo 1 — Scarica il progetto

Scarica questo progetto come ZIP dall'ambiente in cui stai lavorando e scompattalo in una cartella (es. `~/Downloads/bull-lab`). Dentro trovi `src/`, `public/`, `package.json`, `scripts/`.

Non copiare `node_modules` e non creare `.env` dentro il repo: le variabili si mettono solo su Vercel.

## Passo 2 — Backup del vecchio cruscotto (30 secondi)

Dal terminale:

```bash
git clone https://github.com/<TUO_UTENTE>/bull-lab-bot2.git
cd bull-lab-bot2
git branch legacy-backup
git push origin legacy-backup
```

Se non vuoi usare il terminale: GitHub → repo → **Releases → Draft a new release** → tag `legacy-backup` → **Publish**. Da quel momento il vecchio codice è recuperabile per sempre.

## Passo 3 — Sovrascrivi il repo (4 comandi)

Sempre dal terminale, nella cartella `bull-lab-bot2`:

```bash
# macOS / Linux: svuota la cartella MA conserva .git
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

# copia i file nuovi (adatta il percorso)
cp -R ~/Downloads/bull-lab/. .

# prova a vuoto: mostra cosa cambierebbe, non tocca niente
bash scripts/deploy-github.sh --dry-run

# esegue: backup automatico + commit + push
bash scripts/deploy-github.sh
```

Windows (PowerShell):

```powershell
Get-ChildItem -Force -Exclude .git | Remove-Item -Recurse -Force
Copy-Item -Path "$HOME\Downloads\bull-lab\*" -Destination . -Recurse -Force
bash scripts/deploy-github.sh --dry-run
bash scripts/deploy-github.sh
```

Lo script si ferma con un messaggio chiaro se: non sei in un repo, manca `origin`, `.env` non è ignorato, ci sono file sensibili già tracciati. Non usa mai `--force`.

Verifica su GitHub: devi vedere `src/`, `public/`, `DEPLOY.md`, `scripts/` e **nessun** `.env`.

Vercel parte da sola a ricostruire. La build fallirà finché non fai il Passo 4 e 5: è normale.

## Passo 4 — Database (Neon)

1. [neon.tech](https://neon.tech) → **New Project** → Postgres 17, region `eu-central-1` (oppure riusa un progetto esistente e crea **Branches → New Branch**).
2. Copia **due** stringhe di connessione:
   - **Direct connection** → serve al comando sotto, una volta sola;
   - **Pooled connection** (host con `-pooler`) → sarà la `DATABASE_URL` dell'app su Vercel.
3. Crea le tabelle (dal repo, una volta):

```bash
npm install
npx drizzle-kit push --dialect postgresql --schema ./src/db/schema.ts \
  --url "postgresql://...DIRECT..." --force
```

Deve finire con `Changes applied`. Non serve altro SQL: al primo caricamento l'app crea da sola impostazioni e simboli (BTC/ETH, base 500 USDT).

> Usa un branch Neon nuovo invece di quello vecchio: le tabelle hanno nomi/colonne diverse e un push sul DB vecchio potrebbe alterare dati esistenti.

## Passo 5 — Vercel

Progetto **bull-lab-bot2** → **Settings**:

1. **Environment Variables** (spunta Production + Preview):

   | Nome | Valore |
   |---|---|
   | `DATABASE_URL` | pooled Neon, con `?sslmode=require` |
   | `ADMIN_USER` | `admin` |
   | `ADMIN_PASSWORD` | una password tua (protegge la dashboard) |
   | `WEBHOOK_SECRET` | opzionale — se lo metti, ha priorità sul secret del DB |

2. **Node.js Version → 22.x** (l'SDK Hyperliquid richiede Node ≥ 22.12).
3. **Deployment Protection**: disattiva *Vercel Authentication* in Production, altrimenti TradingView riceve 401 e non arriva niente al bot. (In alternativa escludi `/api/webhook/`).
4. **Domains**: `bot.bulllab.one` deve servire direttamente, senza redirect verso apex/www e già in `https`.
5. **Deployments → … → Redeploy**: le variabili d'ambiente nuove non hanno effetto senza un nuovo deploy.

## Passo 6 — Verifica (2 minuti, in quest'ordine)

1. `https://bot.bulllab.one/api/health` → deve mostrare `ok: true`, `schema: true`, `mode: "paper"`, `secretConfigured: true`, `adminProtected: true`.
   - `ok:false` → database non raggiungibile (`DATABASE_URL` errata / SSL mancante).
   - `schema:false` → il Passo 4 non è stato eseguito sul DB giusto.
2. `https://bot.bulllab.one/` → chiede utente/password (se hai messo `ADMIN_PASSWORD`) e mostra la dashboard con BTC ed ETH.
3. **Setup & Diagnostica → Test connessione**: deve dare `PING_OK` (dominio raggiungibile, nessun redirect, secret e DB ok).
4. **Log webhook → Simulatore**: BUY rung 1 su BTC → compare il ciclo aperto in Dashboard; poi CLOSE con VAPI 13 → vendita e ciclo chiuso; infine **Impostazioni → Azzera dati paper**.

Se questi 4 punti passano, il bot funziona: quello che resta è solo TradingView.

## Passo 7 — TradingView

1. **Setup & Diagnostica → sezione 4**: copia **Webhook URL** e **Webhook secret**.
2. Apri il Pine, incolla il tuo script (nella sezione 5 c'è già con il nuovo secret) e mettilo su **BTC 3H**, poi su **ETH 3H**.
3. Crea l'alert: Condizione **BL_VAPI_LADDER → Any alert() function call**, scadenza aperta, **Notifiche → Webhook URL** con l'URL copiato. Non impostare filtri di frequenza (BUY = once per bar, uscite = once per bar close sono già nel codice).
4. Controlla **Log webhook** in dashboard: devi vedere ogni 3 ore un evento `BAR_CLOSE` con esito `ignored`/`TARGET_NOT_REACHED` (normale) e i `BUY` quando il VAPI scende.

## Passo 8 — Live (solo quando sei pronto)

1. Hyperliquid → **API → Create API Wallet**, salva la private key.
2. Vercel → env: `HL_PRIVATE_KEY`, `HL_NETWORK=testnet` per la prova, poi `mainnet`. Redeploy.
3. **Impostazioni**: PAPER → LIVE (il cambio è bloccato se hai cicli aperti).
4. Metti una size piccola (es. base 50 USDT), verifica l'ordine su Hyperliquid, poi alza la size.

## Tornare indietro (rollback)

- **Codice, istantaneo**: Vercel → Deployments → deployment precedente → **Promote to Production**.
- **GitHub**: `git checkout legacy-backup` oppure `git revert` dell'ultimo commit.
- **Database**: il vecchio cruscotto può usare tabelle diverse; se serve, rimetti la vecchia `DATABASE_URL` tra le env di Vercel e redeploy.

## Se qualcosa non funziona

| Sintomo | Causa più probabile |
|---|---|
| TradingView non lascia salvare l'alert | piano gratuito (serve Essential+) o 2FA non attiva |
| `404` sul webhook | path sbagliato nell'alert (deve finire con `/api/webhook/tradingview`) |
| Pagina HTML "Authentication Required" nei log Vercel | Deployment Protection attiva |
| `301/302/307/308` | redirect di dominio: usa l'URL finale |
| `ok:false` su `/api/health` | `DATABASE_URL` mancante/errata o DB spento |
| `schema:false` | `drizzle-kit push` non eseguito sul DB collegato |
| Webhook arrivano ma nessun ordine | guarda la colonna **Codice** nel Log webhook: `RUNG_OUT_OF_ORDER`, `DUPLICATE_BAR`, `TARGET_NOT_REACHED`, `NOT_AT_BAR_CLOSE`, `VAPI_ABOVE_LEVEL`, `KILL_SWITCH`… |

Tabella completa dei codici in `/setup` → sezione 8.
