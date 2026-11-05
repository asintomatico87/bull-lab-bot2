# Riparti da qui (2 minuti)

Hai cancellato la copia locale del progetto. Non è un problema: il codice completo
vive in questo ambiente. Hai tre strade, scegline una.

---

## A — Ti serve solo usare il bot adesso

Il cruscotto è già online su questo ambiente. Non scaricare niente:

1. Apri l'indirizzo della preview (quello che vedi nella barra del browser).
2. Vai in **Ladder 3H** e controlla livelli e base size.
3. Lascia tutto in **paper**: i segnali arrivano lo stesso.

Il dominio serve solo per stabilità nel tempo.

---

## B — Vuoi ripartire sul tuo computer

1. Scarica di nuovo il progetto dall'ambiente (pulsante di download / export).
2. Scompatta la cartella.
3. **Entra nella cartella che contiene `package.json`** (importante: se sei in una
   cartella vuota o vecchia, `setup.sh` non c'è e lo script non parte).
4. Apri il terminale lì dentro ed esegui:

```bash
bash setup.sh
```

Lo script (si trova nella **radice** del progetto, non dentro `scripts/`) installa le
dipendenze, chiede la connessione al database, crea le tabelle,
carica la strategia VAPI Ladder e avvia il cruscotto su `http://localhost:3000`.
Se Node.js non c'è, installalo prima da nodejs.org (versione LTS).

---

## C — Vuoi andare online con il tuo dominio

Ordine corretto:

1. **Copia locale**: scarica il progetto (punto B, senza lanciare lo script).
2. **GitHub** (facoltativo, salta al punto 3 se non ti serve):
   - la via più semplice è **GitHub Desktop** → *Add local repository* → *Publish repository* → privato;
   - oppure `bash scripts/publish-github.sh` (crea il repo e carica il codice).
   Non serve nessun token da digitare a mano se usi GitHub Desktop.
3. **Vercel**: vercel.com → *Continue with GitHub* → *Import* il repository.
   In alternativa `bash scripts/deploy-vercel.sh` (pubblica senza GitHub).
4. **Database**: Neon o Supabase, poi dal tuo computer:
   `DATABASE_URL="postgresql://..." npx drizzle-kit push`
   `DATABASE_URL="postgresql://..." node src/db/run-seed.js`
5. **Variabili su Vercel**: `DATABASE_URL`, `NEXT_PUBLIC_APP_URL=https://bot.bulllab.one`,
   `DASHBOARD_USER`, `DASHBOARD_PASSWORD`.
6. **Dominio**: Vercel → Settings → Domains → `bot.bulllab.one`, poi il CNAME su one.com.
7. **Controllo**: `https://bot.bulllab.one/api/config-status` tutto verde.
8. **TradingView**: aggiorna l'URL del webhook al nuovo dominio.

Guida dettagliata: [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Cosa NON è andato perso

- Codice completo di tutte le sezioni del cruscotto.
- Strategia VAPI Ladder 3H con le 6 regole (buy intrabar, sell a chiusura).
- Script Pine Script v5 generato dal cruscotto.
- Guida di deploy, checklist in-app e script di pubblicazione.

## Cosa devi rifare tu

- La copia locale, se la vuoi (punto B).
- Il database di produzione, se intendi usarlo online (punto C4).
- Gli alert di TradingView, solo quando il dominio sarà attivo: cambia l'URL,
  la secret del bot resta la stessa.

> Nota: se avevi già creato repository o progetti su GitHub/Vercel e li hai cancellati,
> la procedura qui sopra li ricrea da zero in pochi minuti. Non esistono dati tuoi
> andati perduti lato cloud: non avevi ancora completato quel passaggio.

---

## Se sei già a metà e il database non parte

Sintomo: dopo aver incollato la stringa di Neon compare

```
Reading config file '.../drizzle.config.json'
Using 'pg' driver for database querying
```

e torna al prompt senza creare le tabelle. Significa che hai una **copia vecchia**
del progetto, dove l'indirizzo del database era scritto dentro il file `.json`.

Dalla cartella del progetto (`cd ~/vapi-strategy`), in questo ordine:

```bash
# 1. elimina la configurazione vecchia
rm -f drizzle.config.json

# 2. crea quella nuova, che legge DATABASE_URL dal file .env
cat > drizzle.config.ts <<'CONFIG'
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
CONFIG

# 3. crea le tabelle sul tuo database
npx drizzle-kit push

# 4. carica la strategia e i bot demo
node src/db/run-seed.js

# 5. avvia il cruscotto
npm run dev
```

Poi apri http://localhost:3000 e vai nella scheda **Ladder 3H**.

Se al punto 3 compare un errore di connessione, la stringa nel `.env` è incompleta:
`cat .env` per controllarla, `nano .env` per correggerla (salva con `CTRL+O`, `Invio`,
esci con `CTRL+X`).

---

## Avviso SSL durante `drizzle-kit push` (innocuo)

Se compare:

```
Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca'
are treated as aliases for 'verify-full'...
```

non è un errore e non serve fare nulla. La connessione a Neon è cifrata e funziona.
L'avviso riguarda una modifica futura della libreria PostgreSQL.

Se vuoi toglierlo del tutto, nella `DATABASE_URL` sostituisci `sslmode=require` con
`sslmode=verify-full`. Facoltativo.

Segno che è andato tutto bene: `[✓] Changes applied`.

Dopo questo restano due comandi:

```bash
node src/db/run-seed.js   # strategia e bot demo
npm run dev               # cruscotto su http://localhost:3000
```

## Nota: il webhook non funziona da localhost

TradingView può chiamare solo indirizzi pubblici. Su `http://localhost:3000` gli alert
**non** arrivano. In locale puoi comunque provare tutta la strategia con il pulsante
**"CONTROLLA CANDELA 3H REALE ADESSO"** nella scheda *Vai Live (Facile)*: il motore
scarica da solo le candele dall'exchange, senza bisogno di TradingView.


---

## GitHub Desktop: non trovo "Aggiungi repository locale"

La voce che vedi, **"Aggiungi repository esistente"**, è quella giusta: GitHub Desktop la
chiama così nella schermata iniziale. Funziona però solo se la cartella è già un repository git.

Dalla cartella del progetto:

```bash
cd ~/vapi-strategy
bash scripts/git-init.sh
```

Lo script crea `.gitignore`, inizializza il repository, fa il primo commit e verifica che
il file `.env` (con la password del database) **non** venga incluso.

Poi in GitHub Desktop:

1. File → **Aggiungi repository esistente…**
2. Scegli la cartella `vapi-strategy`
3. In alto appare **Pubblica repository** → clicca
4. Lascia la spunta **Mantieni privato** → Pubblica

Se in `vapi-strategy` non esiste la cartella `scripts`, usa questi comandi equivalenti:

```bash
cd ~/vapi-strategy
printf 'node_modules/\n.next/\n.env\n.env*.local\n*.log\n.vercel\n' > .gitignore
git init -b main
git add -A
git commit -m "Bull Lab Trading System"
git ls-files | grep -x '.env' && echo "ERRORE: .env tracciato" || echo "OK: .env escluso"
```


---

## Ho pubblicato il repository: come verifico?

Apri github.com → profilo → **Repositories** → `bull-lab-bot`.

| Controllo | Deve essere così | Se è diverso |
|---|---|---|
| Etichetta **Private** accanto al nome | presente | Pubblicalo di nuovo come privato |
| Dentro ci sono `src/`, `public/`, `package.json` | presenti | Il push non è avvenuto: in GitHub Desktop premi **Pubblica repository** |
| Selettore branch in alto a sinistra | dice **main** | In GitHub Desktop: Branch → Rename → main |
| Il file `.env` | **non deve esistere** | Rimuovilo e cambia la password di Neon |
| Numero file | circa 57 | Se sono 1-2, hai pubblicato la cartella sbagliata |

In tutto il progetto ci sono **57 file tracciati** (senza contare `node_modules` e `.env`).
Se su GitHub ne vedi molti meno, hai aggiunto a GitHub Desktop una cartella diversa da
quella del progetto: in GitHub Desktop controlla il percorso mostrato in alto
(*Repository → Repository settings → Local path*).

### Il repository è vuoto / vedo solo "Quick setup"

Significa che la cartella non era un repository git quando l'hai aggiunta. Ripeti:

```bash
cd ~/vapi-strategy
git status
git log --oneline | head -3
```

Se `git status` dice "not a git repository", esegui `bash scripts/git-init.sh` e poi in
GitHub Desktop riprova **Pubblica repository**.

---

## Ho creato una nuova repository invece di aggiungere il progetto

Sintomo in GitHub Desktop: in alto a sinistra il repository c'è, il branch è `main`, ma nella
scheda **History** compare un solo commit con **1 changed file** (`.gitattributes`) e nessun
file del progetto. Inoltre il pulsante **Publish repository** è ancora visibile.

Significa che è stato usato *Crea nuova repository*: GitHub Desktop ha creato una cartella
nuova (in genere `~/Documents/GitHub/<nome>`) e ci ha messo dentro solo i suoi file iniziali.
Il progetto vero è rimasto in `~/vapi-strategy`.

### Rimedio, in 5 mosse

1. In GitHub Desktop: menu **Repository → Remove…** (o *Rimuovi repository*).
   Conferma. Attenzione: rimuove il collegamento dall'app, **non** cancella file.
   Il repository non è ancora su GitHub, quindi non si perde nulla online.

2. Nel terminale, entra nel progetto **vero** e verifica di essere nel posto giusto:

```bash
cd ~/vapi-strategy
ls package.json src
```

   Devono comparire `package.json` e la cartella `src`. Se non compaiono, sei nella cartella
   sbagliata: cerca quella giusta con `find ~ -name package.json -maxdepth 4`.

3. Prepara il repository git (protegge `.env` prima di tutto):

```bash
printf 'node_modules/\n.next/\n.env\n.env*.local\n*.log\n.vercel\n' > .gitignore
git init -b main
git add -A
git commit -m "Bull Lab Trading System"
git ls-files | wc -l
git ls-files | grep -x '.env' && echo "ERRORE: .env tracciato" || echo "OK: .env escluso"
```

   Il penultimo comando deve stampare un numero **vicino a 57**, non 1 o 2.
   L'ultimo deve stampare `OK: .env escluso`.

4. In GitHub Desktop: **File → Aggiungi repository esistente…** e scegli `vapi-strategy`.
   In alto comparirà **Pubblica repository**.

5. Clicca **Pubblica repository**, nome `bull-lab-bot`, spunta **Mantieni questo codice privato**,
   conferma.

### Come riconoscere di aver fatto giusto

Nella scheda **History** devono apparire decine di file (cartelle `src`, `public`, `scripts`,
`package.json`, `README.md`) e il comando di verifica deve riportare circa 57 file.

---

## Errore "File size limit exceeded" durante la pubblicazione

Messaggio di GitHub Desktop:

```
File size limit exceeded
The push operation includes a file which exceeds GitHub's file size restriction of 100MB.
node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node (116.10 MB)
```

**Causa:** è stato pubblicato anche `node_modules`, la cartella delle librerie scaricate
(centinaia di MB). Non deve mai finire su GitHub: si ricrea con `npm install`.
Succede quando `.gitignore` viene creato dopo aver aggiunto i file all'indice.

**Rimedio, dal terminale:**

```bash
cd ~/vapi-strategy
bash scripts/fix-git-large-files.sh
```

Se lo script non c'è, questi comandi fanno la stessa cosa:

```bash
cd ~/vapi-strategy
printf 'node_modules/\n.next/\n.env\n.env*.local\n*.log\n.vercel\n' > .gitignore
git rm -r --cached node_modules .next
git add -A
git commit --amend -m "Bull Lab Trading System"
git ls-files | wc -l                                  # atteso: circa 57
git ls-files | grep -x '.env' || echo "OK: .env escluso"
git ls-files | grep -c node_modules || echo "OK: node_modules escluso"
```

Poi in GitHub Desktop premi di nuovo **Publish branch**.

**Nota:** se il commit non è ancora arrivato su GitHub (il push è stato rifiutato), non
serve nessuna riscrittura di storia: `--amend` è sufficiente e sicuro.

---

## node_modules è ANCORA su GitHub dopo il tentativo

Se dopo `git rm --cached` vedi ancora `node_modules` sul repository, una di queste tre
cose è successa:

1. **Hai digitato i comandi in un'altra cartella.** Controlla: `pwd` deve finire con
   `vapi-strategy` (o il nome della tua cartella progetto) e `ls package.json` deve trovarlo.
2. **Il push non è partito dopo la modifica**, quindi GitHub mostra ancora il commit vecchio.
3. **Il commit su GitHub esiste già** con i file pesanti: in quel caso va sostituito, non
   solo aggiornato localmente.

### Procedura unica, dalla cartella giusta

```bash
cd ~/vapi-strategy
pwd && ls package.json
bash scripts/reset-git-index.sh
```

Lo script stampa un riepilogo. Devi leggere esattamente:

```
✓ node_modules assente
✓ .env assente
File nel repository:  ~57
```

Se `File nel repository` è un numero grande (migliaia), lo script ha fallito: incollami
l'output e lo sistemiamo.

### Poi, in GitHub Desktop

Il pulsante in alto deve dire **Publish branch**. Premilo. Se invece dice **Push origin**
premilo ugualmente. In entrambi i casi aspetti la conferma e ricarichi la pagina del
repository su GitHub con `Cmd+R` (la cache del browser mostra la versione vecchia).

### Se GitHub mostra ancora i file pesanti dopo il push

Succede solo se quel commit era già arrivato online. In quel caso il repository va
ricreato vuoto, perché GitHub conserva la storia:

1. Su GitHub: *Settings → General → scendi in fondo → Delete this repository*, scrivi il
   nome per confermare.
2. Su Vercel non serve fare nulla: non hai ancora importato niente.
3. In GitHub Desktop: *Repository → Repository settings → Remote → rimuovi l'URL*, oppure
   *Repository → Remove* e poi *Aggiungi repository esistente* di nuovo.
4. Pubblica di nuovo: questa volta partirà solo il codice pulito.

La verifica da fare prima di ripubblicare è una sola:

```bash
git ls-files | grep -c node_modules    # deve rispondere 0
git ls-files | grep -c '^\.env$'       # deve rispondere 0
git ls-files | wc -l                   # deve rispondere ~57
```


