# Bull Lab Trading System — VAPI Ladder 3H

Cruscotto + esecutore per la strategia **VAPI LazyBear (periodo 10)** su **BTC** ed **ETH**, timeframe **3H**.
Webhook TradingView → motore regole → Hyperliquid (paper/live). Next.js 16 (App Router) + PostgreSQL/Drizzle.

> Deploy passo passo: **[DEPLOY.md](./DEPLOY.md)**. Script di sovrascrittura repo: `scripts/deploy-github.sh`.

## Regole implementate

**BUY** (intrabar, al tocco del livello) — ladder in ordine, size su base USD (default 500 USDT):

| Rung | VAPI | Size |
|---|---|---|
| 1 | ≤ −25 | 1× |
| 2 | ≤ −32 | 1,5× |
| 3 | ≤ −40 | 2,5× |

- max 3 BUY per ciclo, nessuno stop loss;
- un solo BUY per candela 3H;
- ogni rung si riempie una volta sola e solo se è il prossimo del ladder;
- dopo una vendita parziale il ciclo non accetta altri BUY.

**SELL** (solo a candela 3H confermata), sui livelli VAPI:

| BUY nel ciclo | Uscite |
|---|---|
| 3 | VAPI ≥ 0 → 50% · VAPI ≥ 15 → 50% del residuo · VAPI ≥ 22 → chiude |
| 2 | VAPI ≥ 5 → 50% · VAPI ≥ 15 → chiude il resto |
| 1 | VAPI ≥ 12 → chiude tutto |

## Pagine

| Path | Cosa fa |
|---|---|
| `/` | dashboard: prezzi, gauge VAPI, ladder, cicli aperti, diagnosi |
| `/webhooks` | log di ogni webhook + simulatore segnali |
| `/history` | cicli e ordini |
| `/setup` | URL/secret, script Pine, test connessione, checklist |
| `/settings` | paper/live, kill-switch, size per simbolo, comportamento |
| `/api/webhook/tradingview` | endpoint TradingView (POST) e verifica raggiungibilità (GET) |
| `/api/health` | stato DB/schema/modalità/secret |

## Payload accettato

```json
{"secret":"…","ticker":"BTCUSDT","action":"BUY_LONG","rung":"1","vapi":-26.4,"price":95000,"barTime":"2025-01-01T00:00:00Z"}
{"secret":"…","ticker":"BTCUSDT","action":"CLOSE_LONG","closePct":50,"vapi":15.4,"price":120000,"barTime":"2025-01-01T03:00:00Z"}
```

Sono accettati anche `BUY` / `SELL` / `BAR_CLOSE` / `PING`, i campi `symbol`, `tf`, `tier`, e il formato `{"action":"…","price":…}` senza ticker (allora serve `?secret=` nell'URL). Ogni scarto è registrato con un codice esplicativo.

## Sviluppo locale

```bash
cp .env.example .env      # imposta DATABASE_URL
npm install
npx drizzle-kit push      # crea le tabelle
npm run dev               # http://localhost:3000
```

Test rapidi:

```bash
curl -X POST http://localhost:3000/api/webhook/tradingview \
  -H 'Content-Type: application/json' \
  -d '{"secret":"<secret da /setup>","action":"PING"}'
```

## Sicurezza

- `ADMIN_PASSWORD` protegge la dashboard (il secret del webhook è visibile solo lì); webhook e health restano pubblici.
- `.env` è in `.gitignore`: non committare mai chiavi.
- In paper nessun ordine reale: i fill sono simulati al prezzo del segnale e registrati nel DB.
- In live servono `HL_PRIVATE_KEY` (API wallet, non il wallet principale), `HL_NETWORK` e `HL_SLIPPAGE_PCT`.
