/** Script Pine e messaggi mostrati nella pagina Setup. */

/** Versione indicatore minimale: manda un BUY al tocco del primo livello e un BAR_CLOSE a ogni chiusura 3H. */
export function pineScript(secret: string): string {
  return `//@version=5
indicator("Bull Lab — VAPI LazyBear (webhook 3H)", shorttitle="BL_VAPI", overlay=false, precision=2)

// ── Parametri (gli stessi della strategia) ─────────────────
length    = input.int(10, "Periodo VAPI", minval=1)
lvl1      = input.float(-25.0, "BUY 1 · VAPI ≤", step=1)
secretKey = input.string("${secret}", "Webhook secret")
sendBuys  = input.bool(true, "Invia BUY (intrabar, al tocco)")
sendClose = input.bool(true, "Invia BAR_CLOSE (a chiusura candela)")

// ── VAPI (Volume Accumulation Percentage Indicator, LazyBear) ──
rng  = high - low
x    = rng == 0 ? 0.0 : (2 * close - high - low) / rng
tva  = math.sum(volume * x, length)
tv   = math.sum(volume, length)
vapi = tv == 0 ? 0.0 : 100 * tva / tv

plot(vapi, "VAPI", color = vapi >= 0 ? color.new(color.green, 0) : color.new(color.red, 0), style = plot.style_columns)
hline(0,    "Zero",  color.gray)
hline(lvl1, "BUY 1", color.orange, hline.style_dashed)
hline(-32,  "BUY 2", color.orange, hline.style_dashed)
hline(-40,  "BUY 3", color.red,    hline.style_dashed)

isoTime = str.format_time(time, "yyyy-MM-dd'T'HH:mm:ss'Z'", "UTC")

f_msg(act) =>
    '{"secret":"' + secretKey + '","action":"' + act + '","symbol":"' + syminfo.ticker + '","tf":"' + timeframe.period + '","price":' + str.tostring(close, "0.########") + ',"vapi":' + str.tostring(vapi, "0.00") + ',"barTime":"' + isoTime + '"}'

// BUY: il bot decide lo scaglione (ladder in ordine) e blocca i doppioni sulla stessa candela.
// alert.freq_once_per_bar = scatta al primo tick che tocca il livello, candela ancora aperta.
if sendBuys and not na(vapi) and vapi <= lvl1
    alert(f_msg("BUY"), alert.freq_once_per_bar)

// Uscite: solo a candela confermata.
if sendClose and not na(vapi)
    alert(f_msg("BAR_CLOSE"), alert.freq_once_per_bar_close)
`;
}

/**
 * Il codice Pine originale dell'utente ("VAPI LADDER 3H"), con il secret del bot già impostato.
 * Il payload BUY_LONG / CLOSE_LONG è supportato nativamente dal webhook.
 */
