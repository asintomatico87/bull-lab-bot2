# TradingView: configurare i due alert VAPI Ladder 3H

Questa procedura crea **due alert distinti**, uno per BTC e uno per ETH. In questa versione l’endpoint simula gli ordini in paper; non è collegato a Hyperliquid.

## Prima di iniziare

1. Verifica che sul dashboard esistano i bot `Bull Lab VAPI Ladder 3H BTC` e `... ETH`.
2. In ciascun bot lascia `PAPER`, stato `active` e la coppia corretta.
3. Nella scheda **Alert TradingView** scegli l’asset, copia lo script relativo e il webhook URL. Non riutilizzare lo script BTC per ETH: ogni script contiene il ticker e la secret del suo bot.
4. Scegli un feed e mantienilo uguale durante la prova. Per il paper iniziale puoi usare i grafici spot `BINANCE:BTCUSDT` e `BINANCE:ETHUSDT`. Il volume dipende dal feed TradingView; in seguito, prima di collegare un exchange, rivaluteremo il feed.

## Crea l’alert BTC

1. Apri su TradingView `BINANCE:BTCUSDT` e seleziona **3H**.
2. Apri **Pine Editor**, incolla lo script BTC copiato dal dashboard, premi **Save** e **Add to chart**.
3. Premi **Create alert** (icona sveglia).
4. In **Condition**, scegli `Bull Lab VAPI Ladder 3H [LazyBear]` e la voce **Any alert() function call / Qualsiasi chiamata della funzione alert()**.
5. Apri **Notifications**, abilita **Webhook URL** e incolla l’URL mostrato dal dashboard, che termina con `/api/webhook/tradingview`.
6. Lascia **Message** vuoto. Il Pine invia già il JSON completo. Non usare `{{strategy.order.alert_message}}`.
7. Non aggiungere un filtro di frequenza: il codice imposta già gli alert buy una volta per barra e i sell una volta a chiusura barra.
8. Imposta nome e scadenza dell’alert secondo le tue preferenze, quindi salvalo.

## Crea l’alert ETH

Ripeti la procedura sul grafico `BINANCE:ETHUSDT`, sempre **3H**, ma copia lo script ETH dal dashboard. Crea un secondo alert separato. Verifica che il Pine ETH mostri `ETHUSDT` e che il bot ETH esista e sia attivo in paper.

## Cosa aspettarsi

- Un alert non viene inviato retroattivamente per segnali già presenti nello storico: parte quando il trigger si verifica dopo la creazione/riattivazione dell’alert.
- BUY: trigger intrabar sulla candela 3H; SELL: solo alla conferma della chiusura 3H.
- Gli eventi validi compaiono nella scheda **Log Paper** e nel dashboard con stato `PAPER_FILLED`.
- Un alert respinto per secret, asset, soglia, size o duplicato non produce un fill paper.
- Se modifichi ticker, secret, parametri o script, aggiorna il grafico e **ricrea l’alert**: TradingView conserva la versione dello script presente al momento della creazione.

## Controllo iniziale

Dopo aver salvato entrambi gli alert, verifica che siano **attivi** nella lista alert di TradingView e che il webhook URL sia HTTPS e identico a quello mostrato dal dashboard. Alla prima condizione raggiunta, controlla nel dashboard l’asset, l’azione e lo stato paper. Non passare a modalità live: non è implementata in questa versione.
