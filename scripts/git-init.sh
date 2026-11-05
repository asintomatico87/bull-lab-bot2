#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Bull Lab — prepara la cartella per GitHub Desktop
#
#   bash scripts/git-init.sh
#
# Crea .gitignore, inizializza il repository e fa il primo commit.
# Dopo questo, in GitHub Desktop: "Aggiungi repository esistente" → Publish.
# ---------------------------------------------------------------------------
set -euo pipefail

green() { printf "\033[32m✓\033[0m %s\n" "$1"; }
yellow() { printf "\033[33m!\033[0m %s\n" "$1"; }
red() { printf "\033[31m✗\033[0m %s\n" "$1"; }
bold() { printf "\033[1m%s\033[0m\n" "$1"; }

bold "Bull Lab · preparazione repository git"

if [ ! -f package.json ]; then
  red "Qui non c'è package.json: non sei nella cartella del progetto."
  echo "Spostati dove si trova il progetto e riprova."
  exit 1
fi

# 1. .gitignore PRIMA di tutto: protegge .env (password del database)
if [ ! -f .gitignore ]; then
  printf 'node_modules/\n.next/\n.env\n.env*.local\n.env.production\n*.log\n.vercel\ntsconfig.tsbuildinfo\n' > .gitignore
  green "Creato .gitignore"
else
  if ! grep -qE '^\.env$' .gitignore; then
    printf '\n.env\n.env*.local\n' >> .gitignore
    green "Aggiunto .env al .gitignore esistente"
  else
    green ".gitignore già protegge .env"
  fi
fi

# 2. Repository
if [ -d .git ]; then
  yellow "Repository git già presente: aggiorno solo il commit"
else
  git init -b main >/dev/null
  green "Repository git inizializzato (branch main)"
fi

# 3. Identità (solo se manca)
if ! git config user.email >/dev/null 2>&1; then
  git config user.email "bot@bulllab.one"
  git config user.name "Bull Lab"
  yellow "Impostata identità locale per i commit (modificala se preferisci)"
fi

# 4. Commit
git add -A
git commit -q -m "Bull Lab Trading System" 2>/dev/null && green "Primo commit creato" || yellow "Nessuna modifica da salvare"

# 5. Verifica di sicurezza
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  red "ATTENZIONE: .env risulta tracciato. Lo rimuovo dal controllo di versione."
  git rm --cached .env >/dev/null
  git commit -q -m "Rimuove .env dal repository"
  green ".env tolto dal repository (il file resta sul disco)"
else
  green "Verifica: .env NON è nel repository"
fi

echo
bold "Fatto. Ora in GitHub Desktop:"
cat <<'TXT'
  1. File → Aggiungi repository esistente…
  2. Scegli questa cartella
  3. In alto compare "Pubblica repository" → clicca
  4. Lascia la spunta su "Mantieni privato" → Pubblica
TXT
echo
echo "Controllo finale (deve elencare solo file del progetto, mai .env):"
echo "  git ls-files | head -20"