export function legacyStrategyScript(secret: string): string {
  const src = `//@version=5
// ============================================================================
// BULL LAB — "VAPI LADDER 3H" (Martingale ladder on LazyBear VAPI)
//  R1  max 3 buys, NO stop loss, hold while the ladder is full
//  R2  max 1 buy per 3H candle
//  R3  size ladder 1x / 1.5x / 2.5x on base size 500 USDT
//  R4  buy levels VAPI <= -25 / <= -32 / <= -40
//  R5  one buy per level rung (each rung fills once per cycle)
//  R6  exits: 3 buys -> 50% @ >= 0, 50% of remainder @ >= 15, close all @ >= 22
//              2 buys -> 50% @ >= 5, close rest @ >= 15
//              1 buy  -> 100% @ >= 12
// Volume Accumulation Percentage formula: LazyBear (TradingView public study)
// TRIGGER (hybrid):
//   BUY  -> INTRABAR: fires on the first tick that touches the rung, 3H candle still open. Max 1 per candle (R2).
//   SELL -> BAR CLOSE: evaluated only when the 3H candle is confirmed (barstate.isconfirmed).
// Alert dialog: condition = Any alert() function call. Do NOT filter by frequency:
// each alert() call already carries its own frequency (buy = once per bar, sell = once per bar close).
// ============================================================================
strategy("Bull Lab VAPI Ladder 3H [LazyBear]", shorttitle="BL_VAPI_LADDER", overlay=false,
     initial_capital=10000,
     default_qty_type=strategy.fixed,
     commission_type=strategy.commission.percent,
     commission_value=0.035,
     pyramiding=3,
     process_orders_on_close=false,
     calc_on_every_tick=true)

// ------------------------------- INPUT --------------------------------------
g1 = "1. VAPI (LazyBear)"
vapiLen = input.int(10, "Time Periods (length)", minval=1, group=g1)

g2 = "2. Buy ladder (Martingale)"
b1 = input.float(-25.0, "Rung 1 buy level", step=0.5, group=g2)
b2 = input.float(-32.0, "Rung 2 buy level", step=0.5, group=g2)
b3 = input.float(-40.0, "Rung 3 buy level", step=0.5, group=g2)
q1 = input.float(0.005429, "Rung 1 size (asset units)", step=0.001, group=g2)
q2 = input.float(0.008144, "Rung 2 size (asset units)", step=0.001, group=g2)
q3 = input.float(0.013573, "Rung 3 size (asset units)", step=0.001, group=g2)

g3 = "3. Sell plan (percent of open position)"
s3a = input.float(50, "3 buys · first target %", step=5, group=g3)
l3a = input.float(0, "3 buys · first target VAPI", step=1, group=g3)
s3b = input.float(50, "3 buys · second target %", step=5, group=g3)
l3b = input.float(15, "3 buys · second target VAPI", step=1, group=g3)
l3c = input.float(22, "3 buys · full close VAPI", step=1, group=g3)
s2a = input.float(50, "2 buys · first target %", step=5, group=g3)
l2a = input.float(5, "2 buys · first target VAPI", step=1, group=g3)
l2b = input.float(15, "2 buys · full close VAPI", step=1, group=g3)
l1a = input.float(12, "1 buy · full close VAPI", step=1, group=g3)

g4 = "4. Webhook Bull Lab"
secret = input.string("${secret}", "Webhook secret", group=g4)
sym = input.string("BTCUSDT", "Ticker (BTCUSDT / ETHUSDT)", group=g4)
sendAlert = input.bool(true, "Send JSON alert to Bull Lab", group=g4)

// ------------------------- VAPI (identical to LazyBear) ----------------------
rng = high - low
x = rng == 0 ? 0.0 : (2 * close - high - low) / rng
tva = math.sum(volume * x, vapiLen)
tv = math.sum(volume, vapiLen)
va = tv != 0 ? 100 * tva / tv : 0.0

// ------------------------------ LADDER STATE --------------------------------
var int rung = 0              // how many buys are filled in the current cycle
var int sells = 0             // how many sell targets already executed
var float lastBuyBar = na     // bar index of the last buy (R2: one buy per candle)
var float posPercent = 0.0

flat = strategy.position_size == 0
if flat and rung > 0
    rung := 0
    sells := 0

// R2 + R5 + R4: only the next unfilled rung, once per candle
canBuy = rung < 3 and sells == 0 and lastBuyBar != bar_index

buyNow = false
buyQty = 0.0
rungLabel = ""
if canBuy
    if rung == 0 and va <= b1
        buyNow := true
        buyQty := q1
        rungLabel := "1"
    else if rung == 1 and va <= b2
        buyNow := true
        buyQty := q2
        rungLabel := "2"
    else if rung == 2 and va <= b3
        buyNow := true
        buyQty := q3
        rungLabel := "3"
    // R5: if VAPI is below several rungs at once, only the lowest unfilled one fills

if buyNow
    strategy.entry("LONG", strategy.long, qty=buyQty, comment="BUY rung " + rungLabel)
    rung := rung + 1
    lastBuyBar := bar_index
    if sendAlert
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"BUY_LONG","size":' + str.tostring(buyQty) + ',"price":' + str.tostring(close) + ',"vapi":' + str.tostring(va, "#.##") + ',"rung":' + rungLabel + ',"buys":' + str.tostring(rung) + ',"strategy":"VAPI_LADDER_3H","phase":"intrabar"}', alert.freq_once_per_bar)

// -------------------------------- SELL PLAN ---------------------------------
// R6: the plan depends on how many rungs are filled
sell1 = false
sell1Pct = 0.0
sellLevel = 0.0
if rung == 3
    if sells == 0
        sell1 := va >= l3a
        sell1Pct := s3a
        sellLevel := l3a
    else if sells == 1
        sell1 := va >= l3b
        sell1Pct := s3b
        sellLevel := l3b
    else if sells == 2
        sell1 := va >= l3c
        sell1Pct := 100
        sellLevel := l3c
else if rung == 2
    if sells == 0
        sell1 := va >= l2a
        sell1Pct := s2a
        sellLevel := l2a
    else
        sell1 := va >= l2b
        sell1Pct := 100
        sellLevel := l2b
else if rung == 1
    sell1 := va >= l1a
    sell1Pct := 100
    sellLevel := l1a

// SELL: only when the 3H candle is confirmed (barstate.isconfirmed), never intrabar
if strategy.position_size > 0 and sell1 and barstate.isconfirmed
    strategy.close("LONG", qty_percent=sell1Pct, comment="SELL " + str.tostring(sell1Pct) + "%")
    sells := sells + 1
    if sell1Pct >= 100
        sells := 0
        rung := 0
    if sendAlert
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"CLOSE_LONG","size":' + str.tostring(strategy.position_size * sell1Pct / 100) + ',"price":' + str.tostring(close) + ',"vapi":' + str.tostring(va, "#.##") + ',"closePct":' + str.tostring(sell1Pct) + ',"rung":' + str.tostring(rung) + ',"targetLevel":' + str.tostring(sellLevel) + ',"strategy":"VAPI_LADDER_3H","phase":"close"}', alert.freq_once_per_bar_close)

// ------------------------------ RENDERING -----------------------------------
hline(0, "Zero line", color=color.new(color.gray, 0))
hline(b1, "Rung 1", color=color.new(color.lime, 35), linestyle=hline.style_dashed)
hline(b2, "Rung 2", color=color.new(color.green, 45), linestyle=hline.style_dashed)
hline(b3, "Rung 3", color=color.new(color.teal, 55), linestyle=hline.style_dashed)
hline(l1a, "Exit 1 buy", color=color.new(color.orange, 55), linestyle=hline.style_dotted)
hline(l3c, "Exit full close", color=color.new(color.red, 45), linestyle=hline.style_dotted)

us = va < 0 ? 0.0 : (va == 0 ? va[1] : va)
ls = va > 0 ? 0.0 : (va == 0 ? va[1] : va)
plot(us, "Positive fill", color=color.new(color.lime, 55), style=plot.style_columns)
plot(ls, "Negative fill", color=color.new(color.red, 55), style=plot.style_columns)
plot(va, "VAPI oscillator", color=color.gray, linewidth=2)
plotshape(buyNow, "BUY", style=shape.triangleup, location=location.bottom, color=color.lime, size=size.small)
plotshape(sell1, "SELL", style=shape.triangledown, location=location.top, color=color.orange, size=size.small)
bgcolor(strategy.position_size > 0 ? color.new(color.blue, 94) : na, title="In market")`;
  return src;
}

