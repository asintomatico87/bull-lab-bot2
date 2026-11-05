# Bull Lab Trading System — mettere online il dominio definitivo

Guida breve, in ordine. Alla fine avrai: `https://bot.bulllab.one` con il cruscotto protetto,
il database di produzione e il webhook TradingView stabile.

**Non serve scaricare nulla per forza.** Il progetto gira su un server: quello che "sposti" è
il codice su un hosting e i dati su un database. Il download (file .zip) serve solo se vuoi
tenere una copia locale.

---

## Passo 0 — Decidi il nome

Hai già `bulllab.one`: il sottodominio `bot.bulllab.one` **non costa niente** e si crea dal
pannello DNS del registrar dove hai comprato il dominio. Comprare un dominio nuovo
(`bull-lab-bot.com` ecc.) costa in genere 10–15 €/anno.

Consiglio: usa `bot.bulllab.one`. Il dominio radice continua a fare il sito editoriale.

---

## Passo 1 — Mettere il codice su GitHub

1. Account gratuito su github.com.
2. **+ → New repository**, nome `bull-lab-bot`, visibilità **Private**, nessun README.
3. Nel progetto (il repository git è già inizializzato con il primo commit):

```bash
git remote add origin https://github.com/TUO-UTENTE/bull-lab-bot.git
git branch -M main
git push -u origin main
```

GitHub chiede le credenziali: usa un **Personal Access Token** al posto della password
(Settings → Developer settings → Tokens (classic) → Generate new token → scope `repo`).

### Non vuoi gestire il token? Tre strade più semplici

**A — Script incluso, con login dal browser**

```bash
bash scripts/publish-github.sh
```

Se hai installato GitHub CLI (`gh`), lo script apre il browser: autorizzi e lui crea il
repository privato e carica il codice. Nessun token da copiare.

**B — GitHub Desktop (la più semplice, zero terminale)**

1. Scarica GitHub Desktop (desktop.github.com) e accedi dal browser.
2. *File → Add local repository* → scegli la cartella del progetto.
3. *Publish repository*, spunta **Keep this code private**, conferma.

**C — Salta GitHub del tutto**

```bash
bash scripts/deploy-vercel.sh
```

Installa Vercel CLI al volo, apre il browser per l'accesso, chiede le quattro variabili
e pubblica il sito. GitHub non serve.

Il file `.env` è escluso da `.gitignore`: la connessione al database non finisce su GitHub.

> Come ottengo il codice se lavoro da questo ambiente? Esporta il progetto come archivio
> dal pannello dell'ambiente (o collegalo al repository GitHub) e poi lavora sulla copia:
> `npm install` e `npm run dev`. In alternativa carica direttamente i 51 file tracciati:
> il commit è già pronto, serve solo il `git push`.

---

## Passo 2 — Database di produzione

Il database locale di questo ambiente non è raggiungibile da internet.

1. Crea un progetto su Neon (neon.tech) o Supabase, piano gratuito.
2. Copia la stringa di connessione PostgreSQL **pooled** (`...?sslmode=require`).
3. Applicala al nuovo database:

```bash
DATABASE_URL="postgresql://..." npx drizzle-kit push
DATABASE_URL="postgresql://..." node src/db/run-seed.js
```

Il primo comando crea le tabelle, il secondo inserisce le strategie demo e il bot VAPI Ladder.

---

## Passo 3 — Hosting dell'applicazione

**Opzione A — Vercel (più semplice, piano gratuito)**

1. Metti il progetto in un repository GitHub privato.
2. Su vercel.com: *Add New → Project → Import* il repository.
3. Framework rilevato: Next.js. Non cambiare nulla.
4. In *Environment Variables* aggiungi (vedi `.env.example`):
   - `DATABASE_URL`
   - `NEXT_PUBLIC_APP_URL=https://bot.bulllab.one`
   - `DASHBOARD_USER`
   - `DASHBOARD_PASSWORD`
5. Deploy.

**Opzione B — VPS (Hetzner/DigitalOcean, ~5 €/mese)**

```bash
npm ci
npm run build
npm run start   # porta 3000, dietro Nginx o Caddy con HTTPS
```

In questo caso il PostgreSQL può stare sullo stesso VPS.

---

## Passo 4 — Collegare il dominio

Su Vercel: *Project → Settings → Domains → Add* → digita `bot.bulllab.one`.

Poi, nel pannello DNS del registrar di `bulllab.one`, crea:

| Tipo  | Nome | Valore                     |
|-------|------|----------------------------|
| CNAME | bot  | `cname.vercel-dns.com`     |

Attesa tipica della propagazione: da pochi minuti a qualche ora. HTTPS viene emesso in
automatico. Su VPS: CNAME/A verso l'IP del server e certificato con Caddy o certbot.

---

## Passo 5 — Ricontrollare che tutto sia a posto

Apri `https://bot.bulllab.one` con le credenziali impostate, poi visita:

```
https://bot.bulllab.one/api/config-status
```

Ogni voce deve risultare `true`. Se una è `false`, il campo `hint` dice cosa manca.

---

## Passo 6 — Aggiornare TradingView

L'URL del webhook cambia da quello di preview a:

```
https://bot.bulllab.one/api/webhook/tradingview
```

Negli alert già creati: *Alert → Impostazioni → URL Webhook* e sostituisci l'indirizzo.
La secret del bot non cambia.

---

## Passo 7 — Checklist prima dei soldi veri

- [ ] `DASHBOARD_PASSWORD` impostata (il cruscotto non è più pubblico).
- [ ] `/api/config-status` tutto verde.
- [ ] Bot in modalità **paper** per almeno 5–10 candele 3H.
- [ ] Base size entro il 2–5% del capitale per gradino (martingala 1x/1,5x/2,5x = 5x totale).
- [ ] Chiave API exchange **senza permesso di prelievo**.
- [ ] Kill-switch provato una volta.
- [ ] Solo dopo: passaggio a chiavi live con capitale ridotto.

---

## Note di sicurezza

- Le chiavi API degli exchange stanno nel database, mai nel codice e mai esposte al browser.
- La secret del webhook viaggia nell'alert: usala solo con l'URL HTTPS del tuo dominio.
- Ruota le chiavi dell'exchange ogni volta che sospetti una condivisione.
- Il webhook è protetto dalla secret, non dalla password del cruscotto: sono due livelli separati.
