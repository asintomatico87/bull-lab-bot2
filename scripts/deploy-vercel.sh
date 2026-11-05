#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Bull Lab — metti online il sito SENZA GitHub e SENZA token
#
# Uso (dalla cartella del progetto, sul tuo computer):
#   bash scripts/deploy-vercel.sh
#
# Serve solo Node.js installato. Il login a Vercel avviene dal browser:
# nessuna password da digitare nel terminale.
# ---------------------------------------------------------------------------
set -euo pipefail

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok() { printf "\033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
err() { printf "\033[31m✗\033[0m %s\n" "$1"; }

bold "Bull Lab · deploy diretto su Vercel (senza GitHub)"

if ! command -v node >/dev/null 2>&1; then
  err "Node.js non trovato. Installalo da nodejs.org (versione LTS) e riprova."
  exit 1
fi
ok "Node.js $(node -v)"

echo
bold "Passo 1/3 · Accesso a Vercel"
echo "Si apre il browser: scegli «Continue with GitHub», «Google» o email."
npx --yes vercel@latest login

echo
bold "Passo 2/3 · Variabili d'ambiente"
cat <<'TXT'
Servono quattro variabili. Verranno chieste una per una.

  DATABASE_URL          la stringa postgresql:// di Neon o Supabase
  NEXT_PUBLIC_APP_URL   https://bot.bulllab.one
  DASHBOARD_USER        nome utente del cruscotto
  DASHBOARD_PASSWORD    password lunga del cruscotto

Nota: se salti una variabile, potrai aggiungerla dopo da
vercel.com → Project → Settings → Environment Variables (poi Redeploy).
TXT

for VAR in DATABASE_URL NEXT_PUBLIC_APP_URL DASHBOARD_USER DASHBOARD_PASSWORD; do
  read -r -p "Premi INVIO per inserire $VAR (o 's' per saltare): " SKIP
  if [ "${SKIP:-}" != "s" ]; then
    npx --yes vercel@latest env add "$VAR" production || warn "Salto $VAR"
  fi
done

echo
bold "Passo 3/3 · Pubblicazione"
npx --yes vercel@latest --prod

echo
ok "Deploy completato."
cat <<'TXT'

Prossimi passi:
  1. Copia l'indirizzo di produzione mostrato sopra (es. https://bull-lab-bot.vercel.app).
  2. Crea le tabelle nel database di produzione, dal tuo computer:
       DATABASE_URL="postgresql://..." npx drizzle-kit push
       DATABASE_URL="postgresql://..." node src/db/run-seed.js
  3. Collega il dominio dal pannello Vercel (Settings → Domains → bot.bulllab.one).
  4. Controlla che sia tutto verde su https://IL-TUO-DOMINIO/api/config-status
  5. Aggiorna l'URL del webhook negli alert di TradingView.
TXT
