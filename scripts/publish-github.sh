#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Bull Lab — pubblica il progetto su GitHub senza digitare token
#
# Uso (dalla cartella del progetto):
#   bash scripts/publish-github.sh
#
# Cosa fa:
#   1. controlla che il progetto sia un repository git e che .env NON sia tracciato
#   2. crea il repository privato e fa il push
#   3. usa il login dal browser (GitHub CLI) oppure l'autenticazione che
#      GitHub Desktop ha già salvato sul computer
# ---------------------------------------------------------------------------
set -euo pipefail

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok() { printf "\033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
err() { printf "\033[31m✗\033[0m %s\n" "$1"; }

bold "Bull Lab · pubblicazione su GitHub"

# --- 1. controlli preliminari -------------------------------------------------
if [ ! -d .git ]; then
  warn "Nessun repository git in questa cartella (copia riscaricata): lo inizializzo ora."
  git init -b main >/dev/null
  git config user.email "bot@bulllab.one"
  git config user.name "Bull Lab"
  git add -A
  git commit -q -m "Bull Lab Trading System — primo commit"
  ok "Repository inizializzato con il primo commit"
fi

if [ ! -f .gitignore ]; then
  printf 'node_modules/\n.next/\n.env\n.env*.local\n*.log\n.vercel\n' > .gitignore
  ok "Creato .gitignore (il file .env resta fuori dal repository)"
fi

if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  err "Il file .env è tracciato da git: contiene la password del database."
  warn "Rimuovilo prima di continuare:  git rm --cached .env"
  exit 1
fi
ok "Il file .env è escluso dal repository"

if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  warn "Ci sono modifiche non salvate: le includo nel commit."
  git add -A
  git commit -m "Aggiornamento Bull Lab" || true
fi

# --- 2. banca il percorso migliore -------------------------------------------
USE_GH=0
if command -v gh >/dev/null 2>&1; then
  USE_GH=1
fi

if [ "$USE_GH" -eq 1 ]; then
  bold "GitHub CLI trovata: uso il login dal browser (nessun token da copiare)"
  if ! gh auth status >/dev/null 2>&1; then
    echo "Si apre la pagina di GitHub: inserisci il codice che vedi e autorizza."
    gh auth login --web --git-protocol https
  fi
  ok "Accesso GitHub attivo"

  read -r -p "Nome del repository [bull-lab-bot]: " REPO_NAME
  REPO_NAME=${REPO_NAME:-bull-lab-bot}

  if gh repo view "$REPO_NAME" >/dev/null 2>&1; then
    warn "Il repository esiste già: collego il remote e faccio il push."
    REMOTE_URL=$(gh repo view "$REPO_NAME" --json url --jq .url)
    git remote remove origin >/dev/null 2>&1 || true
    git remote add origin "$REMOTE_URL"
  else
    gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
    ok "Repository creato e codice caricato"
    gh repo view "$REPO_NAME" --web >/dev/null 2>&1 || true
    echo
    bold "Fatto. Ora vai su Vercel e importa $REPO_NAME."
    exit 0
  fi
fi

# --- 3. percorso senza GitHub CLI --------------------------------------------
bold "Percorso manuale"
cat <<'TXT'
1. Apri github.com → + → New repository
   Nome: bull-lab-bot   ·   Private   ·   nessun README   →   Create
2. Copia l'indirizzo del repository, esempio:
   https://github.com/TUO-UTENTE/bull-lab-bot.git
TXT

read -r -p "Incolla qui l'indirizzo del repository: " REMOTE_URL
if [ -z "${REMOTE_URL:-}" ]; then
  err "Nessun indirizzo inserito. Esco."
  exit 1
fi

git remote remove origin >/dev/null 2>&1 || true
git remote add origin "$REMOTE_URL"
git branch -M main

echo
bold "Ora serve l'autenticazione. Scegli come preferisci:"
cat <<'TXT'
  A) GitHub Desktop (consigliato, zero token)
     Aprilo → File → Add local repository → scegli questa cartella
     → Publish repository (privato). Fa tutto lui, dal browser.

  B) Terminale con token
     github.com → Settings → Developer settings → Tokens (classic)
     → Generate new token → spunta "repo" → copia il token
     Quando git chiede la password, incolla il TOKEN (non la password).

  C) GitHub CLI
     installa gh, poi:  gh auth login --web
     e rilancia questo script.
TXT

echo
read -r -p "Premi INVIO per tentare il push adesso (oppure Ctrl+C per usare GitHub Desktop): " _
git push -u origin main || {
  err "Push non riuscito: manca l'autenticazione."
  warn "Usa GitHub Desktop (opzione A) e poi rilancia:  bash scripts/publish-github.sh"
  exit 1
}

ok "Codice pubblicato su GitHub"
echo
bold "Prossimo passo: vercel.com → Add New → Project → Import del repository."
