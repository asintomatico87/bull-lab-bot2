// Bull Lab — Pine Script v5 generator for the VAPI LADDER 3H strategy
import type { LadderConfig, LadderTarget } from "./vapi-ladder";

export type LadderPineOptions = {
  config: LadderConfig;
  secret: string;
  ticker: string;
  qtyPerRung: number[];
};

function fmt(value: number) {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

export function generateLadderPineScript({
  config,
  secret,
  ticker,
  qtyPerRung,
}: LadderPineOptions): string {
  // HYBRID TRIGGER: buys fire on the first tick that touches the rung (intrabar),
  // sells are only evaluated when the 3H candle is confirmed (bar close).
  const buyAlertFreq = "alert.freq_once_per_bar";
  const sellAlertFreq = "alert.freq_once_per_bar_close";
  const [l1, l2, l3] = config.levels;
  const [m1, m2, m3] = config.multipliers;
  const plan1 = config.plans["1"] ?? [];
  const plan2 = config.plans["2"] ?? [];
  const plan3 = config.plans["3"] ?? [];
  const p = (targets: LadderTarget[]) => targets.map((t) => `${t.level}:${t.fractionPct}`).join(",");
  const [q1, q2, q3] = qtyPerRung;

  return `//@version=5
// ============================================================================
// BULL LAB — "VAPI LADDER 3H" (Martingale ladder on LazyBear VAPI)
//  R1  max ${config.maxBuys} buys, NO stop loss, hold while the ladder is full
//  R2  max 1 buy per 3H candle
//  R3  size ladder ${m1}x / ${m2}x / ${m3}x on base size ${config.baseSizeUsdt} USDT
//  R4  buy levels VAPI <= ${l1} / <= ${l2} / <= ${l3}
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
     initial_capital=${config.capital},
     default_qty_type=strategy.fixed,
     commission_type=strategy.commission.percent,
     commission_value=${config.feePct},
     pyramiding=${config.maxBuys},
     process_orders_on_close=false,
     calc_on_every_tick=true)

// ------------------------------- INPUT --------------------------------------
g1 = "1. VAPI (LazyBear)"
vapiLen = input.int(${config.vapiLength}, "Time Periods (length)", minval=1, group=g1)

g2 = "2. Buy ladder (Martingale)"
b1 = input.float(${fmt(l1)}, "Rung 1 buy level", step=0.5, group=g2)
b2 = input.float(${fmt(l2)}, "Rung 2 buy level", step=0.5, group=g2)
b3 = input.float(${fmt(l3)}, "Rung 3 buy level", step=0.5, group=g2)
q1 = input.float(${q1}, "Rung 1 size (asset units)", step=0.001, group=g2)
q2 = input.float(${q2}, "Rung 2 size (asset units)", step=0.001, group=g2)
q3 = input.float(${q3}, "Rung 3 size (asset units)", step=0.001, group=g2)

g3 = "3. Sell plan (percent of open position)"
s3a = input.float(${plan3[0]?.fractionPct ?? 50}, "3 buys · first target %", step=5, group=g3)
l3a = input.float(${plan3[0]?.level ?? 0}, "3 buys · first target VAPI", step=1, group=g3)
s3b = input.float(${plan3[1]?.fractionPct ?? 50}, "3 buys · second target %", step=5, group=g3)
l3b = input.float(${plan3[1]?.level ?? 15}, "3 buys · second target VAPI", step=1, group=g3)
l3c = input.float(${plan3[2]?.level ?? 22}, "3 buys · full close VAPI", step=1, group=g3)
s2a = input.float(${plan2[0]?.fractionPct ?? 50}, "2 buys · first target %", step=5, group=g3)
l2a = input.float(${plan2[0]?.level ?? 5}, "2 buys · first target VAPI", step=1, group=g3)
l2b = input.float(${plan2[1]?.level ?? 15}, "2 buys · full close VAPI", step=1, group=g3)
l1a = input.float(${plan1[0]?.level ?? 12}, "1 buy · full close VAPI", step=1, group=g3)

g4 = "4. Webhook Bull Lab"
secret = input.string("${secret}", "Webhook secret", group=g4)
sym = input.string("${ticker}", "Ticker (BTCUSDT / ETHUSDT)", group=g4)
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
canBuy = rung < ${config.maxBuys} and sells == 0 and lastBuyBar != bar_index

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
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"BUY_LONG","size":' + str.tostring(buyQty) + ',"price":' + str.tostring(close) + ',"vapi":' + str.tostring(va, "#.##") + ',"rung":' + rungLabel + ',"buys":' + str.tostring(rung) + ',"strategy":"VAPI_LADDER_3H","phase":"intrabar"}', ${buyAlertFreq})

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
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"CLOSE_LONG","size":' + str.tostring(strategy.position_size * sell1Pct / 100) + ',"price":' + str.tostring(close) + ',"vapi":' + str.tostring(va, "#.##") + ',"closePct":' + str.tostring(sell1Pct) + ',"rung":' + str.tostring(rung) + ',"targetLevel":' + str.tostring(sellLevel) + ',"strategy":"VAPI_LADDER_3H","phase":"close"}', ${sellAlertFreq})

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
bgcolor(strategy.position_size > 0 ? color.new(color.blue, 94) : na, title="In market")
`;
}
