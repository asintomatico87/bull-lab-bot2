# Ripristino veloce (se Vercel dà errore)

Il codice buono è questo pacchetto. Non usare cartelle vecchie né modifiche di altri agenti.

## 1. Scarica

Apri nel browser:

```
https://IL-INDIRIZZO-PREVIEW/bull-lab-bot.zip
```

(il link te lo do nel messaggio)

Scompatta. La cartella deve contenere `package.json` (non una cartella dentro l'altra).

## 2. Pubblica su GitHub (GitHub Desktop)

1. File → Aggiungi repository esistente → scegli la cartella scompattata
2. Se chiede commit: messaggio `ripristino` → Commit to main
3. Publish / Push origin

Se GitHub Desktop dà errore di file grandi: nella cartella lancia

```bash
bash scripts/reset-git-index.sh
```

poi di nuovo Push.

## 3. Vercel

1. Apri il progetto **bull-lab-bot2** (quello con dominio bot.bulllab.one)
2. Deployments → ⋯ sul più recente → **Redeploy**
   (se hai fatto push, parte da solo)

Se il Redeploy fallisce: Deployments → il rosso → copia le ultime 15 righe e mandale.

## 4. Controllo

Apri:

```
https://bot.bulllab.one/api/health
```

Deve dire `{"ok":true,"database":"connected"}`.

Poi entra nel cruscotto, scheda **Vai Live (Facile)**: in cima c'è **Configurazione pulita**.
