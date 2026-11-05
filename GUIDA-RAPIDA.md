# GUIDA RAPIDA — dalla A alla Z

Tutto quello che serve, in ordine, senza saltare passaggi.
Quando un comando funziona, passi al successivo. Se uno dà errore, ti fermi lì.

---

## A. Riaprire il sito in locale (dopo aver chiuso il terminale)

Chiudere la finestra del terminale **spegne** il cruscotto: è normale, non si è rotto nulla.
Il progetto e il database restano sul disco.

1. Apri l'app **Terminale** (Spotlight: `Cmd+Spazio`, scrivi "Terminale", Invio).
2. Entra nella cartella del progetto:

```bash
cd ~/vapi-strategy
```

3. Controlla di essere nel posto giusto:

```bash
ls package.json
```

Deve stampare `package.json`. Se dice "No such file", la cartella non è quella: cerca con
`find ~ -name package.json -maxdepth 4`.

4. Avvia il cruscotto:

```bash
npm run dev
```

5. Aspetta la scritta `Ready` e poi apri **http://localhost:3000** nel browser.

**Ricorda:** il sito funziona solo mentre quel comando è in esecuzione. Per fermarlo `CTRL+C`,
per riaccenderlo `npm run dev`.

---

## B. Se il sito in locale non parte

Dai prima un'occhiata al database, che è la causa più frequente:

```bash
node scripts/check-db.js
```

| Cosa stampa | Cosa fare |
|---|---|
| `✓ Tutte le 5 tabelle presenti` | Il database è a posto: il problema è altro, guarda il messaggio di `npm run dev` |
| `✗ Connessione fallita` | La stringa in `.env` è sbagliata o Neon è sospeso |
| `✗ File .env mancante` | Ricrealo (vedi sotto) |

Se manca `.env`:

```bash
printf 'DATABASE_URL=postgresql://...\nNEXT_PUBLIC_APP_URL=http://localhost:3000\n' > .env
npx drizzle-kit push
node src/db/run-seed.js
```

(incolla al posto dei puntini la stringa di Neon)

---

## C. Togliere node_modules da GitHub e pubblicare

Serve il terminale aperto sulla cartella del progetto (punto A, passi 1-2).

```bash
bash scripts/reset-git-index.sh
```

Devi leggere:

```
✓ node_modules assente
✓ .env assente
File nel repository:  ~57
```

Poi, in **GitHub Desktop**:

1. Il pulsante in alto deve dire **Publish branch** → premilo.
2. Aspetta la conferma.
3. Su github.com apri `bull-lab-bot` e **ricarica con Cmd+R**.

Deve comparire: `src`, `public`, `scripts`, `package.json`, `README.md`.
Non devono comparire: `node_modules`, `.env`.

### Se dopo il push vedi ancora node_modules

Il commit pesante era già online: GitHub conserva la storia. Ricrea il repository:

1. GitHub → il repository → *Settings* → in fondo *Delete this repository* → scrivi il nome.
2. GitHub Desktop → *Repository → Remove* (i file locali restano).
3. *File → Aggiungi repository esistente* → scegli `~/vapi-strategy`.
4. **Publish repository** → nome `bull-lab-bot` → privato.

---

## D. Mettere online su Vercel

1. **vercel.com** → *Sign up* → **Continue with GitHub** (autorizza).
2. **Add New… → Project → Import** `bull-lab-bot`.
3. Framework: Next.js (già rilevato). Non toccare nulla.
4. Apri **Environment Variables** e aggiungi:

| Nome | Valore |
|---|---|
| `DATABASE_URL` | la stringa di Neon (la trovi con `cat .env`) |
| `NEXT_PUBLIC_APP_URL` | `https://bot.bulllab.one` |
| `DASHBOARD_USER` | utente a piacere |
| `DASHBOARD_PASSWORD` | password lunga |

5. **Deploy** → attendi *Ready* (1-2 minuti).
6. Apri `https://IL-TUO-INDIRIZZO.vercel.app/api/config-status`: le voci a `true` sono a posto.

---

## E. Collegare il dominio bot.bulllab.one

1. Vercel → *Settings → Domains → Add* → `bot.bulllab.one`.
2. Vercel mostra un valore CNAME (tipo `cname.vercel-dns.com`): **usa quello che leggi**.
3. one.com → *Control Panel → Domain → DNS settings → Create new record → CNAME*:
   - Hostname: `bot`
   - Is an alias of: il valore mostrato da Vercel
   - TTL: vuoto
4. Attendi la propagazione e verifica `https://bot.bulllab.one/api/config-status`.

---

## F. Aggiornare TradingView

Negli alert: *Impostazioni → URL Webhook* →

```
https://bot.bulllab.one/api/webhook/tradingview
```