export const TEST_MESSAGES = {
  ping: (secret: string) => `{"secret":"${secret}","action":"PING"}`,
  buyLegacy: (secret: string) =>
    `{"secret":"${secret}","ticker":"BTCUSDT","action":"BUY_LONG","size":0.005429,"price":95000,"vapi":-26.4,"rung":"1","buys":1,"strategy":"VAPI_LADDER_3H","phase":"intrabar"}`,
  closeLegacy: (secret: string) =>
    `{"secret":"${secret}","ticker":"BTCUSDT","action":"CLOSE_LONG","size":0.0027,"price":120000,"vapi":15.4,"closePct":50,"rung":3,"targetLevel":15,"strategy":"VAPI_LADDER_3H","phase":"close"}`,
};

/** Payload accettati dal webhook (documentazione). */
export const PAYLOAD_FIELDS: [string, string][] = [
  ["action", "Obbligatorio. BUY / BUY_LONG / LONG oppure SELL / CLOSE_LONG / BAR_CLOSE. Accettato anche PING."],
  ["secret", "Obbligatorio per TradingView (o ?secret=… nell'URL)."],
  ["ticker / symbol", "BTCUSDT, BTCUSDT.P, BINANCE:BTCUSD, ETH-PERP… il bot normalizza a BTC/ETH."],
  ["price / close", "Prezzo di esecuzione (in paper è il fill simulato)."],
  ["vapi", "Valore dell'indicatore. Serve per verificare i livelli BUY e per decidere le uscite."],
  ["rung / tier", "Facoltativo: 1|2|3. Se presente deve corrispondere allo scaglione atteso dal ladder."],
  ["tf / interval", "Facoltativo: se presente deve essere 180 (3H)."],
  ["barTime / time", "Facoltativo: ISO o epoch (s/ms) della candela. Serve all'anti-duplicato R2."],
  ["closePct, size, buys, phase, strategy", "Accettati dal vecchio script e registrati nel log; il bot usa comunque la propria size e il proprio stato."],
];
