#!/usr/bin/env bash
# =============================================================================
# Bull Lab — sovrascrive il contenuto del TUO repo GitHub con questo progetto.
#
# PRIMA: copia tutti i file di questo progetto DENTRO la cartella del repo
#        clonato (quella che contiene .git) e lancia:
#
#            bash scripts/deploy-github.sh --dry-run     # prova, non tocca nulla
#            bash scripts/deploy-github.sh               # esegue davvero
#
# Lo script: controlla il repo, salva un backup del codice vecchio in un branch
# e in un tag, aggiunge i file, fa commit e push del branch corrente.
# Non usa mai --force.
# =============================================================================
set -euo pipefail

DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

red() { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[33m%s\033[0m\n' "$1"; }
step() { printf '\n\033[36m▸ %s\033[0m\n' "$1"; }
fail() { red "✕ $1"; exit 1; }

step "1/6 · Controllo di essere dentro il repo giusto"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Qui non c'è un repo git. Apri il terminale nella cartella del repo clonato (deve esistere .git), copiaci i file del progetto e rilancia."
[[ -f src/db/schema.ts && -f src/app/api/webhook/tradingview/route.ts ]] || fail "Non trovo i file del nuovo progetto in questa cartella. Copia prima tutto il progetto qui (tranne node_modules e .env)."
green "✓ repo trovato: $ROOT"

step "2/6 · Controllo del remote e del branch"
git remote get-url origin >/dev/null 2>&1 || fail "Nessun remote 'origin'. Aggiungilo con: git remote add origin https://github.com/<utente>/<repo>.git"
ORIGIN="$(git remote get-url origin)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" == "HEAD" ]] && fail "Sei in detached HEAD: fai 'git checkout main' e rilancia."
green "✓ origin: $ORIGIN"
green "✓ branch: $BRANCH"

step "3/6 · Controllo segreti"
[[ -f .gitignore ]] || fail ".gitignore mancante: impossibile garantire che .env non finisca su GitHub."
if git check-ignore -q .env; then
  green "✓ .env è ignorato"
else
  fail ".env NON è ignorato da .gitignore: interrompo per non pubblicare le credenziali."
fi
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  fail ".env risulta già tracciate da git. Rimuovilo con: git rm --cached .env && git commit -m 'chore: remove .env'"
fi
if git ls-files -z | tr -d '\0' | grep -E '(^|/)\.env$|\.pem$|\.key$' >/dev/null 2>&1; then
  fail "Ci sono file sensibili tracciati dal repo: controlla con git ls-files | grep -E '\\.env|\\.pem|\\.key'"
fi
green "✓ nessun file sensibile tra i file tracciati"

step "4/6 · Backup del codice vecchio"
STAMP="$(date +%Y%m%d-%H%M)"
BACKUP="legacy-backup-$STAMP"
if [[ "$DRY" == "1" ]]; then
  yellow "[dry-run] creerei il branch $BACKUP e il tag $BACKUP"
else
  git branch "$BACKUP"
  git tag "$BACKUP"
  green "✓ backup creato in locale: branch e tag '$BACKUP' (lo pubblico su GitHub insieme al push)"
fi

step "5/6 · Preparo i file"
git add -A
if git diff --cached --quiet; then
  yellow "Nessuna modifica da committare: forse i file sono già nel repo."
  exit 0
fi
CHANGED="$(git diff --cached --name-only | wc -l | tr -d ' ')"
DELETED="$(git diff --cached --diff-filter=D --name-only | wc -l | tr -d ' ')"
echo "File aggiunti/modificati: $CHANGED · file del vecchio progetto rimossi: $DELETED"
git diff --cached --name-status | head -25
if [[ "$DELETED" -gt 20 ]]; then
  yellow "Verranno rimossi $DELETED file del vecchio cruscotto (normale se hai svuotato la cartella prima di copiare il nuovo progetto)."
fi
if [[ "$DRY" == "1" ]]; then
  yellow "[dry-run] mi fermo qui: nessun commit, nessun push."
  exit 0
fi

step "6/6 · Commit e push"
git commit -m "feat: Bull Lab Trading System — VAPI Ladder 3H (dashboard, webhook TradingView, paper/live)"
green "✓ commit creato"
git push -u origin "$BRANCH"
git push origin "refs/heads/$BACKUP:refs/heads/$BACKUP" "refs/tags/$BACKUP:refs/tags/$BACKUP"
green "✓ push completato su $ORIGIN ($BRANCH)"
green "✓ backup pubblicato su GitHub: branch e tag '$BACKUP'"

cat <<'EOF'

──────────────────────────────────────────────────────────────
FATTO. Ora Vercel ricostruisce da sola (2-3 minuti).

Prossimi passi:
 1. Vercel → Environment Variables: DATABASE_URL, ADMIN_PASSWORD
 2. Vercel → Settings → Node.js Version: 22.x, poi Redeploy
 3. Apri https://bot.bulllab.one/api/health  → deve dire ok: true
 4. Apri https://bot.bulllab.one/setup      → "Test connessione"
 5. Aggiorna l'URL e il secret negli alert TradingView

Per tornare al vecchio codice:
  git checkout legacy-backup-<data>     (oppure Vercel → Deployments → Promote)
──────────────────────────────────────────────────────────────
EOF