La secret del bot non cambia. Il webhook **non** funziona da `localhost`: in locale usa il
pulsante "Controlla candela 3H reale adesso" nella scheda *Vai Live (Facile)*.

---

## Promemoria sicurezza

- `.env` non va mai su GitHub: contiene la password del database.
- Le chiavi API degli exchange si inseriscono nell'app, non nel codice.
- Prima di usare soldi veri: 5-10 candele in paper con base size piccola.

---

## Errore "Commit failed · nothing added to commit but untracked files"

Nel messaggio compare una cartella con il **nome del progetto dentro se stessa**:

```
On branch main
Untracked files:
	bull-lab-bot/
nothing added to commit but untracked files present
```

**Causa:** i file del progetto sono finiti in una sottocartella, invece di stare nella
cartella che GitHub Desktop usa come repository. Per questo git non trova nulla da salvare,
e Vercel non troverebbe `package.json`.

### Rimedio in 3 mosse

**1. Togli il repository da GitHub Desktop**

Menu *Repository → Remove…* → conferma. Non cancella i file, toglie solo il collegamento.

**2. Sposta i file al posto giusto (Terminale)**

Controlla com'è la struttura:

```bash
cd ~/Downloads/bull-lab-bot
ls
```

Se nell'elenco compare ancora `bull-lab-bot` (una cartella con lo stesso nome), allora:

```bash
cd ~/Downloads
mv bull-lab-bot bull-lab-bot-vecchia
mv bull-lab-bot-vecchia/bull-lab-bot .
rm -rf bull-lab-bot-vecchia
cd bull-lab-bot
ls package.json
```

`ls package.json` deve stampare `package.json`. Se lo stampa, la struttura è corretta.

**3. Riaggiungi il repository**

GitHub Desktop → *File → Aggiungi repository esistente…* → scegli `~/Downloads/bull-lab-bot`.
La scheda **History** deve mostrare decine di file. In alto premi **Publish branch**.

### Alternativa con lo script

Se nella cartella esiste `scripts/flatten-project.sh`:

```bash
cd ~/Downloads/bull-lab-bot
bash scripts/flatten-project.sh
```

Lo script rileva la sottocartella, sposta i file al livello superiore, conserva il
repository git e verifica che `package.json`, `src` e `.gitignore` siano a posto.

---

## Ripartenza pulita (se la cartella locale è stata cancellata)

Se hai eseguito `rm -rf` su una cartella rinominata e ora `cd bull-lab-bot` dice
"no such file or directory", il progetto locale non c'è più. Non è grave: è tutto
recuperabile in 3 minuti e il database su Neon resta intatto.

### Il modo sicuro: scarica dal Terminale (non dal browser)

Il download dal browser a volte scompatta da solo e crea una cartella doppia.
Dal Terminale il risultato è prevedibile.

1. Apri il cruscotto nel browser e **copia l'indirizzo dalla barra** (quello che finisce
   con `.e2b.app` o con il tuo dominio). Ti serve solo la parte iniziale.

2. Nel Terminale, sostituisci `INDIRIZZO` con quello copiato:

```bash
cd ~/Downloads
rm -rf bull-lab-bot bull-lab-bot.zip
curl -L -o bull-lab-bot.zip "https://INDIRIZZO/bull-lab-bot.zip"
unzip -q bull-lab-bot.zip -d bull-lab-bot
cd bull-lab-bot
ls package.json
```

3. `ls package.json` **deve** stampare `package.json`. Se lo stampa, la struttura è corretta.

4. Reinstalla e riconfigura:

```bash
bash setup.sh
```

Ti chiederà di nuovo la stringa di Neon (il file `.env` non era nell'archivio, per sicurezza).

### Poi pubblica su GitHub

Il repository git è già dentro l'archivio, quindi GitHub Desktop lo riconosce:

1. GitHub Desktop → *File → Aggiungi repository esistente…*
2. Scegli `~/Downloads/bull-lab-bot`
3. La scheda *History* mostra decine di file
4. In alto: **Publish branch** → `bull-lab-bot` → **Keep this code private** → conferma

### Verifica finale prima di Vercel

```bash
cd ~/Downloads/bull-lab-bot
ls package.json src         # devono esistere entrambi
git ls-files | wc -l        # circa 65
```

### Perché è successo

Il comando `mv bull-lab-bot bull-lab-bot-vecchia` ha rinominato l'unica cartella
esistente. Il passaggio successivo cercava una sottocartella che non c'era, quindi è
fallito, e `rm -rf bull-lab-bot-vecchia` ha poi cancellato il progetto rinominato.
La regola: **prima `ls`, poi si sposta**. Il rinomina va usato solo quando dentro la
cartella esiste davvero un'altra cartella omonima.
