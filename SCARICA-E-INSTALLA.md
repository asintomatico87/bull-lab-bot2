# Scarica e installa — 4 minuti

## 1. Scarica

Apri il cruscotto online, vai nella scheda **Vai Live (Facile)** e clicca
**SCARICA .ZIP** in alto. In alternativa apri direttamente:

```
https://IL-TUO-INDIRIZZO/bull-lab-bot.zip
```

Oppure `https://IL-TUO-INDIRIZZO/api/download` (stesso archivio).

Cosa contiene: tutti i 61 file del progetto, il repository git già inizializzato,
la guida e **nessun segreto** (il `.env` non c'è).

## 2. Scompatta

Doppio clic sullo zip. Ottieni una cartella `bull-lab-bot`.

**Importante:** se il Mac crea una cartella doppia (`bull-lab-bot/bull-lab-bot`),
usa quella interna, quella che contiene `package.json`.

Verifica nel Terminale:

```bash
cd ~/Downloads/bull-lab-bot
ls package.json
```

Deve stampare `package.json`. Se dice "No such file", sei nella cartella sbagliata:
prova `cd ~/Downloads/bull-lab-bot/bull-lab-bot`.

## 3. Installa e avvia

```bash
bash setup.sh
```

Chiede la stringa di Neon (già ce l'hai), crea le tabelle, carica la strategia e avvia.
Alla fine apri **http://localhost:3000**.

Il sito funziona solo mentre il terminale esegue `npm run dev`. Per riaprirlo: `cd ~/Downloads/bull-lab-bot && npm run dev`.

## 4. Pubblica su GitHub

Il repository è già inizializzato dentro la cartella, quindi GitHub Desktop lo accetta subito:

1. Apri **GitHub Desktop** → *File → Aggiungi repository esistente…*
2. Scegli `~/Downloads/bull-lab-bot`
3. In alto premi **Publish repository**
4. Nome `bull-lab-bot`, spunta **Keep this code private**, conferma

Il push passa al primo colpo: l'archivio non contiene `node_modules`
(che è la causa dell'errore "File size limit exceeded").

Verifica su github.com, con Cmd+R per ricaricare: devi vedere `src`, `public`,
`scripts`, `package.json` e **non** `node_modules`.

## 5. Vercel

1. vercel.com → *Continue with GitHub*
2. *Add New… → Project → Import* `bull-lab-bot`
3. Environment Variables:

| Nome | Valore |
|---|---|
| `DATABASE_URL` | la stringa di Neon (`cat .env`) |
| `NEXT_PUBLIC_APP_URL` | `https://bot.bulllab.one` |
| `DASHBOARD_USER` | utente a piacere |
| `DASHBOARD_PASSWORD` | password lunga |

4. **Deploy** → attendi *Ready*

## 6. Dominio

Vercel: *Settings → Domains → Add* → `bot.bulllab.one`, poi il CNAME indicato
da Vercel nel pannello one.com (*DNS settings → Create new record → CNAME*,
Hostname `bot`, valore quello di Vercel).

## 7. TradingView

Negli alert: *URL Webhook* →

```
https://bot.bulllab.one/api/webhook/tradingview
```

Da `localhost` il webhook non riceve nulla: in locale usa il pulsante
"Controlla candela 3H reale adesso" nella scheda *Vai Live (Facile)*.

---

## Dopo il deploy su Vercel: verifica in 3 minuti

### 1. Stato del deploy

Nel progetto Vercel, in alto deve esserci **Ready** in verde.
Se c'è **Error**: apri *Deployments → il più recente → Building* e leggi le ultime righe rosse.

### 2. Le quattro variabili

*Settings → Environment Variables*: devono esserci tutte, con **Production** tra gli ambienti.

| Variabile | Come verificarla |
|---|---|
| `DATABASE_URL` | apri `/api/health`: deve dire `"ok":true` |
| `NEXT_PUBLIC_APP_URL` | apri `/api/config-status`: voce verde |
| `DASHBOARD_USER` | aprendo il sito compare la richiesta di credenziali |
| `DASHBOARD_PASSWORD` | idem |

Dopo aver aggiunto o modificato una variabile serve **Deployments → ⋯ → Redeploy**:
senza, la modifica non ha effetto.

### 3. I tre controlli che contano

| Cosa apri | Cosa deve rispondere |
|---|---|
| `https://…vercel.app/` | richiesta utente+password, poi la Dashboard con i bot |
| `https://…vercel.app/api/health` | `{"ok":true,"database":"connected"}` |
| `https://…vercel.app/api/config-status` | database, URL e password in verde |

Se `/api/health` dice `not_configured` → manca `DATABASE_URL`.
Se dice `unreachable` → stringa errata o progetto Neon sospeso.

### 4. Prova la strategia online

Nella scheda **Vai Live (Facile)** premi **"Controlla candela 3H reale adesso"**:
il motore scarica le candele dall'exchange e risponde con la decisione.
Se funziona sul dominio, il webhook di TradingView funzionerà allo stesso modo.

### 5. Ordine delle prossime cose

1. Dominio `bot.bulllab.one` (Vercel Domains + CNAME su one.com)
2. `/api/config-status` tutto verde
3. Aggiornare l'URL webhook negli alert di TradingView
4. 5-10 candele in paper, poi valutare le chiavi live
