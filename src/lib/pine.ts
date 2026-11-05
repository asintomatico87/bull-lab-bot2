export const PINE = `//@version=5
// ============================================================================
// BULL LAB — "VAPI LADDER 3H" (Martingale ladder on LazyBear VAPI)
//  R1  max 3 buys, NO stop loss, hold while the ladder is full
//  R2  max 1 buy per 3H candle
//  R3  size ladder 1x / 1.5x / 2.5x on base size 500 USDT (decide il server)
//  R4  buy levels VAPI <= -25 / <= -32 / <= -40
//  R5  one buy per level rung (each rung fills once per cycle)
//  R6  exits: 3 buys -> 50% @ >= 0, 50% of remainder @ >= 15, close all @ >= 22
//              2 buys -> 50% @ >= 5, close rest @ >= 15
//              1 buy  -> 100% @ >= 12
// TRIGGER (hybrid):
//   BUY  -> INTRABAR: primo tick in cui VAPI tocca uno scaglione (candela 3H aperta)
//   SELL -> BAR CLOSE: solo quando la candela 3H è confermata
// Le DECISIONI (quale scalino, quanta quantità, quando vendere) le fa il server
// Bull Lab: questo script misura il VAPI e invia gli eventi "touch" e "close".
// Alert: condizione = "Any alert() function call". NON scrivere il messaggio:
// è generato dallo script.
// ============================================================================
indicator("Bull Lab VAPI Ladder 3H — Webhook", shorttitle="BL_VAPI_LADDER", overlay=false)

// ------------------------------- INPUT --------------------------------------
g1 = "1. VAPI (LazyBear)"
vapiLen = input.int(10, "Time Periods (length)", minval=1, group=g1)

g2 = "2. Buy ladder (Martingale)"
b1 = input.float(-25.0, "Rung 1 buy level", step=0.5, group=g2)
b2 = input.float(-32.0, "Rung 2 buy level", step=0.5, group=g2)
b3 = input.float(-40.0, "Rung 3 buy level", step=0.5, group=g2)

g4 = "4. Webhook Bull Lab"
secret = input.string("bulllab", "Webhook secret", group=g4)
ticker = input.string("BTCUSDT", "Ticker (BTCUSDT / ETHUSDT)", group=g4)
sendAlert = input.bool(true, "Send JSON alert to Bull Lab", group=g4)

// ------------------------- VAPI (identical to LazyBear) ----------------------
rng = high - low
x = rng == 0 ? 0.0 : (2 * close - high - low) / rng
tva = math.sum(volume * x, vapiLen)
tv  = math.sum(volume, vapiLen)
va = tv != 0 ? 100 * tva / tv : 0.0

// ------------------------------ WEBHOOK -------------------------------------
json(ev) => '{"secret":"' + secret + '","ticker":"' + ticker + '","event":"' + ev + '","vapi":' + str.tostring(va, "#.####") + ',"price":' + str.tostring(close) + ',"bar_time":"' + str.tostring(time) + '"}'

// R2 + R4: 1 touch per candela; varip persiste tra i tick intrabar.
// Quando VAPI <= rung1 il server decide lo scalino in base alla posizione aperta.
varip bool touched = false
if barstate.isnew
    touched := false
if barstate.isrealtime and sendAlert and not touched and va <= b1
    touched := true
    alert(json("touch"), alert.freq_all)

// R6: il piano di vendita è nel server, qui mandiamo solo la chiusura candela
if barstate.isconfirmed and sendAlert
    alert(json("close"), alert.freq_once_per_bar_close)

// ------------------------------ RENDERING -----------------------------------
hline(0, "Zero line", color=color.new(color.gray, 0))
hline(b1, "Rung 1", color=color.new(color.lime, 35), linestyle=hline.style_dashed)
hline(b2, "Rung 2", color=color.new(color.green, 45), linestyle=hline.style_dashed)
hline(b3, "Rung 3", color=color.new(color.teal, 55), linestyle=hline.style_dashed)
hline(12, "Exit 1 buy", color=color.new(color.orange, 55), linestyle=hline.style_dotted)
hline(22, "Exit full close", color=color.new(color.red, 45), linestyle=hline.style_dotted)

us = va < 0 ? 0.0 : (va == 0 ? va[1] : va)
ls = va > 0 ? 0.0 : (va == 0 ? va[1] : va)
plot(us, "Positive fill", color=color.new(color.lime, 55), style=plot.style_columns)
plot(ls, "Negative fill", color=color.new(color.red, 55), style=plot.style_columns)
plot(va, "VAPI oscillator", color=color.gray, linewidth=2)
`;
