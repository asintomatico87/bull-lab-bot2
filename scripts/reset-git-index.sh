#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Bull Lab — rimuove node_modules/.next dall'indice git e rifà il commit
#   bash scripts/reset-git-index.sh
# ---------------------------------------------------------------------------
set -euo pipefail

ok() { printf "\033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
err() { printf "\033[31m✗\033[0m %s\n" "$1"; }
bold() { printf "\033[1m%s\033[0m\n" "$1"; }

bold "Reset indice git · $(pwd)"

# --- controlli --------------------------------------------------------------
if [ ! -f package.json ]; then
  err "Manca package.json: non sei nella cartella del progetto."
  echo "  Cartella attuale: $(pwd)"
  echo "  Spostati con:     cd ~/vapi-strategy"
  exit 1
fi
if [ ! -d .git ]; then
  err "Manca la cartella .git: non è un repository."
  echo "  Esegui prima: git init -b main"
  exit 1
fi
ok "Cartella corretta: $(basename "$(pwd)")"

# --- gitignore sempre per primo --------------------------------------------
cat > .gitignore <<'IGNORE'
node_modules/
.next/
out/
build/
.env
.env*.local
.env.production
*.log
.vercel
tsconfig.tsbuildinfo
.DS_Store
IGNORE
ok ".gitignore scritto"

# --- rimozione dall'indice (i file restano sul disco) ----------------------
REMOVED=0
if git ls-files | grep -q '^node_modules/'; then
  git rm -r -q --cached node_modules
  REMOVED=$((REMOVED+1))
fi
if git ls-files | grep -q '^\.next/'; then
  git rm -r -q --cached .next
  REMOVED=$((REMOVED+1))
fi
if git ls-files | grep -qx '\.env'; then
  git rm -q --cached .env
  warn "Il file .env era tracciato: rimosso (la password resta solo sul tuo disco)"
  REMOVED=$((REMOVED+1))
fi
[ "$REMOVED" -eq 0 ] && ok "Nessun file pesante era tracciato" || ok "File pesanti rimossi dall'indice"

# --- nuovo commit -----------------------------------------------------------
git add -A
git commit --amend -m "Bull Lab Trading System" >/dev/null 2>&1 \
  && ok "Commit riscritto" \
  || { git commit -q -m "Bull Lab Trading System" && ok "Nuovo commit creato"; }

# --- verifiche --------------------------------------------------------------
echo
bold "Verifica"
COUNT=$(git ls-files | wc -l | tr -d ' ')
printf "  File nel repository:  %s   (atteso ~57)\n" "$COUNT"

if git ls-files | grep -q '^node_modules/'; then
  err "node_modules ANCORA tracciato"
  exit 1
else
  ok "node_modules assente"
fi

if git ls-files | grep -qx '.env'; then
  err ".env ancora tracciato: contiene la password del database"
  exit 1
else
  ok ".env assente"
fi

BIGGEST=$(git ls-files -z | xargs -0 du -k 2>/dev/null | sort -rn | head -1 | awk '{print $1" KB "$2}')
printf "  File più grande:      %s\n" "${BIGGEST:-n/d}"

if [ "$COUNT" -gt 300 ]; then
  warn "Sono ancora troppi file: controlla cosa contiene il repository con: git ls-files | head -30"
else
  ok "Dimensione del repository corretta"
fi

echo
bold "Ora in GitHub Desktop premi «Publish branch» (o Commit + Push)."
