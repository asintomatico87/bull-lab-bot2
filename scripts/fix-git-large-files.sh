#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Bull Lab — sistema l'errore "File size limit exceeded" di GitHub
#
#   bash scripts/fix-git-large-files.sh
#
# Causa: node_modules (centinaia di MB) è stato incluso nel commit perché
# .gitignore è stato creato DOPO. GitHub rifiuta file oltre 100 MB.
#
# Cosa fa: scrive .gitignore, toglie node_modules/.next dall'indice git,
# riscrive il commit. I file NON vengono cancellati dal disco.
# ---------------------------------------------------------------------------
set -euo pipefail

green() { printf "\033[32m✓\033[0m %s\n" "$1"; }
yellow() { printf "\033[33m!\033[0m %s\n" "$1"; }
red() { printf "\033[31m✗\033[0m %s\n" "$1"; }
bold() { printf "\033[1m%s\033[0m\n" "$1"; }

bold "Bull Lab · rimozione file troppo grandi dal commit"

if [ ! -f package.json ]; then
  red "Non sei nella cartella del progetto (manca package.json)."
  exit 1
fi
if [ ! -d .git ]; then
  red "Questa cartella non è un repository git."
  exit 1
fi

# 1. .gitignore aggiornato (prima di tutto)
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
green "Scritto .gitignore (node_modules e .env restano fuori)"

# 2. Toglie i file pesanti dall'indice di git (NON dal disco)
git rm -r --cached node_modules >/dev/null 2>&1 || true
git rm -r --cached .next >/dev/null 2>&1 || true
green "node_modules e .next rimossi dal controllo di versione"

# 3. Ricrea il commit
git add -A
if git log --oneline | head -1 | grep -q .; then
  git commit --amend -m "Bull Lab Trading System" >/dev/null
  green "Commit riscritto senza file pesanti"
else
  git commit -q -m "Bull Lab Trading System"
  green "Nuovo commit creato"
fi

# 4. Controlli
echo
bold "Controlli"
COUNT=$(git ls-files | wc -l | tr -d ' ')
echo "  File nel repository: $COUNT (atteso: circa 57)"

if git ls-files | grep -qx '.env'; then
  red "ATTENZIONE: .env è tracciato: contiene la password del database!"
  git rm --cached .env >/dev/null
  git commit --amend -m "Bull Lab Trading System" >/dev/null
  yellow "Ho rimosso .env dal repository. Se l'hai già pubblicato, rigenera la password su Neon."
else
  green ".env NON è tracciato (password al sicuro)"
fi

if git ls-files | grep -q '^node_modules/'; then
  red "node_modules è ancora tracciato: qualcosa non ha funzionato."
  exit 1
else
  green "node_modules NON è tracciato"
fi

BIG=$(git ls-files -z | xargs -0 -I{} du -k "{}" 2>/dev/null | sort -rn | head -1)
echo "  File più grande: ${BIG:-n/d}"
echo
bold "Ora in GitHub Desktop: premi di nuovo «Publish branch»."
