#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Bull Lab — sistema la cartella "doppia" (bull-lab-bot/bull-lab-bot)
#
#   bash scripts/flatten-project.sh
#
# Va lanciato dalla cartella che GitHub Desktop ha come repository.
# Se i file del progetto sono rinchiusi in una sottocartella, li porta al livello
# superiore, così il commit ha qualcosa da salvare e Vercel trova package.json.
# ---------------------------------------------------------------------------
set -euo pipefail

green() { printf "\033[32m✓\033[0m %s\n" "$1"; }
yellow() { printf "\033[33m!\033[0m %s\n" "$1"; }
red() { printf "\033[31m✗\033[0m %s\n" "$1"; }
bold() { printf "\033[1m%s\033[0m\n" "$1"; }

bold "Controllo struttura · $(pwd)"

# Già a posto?
if [ -f package.json ]; then
  green "package.json è già nella cartella corrente: niente da spostare."
  exit 0
fi

# Cerca la sottocartella che contiene package.json (un solo livello)
CANDIDATES=()
for dir in */; do
  [ -d "$dir" ] || continue
  case "$dir" in node_modules/|.git/|.next/) continue;; esac
  if [ -f "${dir}package.json" ]; then
    CANDIDATES+=("${dir%/}")
  fi
done

if [ ${#CANDIDATES[@]} -eq 0 ]; then
  red "Nessuna sottocartella con package.json trovata."
  echo "  Contenuto attuale:"
  ls -1
  echo "  Probabilmente sei nella cartella sbagliata: cerca il progetto con"
  echo "    find ~ -maxdepth 4 -name package.json -not -path '*/node_modules/*'"
  exit 1
fi

if [ ${#CANDIDATES[@]} -gt 1 ]; then
  red "Più sottocartelle contengono package.json: non so quale usare."
  printf '  - %s\n' "${CANDIDATES[@]}"
  exit 1
fi

INNER="${CANDIDATES[0]}"
yellow "Trovato il progetto in: $INNER/"
bold "Sposto i file al livello superiore…"

# Sposta tutto tranne .git (quello resta al livello superiore) e node_modules
shopt -s dotglob nullglob
for item in "$INNER"/*; do
  base=$(basename "$item")
  [ "$base" = ".git" ] && continue
  [ "$base" = "node_modules" ] && continue
  [ "$base" = ".next" ] && continue
  if [ -e "$base" ]; then
    warn_msg="$base esiste già al livello superiore: unisco"
    echo "  ! $warn_msg"
    cp -R "$item"/. "$base"/ 2>/dev/null || cp -R "$item" "$base"
  else
    mv "$item" .
  fi
done
shopt -u dotglob nullglob

# Rimuove la sottocartella ormai vuota
if [ -d "$INNER" ]; then
  rm -rf "$INNER"
fi

green "Struttura sistemata"

# Verifiche
echo
bold "Verifica"
[ -f package.json ] && green "package.json al livello corretto" || { red "package.json mancante"; exit 1; }
[ -d src ] && green "cartella src/ presente" || red "cartella src/ mancante"
[ -d .git ] && green "repository git presente" || yellow "nessun .git: serve git init"
[ -f .gitignore ] && green ".gitignore presente" || yellow "manca .gitignore"

echo
bold "Ora in GitHub Desktop:"
cat <<'TXT'
  1. Chiudi la finestra di errore con Close
  2. Scrivi un messaggio nel campo "Summary" (es. Bull Lab Trading System)
  3. Clicca "Commit to main"
  4. Clicca "Publish branch" in alto
TXT
