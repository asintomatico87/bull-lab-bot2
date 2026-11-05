# ETH da zero — come a 10 anni

Serve: un bot SOLO per Ethereum, uno script SOLO sul grafico ETH, un alert SOLO per ETH.

## A. Crea il bot ETH (nel cruscotto)

1. Apri https://bot.bulllab.one e inserisci utente e password.
2. Clicca in alto **Ladder 3H**.
3. A sinistra, dove c'è **Asset**, clicca il pulsante **ETH** (non BTC).
4. Non toccare i numeri: −25, −32, −40 e 1x / 1,5x / 2,5x vanno bene.
5. Scorri in fondo a sinistra e clicca il pulsante arancione
   **PUBBLICA BOT VAPI LADDER 3H ETH**.
6. Aspetta la fascia verde.
7. Clicca **Dashboard**. Trovi la card **Bull Lab VAPI Ladder 3H ETH**.
8. Copia la **Secret** (tipo BL_XXXXXXX) e mettila nelle Note.

Se in Dashboard vedi tanti bot vecchi: sulla card di quelli che NON sono
Ladder BTC o Ladder ETH clicca il cestino.

## B. Copia lo script ETH

1. Torna in **Ladder 3H**.
2. Controlla che sia ancora selezionato **ETH**.
3. Scorri fino al riquadro scuro **Pine Script v5**.
4. Clicca **Copia**.

## C. Mettilo su TradingView (solo grafico Ethereum)

1. Apri TradingView.
2. In alto cerca **ETHUSDT** (non Bitcoin).
3. A sinistra del grafico, il tempo delle candele deve essere **3h**.
4. In basso clicca **Pine Editor**.
5. Cancella quello che c'è, incolla lo script, clicca **Aggiungi al grafico**.
6. Controlla: sotto il grafico compare un oscillatore con linee a −25, −32, −40.

## D. Crea l'allarme

1. Clicca l'icona della **sveglia**.
2. **Crea alert**.
3. Condizione: scegli **Bull Lab VAPI Ladder 3H** →
   **Qualsiasi chiamata della funzione alert()**.
4. Frequenza: non toccare.
5. Scheda **Notifiche**: spunta **URL webhook** e incolla:

```
https://bot.bulllab.one/api/webhook/tradingview
```

6. Il campo **Messaggio** lascialo **vuoto**.
7. Clicca **Crea**.

Non incollare la secret in TradingView: è già dentro lo script.

## E. Come capisci che funziona

Oggi il VAPI di ETH è spesso **positivo** (es. +30). Il bot compra solo se
scende a **−25 o sotto**. Quindi **non vedere pallini è normale**.

Per una prova subito: scheda **TradingView Alert** → Cmd+F → scrivi
`SPARA ALERT` → nel campo VAPI metti `-26` → clicca il pulsante blu.

Deve comparire un riquadro verde con BUY_LONG ETH/USDT.

Poi vai in **Vai Live (Facile)** e clicca **Azzera Scala (0/3)**
(il test non deve restare contato come un acquisto vero).
