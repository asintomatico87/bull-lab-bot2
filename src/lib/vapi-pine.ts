// Bull Lab — Pine Script v5 generator for the VAPI (LazyBear) execution matrix
export type VapiPineOptions = {
  secret: string;
  ticker: string;
  length: number;
  longEntry: number;
  longExit: number;
  shortEntry: number;
  shortExit: number;
  confirmation: number;
  stopLossPct: number;
  takeProfitPct: number;
  trailingStopPct: number;
  qty: number;
  capital: number;
  leverage: number;
};

export function generateVapiPineScript(options: VapiPineOptions): string {
  const {
    secret,
    ticker,
    length,
    longEntry,
    longExit,
    shortEntry,
    shortExit,
    confirmation,
    stopLossPct,
    takeProfitPct,
    trailingStopPct,
    qty,
    capital,
    leverage,
  } = options;

  return `//@version=5
// ============================================================================
// BULL LAB TRADING SYSTEM — "VAPI 3H PRESSURE MATRIX"
// Base indicator: "Volume Accumulation Percentage Indicator [LazyBear]"
//   Original study by LazyBear — formula VAPI = 100 * sum(volume*x,length) / sum(volume,length)
//   x = (2*close - high - low) / (high - low)
// Strategy wrapper, level engine & webhook bridge: Bull Lab / Asintomatico
// Website: https://www.bulllab.one/it
// ============================================================================
strategy("Bull Lab VAPI 3H [LazyBear]", shorttitle="BL_VAPI_3H", overlay=false,
     initial_capital=${capital},
     default_qty_type=strategy.fixed,
     default_qty_value=${qty},
     commission_type=strategy.commission.percent,
     commission_value=0.035,
     process_orders_on_close=true,
     calc_on_every_tick=false)

// ---------------------------- INPUT OPERATIVI -------------------------------
grpVapi = "1. VAPI (LazyBear)"
length      = input.int(${length}, "Time Periods (length)", minval=1, maxval=100, group=grpVapi)
longEntry   = input.float(${longEntry}, "LONG entry level", step=0.5, group=grpVapi)
longExit    = input.float(${longExit}, "LONG exit level", step=0.5, group=grpVapi)
shortEntry  = input.float(${shortEntry}, "SHORT entry level", step=0.5, group=grpVapi)
shortExit   = input.float(${shortExit}, "SHORT exit level", step=0.5, group=grpVapi)
confirmBars = input.int(${confirmation}, "Barre di conferma sul livello", minval=1, maxval=5, group=grpVapi)
useExtreme  = input.bool(true, "Filtro livello estremo (evita late entries)", group=grpVapi)
extremeLvl  = input.float(45.0, "Livello estremo", step=1.0, group=grpVapi)

grpRisk = "2. Risk Management"
slPct     = input.float(${stopLossPct}, "Stop Loss %", step=0.1, group=grpRisk) / 100
tpPct     = input.float(${takeProfitPct}, "Take Profit %", step=0.1, group=grpRisk) / 100
trailPct  = input.float(${trailingStopPct}, "Trailing Stop %", step=0.1, group=grpRisk) / 100
lev       = input.float(${leverage}, "Leva finanziaria", step=1.0, group=grpRisk)
revOnOpp  = input.bool(true, "Chiudi ed inverte su segnale opposto", group=grpRisk)

grpAlert = "3. Webhook Bull Lab"
secret    = input.string("${secret}", "Webhook secret del bot", group=grpAlert)
sym       = input.string("${ticker}", "Ticker (BTCUSDT / ETHUSDT)", group=grpAlert)
orderQty  = input.float(${qty}, "Size ordine (unità asset)", step=0.001, group=grpAlert)
sendAlert = input.bool(true, "Invia alert JSON al webhook Bull Lab", group=grpAlert)

// ------------------ CALCOLO INDICATORE (identico a LazyBear) -----------------
rng = high - low
x   = rng == 0 ? 0.0 : (2 * close - high - low) / rng          // money flow multiplier
tva = math.sum(volume * x, length)
tv  = math.sum(volume, length)
va  = tv != 0 ? 100 * tva / tv : 0.0                            // VAPI oscillator

// Una barra è valida per il long solo se NESSUNA delle ultime confirmBars
// barre è scesa sotto la soglia (conferma persistente del livello).
var bool longConfirm  = false
var bool shortConfirm = false
longConfirm  := true
shortConfirm := true
for i = 0 to confirmBars - 1
    longConfirm  := longConfirm  and va[i] >= longEntry
    shortConfirm := shortConfirm and va[i] <= shortEntry

longCross  = ta.crossover(va, longEntry)
shortCross = ta.crossunder(va, shortEntry)

longExitCross  = ta.crossunder(va, longExit)
shortExitCross = ta.crossover(va, shortExit)

// Evita di entrare in accumulazione/distribuzione già estrema (late entry)
filterLong  = not useExtreme or va < extremeLvl
filterShort = not useExtreme or va > -extremeLvl

longTrigger  = longCross  and longConfirm  and filterLong
shortTrigger = shortCross and shortConfirm and filterShort

// ------------------------------- ESECUZIONE --------------------------------
if longTrigger and strategy.position_size <= 0
    if revOnOpp and strategy.position_size < 0
        strategy.close("SHORT")
    strategy.entry("LONG", strategy.long, qty=orderQty)
    if sendAlert
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"BUY_LONG","size":' + str.tostring(orderQty) + ',"price":' + str.tostring(close) + ',"vapi":' + str.tostring(va, "#.##") + ',"strategy":"VAPI_LB_3H","notes":"VAPI 3H long level cross"}', alert.freq_once_per_bar_close)

if shortTrigger and strategy.position_size >= 0
    if revOnOpp and strategy.position_size > 0
        strategy.close("LONG")
    strategy.entry("SHORT", strategy.short, qty=orderQty)
    if sendAlert
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"SELL_SHORT","size":' + str.tostring(orderQty) + ',"price":' + str.tostring(close) + ',"vapi":' + str.tostring(va, "#.##") + ',"strategy":"VAPI_LB_3H","notes":"VAPI 3H short level cross"}', alert.freq_once_per_bar_close)

if longExitCross and strategy.position_size > 0
    strategy.close("LONG", comment="VAPI exit")
    if sendAlert
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"CLOSE_LONG","size":' + str.tostring(orderQty) + ',"price":' + str.tostring(close) + ',"vapi":' + str.tostring(va, "#.##") + ',"strategy":"VAPI_LB_3H","notes":"VAPI exit level"}', alert.freq_once_per_bar_close)

if shortExitCross and strategy.position_size < 0
    strategy.close("SHORT", comment="VAPI exit")
    if sendAlert
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"CLOSE_SHORT","size":' + str.tostring(orderQty) + ',"price":' + str.tostring(close) + ',"vapi":' + str.tostring(va, "#.##") + ',"strategy":"VAPI_LB_3H","notes":"VAPI exit level"}', alert.freq_once_per_bar_close)

// Protezioni intrabar: SL / TP / trailing sul prezzo medio di carico
if strategy.position_size != 0
    avg = strategy.position_avg_price
    isLong = strategy.position_size > 0
    slPrice = isLong ? avg * (1 - slPct) : avg * (1 + slPct)
    tpPrice = isLong ? avg * (1 + tpPct) : avg * (1 - tpPct)
    strategy.exit("SL/TP", "LONG", stop=slPrice, limit=tpPrice, trail_price=avg, trail_offset=avg * trailPct / syminfo.mintick)
    strategy.exit("SL/TP", "SHORT", stop=slPrice, limit=tpPrice, trail_price=avg, trail_offset=avg * trailPct / syminfo.mintick)

// -------------------- RENDERING GRAFICO (LazyBear style) -------------------
zeroLine = hline(0, "Zero line", color=color.new(color.gray, 0))
hline(longEntry, "LONG entry", color=color.new(color.lime, 40), linestyle=hline.style_dashed)
hline(shortEntry, "SHORT entry", color=color.new(color.red, 40), linestyle=hline.style_dashed)
hline(longExit, "LONG exit", color=color.new(color.teal, 70), linestyle=hline.style_dotted)
hline(shortExit, "SHORT exit", color=color.new(color.maroon, 70), linestyle=hline.style_dotted)

us = va < 0 ? 0.0 : (va == 0 ? va[1] : va)
ls = va > 0 ? 0.0 : (va == 0 ? va[1] : va)
plot(us, "Positive fill", color=color.new(color.lime, 55), style=plot.style_columns)
plot(ls, "Negative fill", color=color.new(color.red, 55), style=plot.style_columns)
plot(va, "VAPI oscillator", color=color.gray, linewidth=2)

bgcolor(va >= longEntry ? color.new(color.lime, 92) : va <= shortEntry ? color.new(color.red, 92) : na, title="Level regime")
plotshape(longTrigger, title="LONG entry", style=shape.triangleup, location=location.bottom, color=color.lime, size=size.small, text="LONG")
plotshape(shortTrigger, title="SHORT entry", style=shape.triangledown, location=location.top, color=color.red, size=size.small, text="SHORT")
`;
}
