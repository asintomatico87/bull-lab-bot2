#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Bull Lab — stampa le variabili da incollare su Vercel
#
#   bash scripts/mostra-variabili.sh
#
# Mostra, una per una, KEY e VALUE da copiare nel pannello Vercel.
# La DATABASE_URL viene letta dal file .env di questa cartella.
# La password NON viene scelta da questo script: la decidi tu.
# ---------------------------------------------------------------------------
set -euo pipefail

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok() { printf "\033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
err() { printf "\033[31m✗\033[0m %s\n" "$1"; }
line() { printf '%s\n' "------------------------------------------------------------"; }

bold "VARIABILI PER VERCEL · copia questi valori nel pannello"
line

# --- 1. DATABASE_URL --------------------------------------------------------
bold "VARIABILE 1 di 4"
echo "KEY:   DATABASE_URL"
if [ -f .env ] && grep -q '^DATABASE_URL=' .env; then
  DB=$(grep '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  # rimuove eventuale ?channel_binding non necessario
  DB=${DB%%&channel_binding*}
  echo "VALUE: $DB"
  ok "letta dal file .env di questa cartella"
else
  err "Non trovo .env in questa cartella."
  echo "Apri Neon → Connect → Connection string → copia quella che inizia con postgresql://"
fi
line

# --- 2. NEXT_PUBLIC_APP_URL -------------------------------------------------
bold "VARIABILE 2 di 4"
echo "KEY:   NEXT_PUBLIC_APP_URL"
echo "VALUE: https://bot.bulllab.one"
line

# --- 3. DASHBOARD_USER ------------------------------------------------------
bold "VARIABILE 3 di 4"
echo "KEY:   DASHBOARD_USER"
echo "VALUE: (scegli tu un nome semplice, esempio)  asintomatico"
line

# --- 4. DASHBOARD_PASSWORD --------------------------------------------------
bold "VARIABILE 4 di 4"
echo "KEY:   DASHBOARD_PASSWORD"
echo "VALUE: (scegli tu una password lunga, almeno 12 caratteri, esempio)"
echo "       BullLab2026-Sicura!"
warn "Scrivila anche in un posto sicuro: ti servirà per entrare nel cruscotto."
line

cat <<'TXT'
DOVE INCOLLARLE (Vercel):
  1. Apri il progetto bull-lab-bot2
  2. Settings → Environment Variables (oppure Environments → Production)
  3. Per ogni variabile: Add New → scrivi la KEY → incolla il VALUE
     → spunta Production (e anche Preview) → Save
  4. Dopo l'ultima: Deployments → ⋯ sul deploy più recente → Redeploy

CONTROLLO FINALE:
  https://bot.bulllab.one/api/health   → deve dire {"ok":true,"database":"connected"}
TXT
