#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Bull Lab — setup locale completo, in un solo comando
#
#   bash setup.sh
#
# Funziona da solo: non dipende dalla cartella scripts/.
# Fa: controllo Node → dipendenze → .env → tabelle → dati iniziali → avvio.
# ---------------------------------------------------------------------------
set -euo pipefail

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok() { printf "\033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
err() { printf "\033[31m✗\033[0m %s\n" "$1"; }

bold "Bull Lab · configurazione locale"

# --- 0. Sono nella cartella giusta? -----------------------------------------
if [ ! -f package.json ]; then
  err "Qui non c'è package.json: non sei nella cartella del progetto (o la copia è incompleta)."
  echo
  echo "Contenuto attuale della cartella:"
  ls -1
  echo
  echo "Scarica di nuovo il progetto dall'ambiente, scompattalo e riprova DENTRO"
  echo "la cartella che contiene package.json."
  exit 1
fi
ok "Cartella del progetto riconosciuta ($(pwd))"

# --- 1. Node -----------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  err "Node.js non trovato. Scaricalo da nodejs.org (versione LTS) e riprova."
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  err "Node $(node -v) troppo vecchio: serve almeno la 20. Aggiorna da nodejs.org."
  exit 1
fi
ok "Node.js $(node -v) · npm $(npm -v)"

# --- 2. Dipendenze -----------------------------------------------------------
bold "1/4 · Installo le dipendenze (un paio di minuti)"
npm install
ok "Dipendenze installate"

# --- 3. Database -------------------------------------------------------------
bold "2/4 · Connessione al database"
if [ -f .env ] && grep -q '^DATABASE_URL=' .env; then
  ok "Uso la DATABASE_URL già presente in .env"
else
  cat <<'TXT'
Serve una stringa PostgreSQL (non serve installare PostgreSQL sul Mac).

  Neon, gratis e in 2 minuti:
    1. neon.com → Sign up → New Project → regione Frankfurt
    2. copia la "Connection string" (inizia con postgresql:// e contiene sslmode=require)

  Se hai PostgreSQL già installato in locale, puoi usare:
    postgresql://postgres:postgres@127.0.0.1:5432/app_db
TXT
  read -r -p "Incolla qui la DATABASE_URL: " DB_URL
  # pulizia: spazi, apici e virgolette incollati per errore
  DB_URL="$(printf '%s' "${DB_URL:-}" | tr -d '[:space:]' | sed -e 's/^["'\'']//' -e 's/["'\'']$//')"
  if [ -z "$DB_URL" ]; then
    err "Stringa vuota: interrompo."
    exit 1
  fi
  case "$DB_URL" in
    postgresql://*|postgres://*) ok "Formato stringa corretto" ;;
    *)
      err "La stringa deve iniziare con postgresql:// oppure postgres://"
      echo "Copiala da Neon: pulsante 'Connect' → 'Connection string'."
      exit 1
      ;;
  esac
  printf 'DATABASE_URL=%s\nNEXT_PUBLIC_APP_URL=http://localhost:3000\n' "$DB_URL" > .env
  ok "Creato il file .env (resta fuori da git)"
fi

# --- 4. Tabelle e dati -------------------------------------------------------
bold "3/4 · Creo le tabelle e carico la strategia VAPI Ladder"
set -a
# shellcheck disable=SC1091
. ./.env
set +a
if ! npx drizzle-kit push; then
  err "Non riesco a creare le tabelle."
  echo "Controlla che la stringa in .env sia quella di Neon, completa e con sslmode=require."
  echo "Per rivederla:  cat .env"
  echo "Per sostituirla:  nano .env   (salva con CTRL+O, Invio, esci con CTRL+X)"
  exit 1
fi
node src/db/run-seed.js || warn "I dati iniziali risultano già presenti: va bene lo stesso."
ok "Database pronto"

# --- 5. Avvio ----------------------------------------------------------------
bold "4/4 · Avvio del cruscotto"
cat <<'TXT'

  Apri nel browser:  http://localhost:3000
  Poi vai nella scheda "Ladder 3H".

  Interrompi con CTRL+C.
TXT
npm run dev
