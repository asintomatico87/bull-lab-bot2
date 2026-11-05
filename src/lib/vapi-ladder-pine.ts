// Bull Lab — Pine Script v5 generator for the VAPI LADDER 3H strategy
import type { LadderConfig } from "./vapi-ladder";

export type LadderPineOptions = {
  config: LadderConfig;
  secret: string;
  ticker: string;
};

function fmt(value: number) {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

export function generateLadderPineScript({ config, secret, ticker }: LadderPineOptions): string {
  const [l1, l2, l3] = config.levels;
  const [m1, m2, m3] = config.multipliers;
  const plan1 = config.plans["1"] ?? [];
  const plan2 = config.plans["2"] ?? [];
  const plan3 = config.plans["3"] ?? [];

  return `//@version=5
// BULL LAB — VAPI LADDER 3H. Paper webhook until an exchange connector is implemented.
// BUY intrabar, SELL only on confirmed 3H close. Alert dialog: Any alert() function call.
strategy("Bull Lab VAPI Ladder 3H [LazyBear]", shorttitle="BL_VAPI_LADDER", overlay=false,
     initial_capital=${config.capital},
     default_qty_type=strategy.fixed,
     commission_type=strategy.commission.percent,
     commission_value=${config.feePct},
     pyramiding=${config.maxBuys},
     process_orders_on_close=false,
     calc_on_every_tick=true)

if barstate.isfirst and timeframe.in_seconds() != 10800
    runtime.error("Bull Lab VAPI Ladder deve essere applicata a un grafico 3H.")

// 1. VAPI (LazyBear)
g1 = "1. VAPI (LazyBear)"
vapiLen = input.int(${config.vapiLength}, "Time Periods (length)", minval=1, group=g1)

// 2. Buy ladder: notional is in USDT and quantity is recomputed from the live close.
g2 = "2. Buy ladder"
baseSizeUsdt = input.float(${fmt(config.baseSizeUsdt)}, "Base size (USDT)", minval=10, group=g2)
b1 = input.float(${fmt(l1)}, "Rung 1 VAPI", step=0.5, group=g2)
b2 = input.float(${fmt(l2)}, "Rung 2 VAPI", step=0.5, group=g2)
b3 = input.float(${fmt(l3)}, "Rung 3 VAPI", step=0.5, group=g2)

// 3. Sell plan
g3 = "3. Sell plan"
s3a = input.float(${plan3[0]?.fractionPct ?? 50}, "3 buys · first target %", step=5, group=g3)
l3a = input.float(${plan3[0]?.level ?? 0}, "3 buys · first target VAPI", step=1, group=g3)
s3b = input.float(${plan3[1]?.fractionPct ?? 50}, "3 buys · second target %", step=5, group=g3)
l3b = input.float(${plan3[1]?.level ?? 15}, "3 buys · second target VAPI", step=1, group=g3)
l3c = input.float(${plan3[2]?.level ?? 22}, "3 buys · full close VAPI", step=1, group=g3)
s2a = input.float(${plan2[0]?.fractionPct ?? 50}, "2 buys · first target %", step=5, group=g3)
l2a = input.float(${plan2[0]?.level ?? 5}, "2 buys · first target VAPI", step=1, group=g3)
l2b = input.float(${plan2[1]?.level ?? 15}, "2 buys · full close VAPI", step=1, group=g3)
l1a = input.float(${plan1[0]?.level ?? 12}, "1 buy · full close VAPI", step=1, group=g3)

// 4. Webhook
g4 = "4. Webhook Bull Lab"
secret = input.string("${secret}", "Webhook secret", group=g4)
sym = input.string("${ticker}", "Ticker", group=g4)
sendAlert = input.bool(true, "Send paper alert to Bull Lab", group=g4)

// LazyBear VAPI formula
rng = high - low
x = rng == 0 ? 0.0 : (2 * close - high - low) / rng
tva = math.sum(volume * x, vapiLen)
tv = math.sum(volume, vapiLen)
va = tv != 0 ? 100 * tva / tv : 0.0

// Persistent ladder state
var int rung = 0
var int sells = 0
var int lastBuyBar = na
flat = strategy.position_size == 0
if flat and rung > 0
    rung := 0
    sells := 0

canBuy = rung < ${config.maxBuys} and sells == 0 and (na(lastBuyBar) or lastBuyBar != bar_index)
buyNow = false
buyQty = 0.0
rungLabel = ""
if canBuy
    if rung == 0 and va <= b1
        buyNow := true
        buyQty := (baseSizeUsdt * ${fmt(m1)}) / close
        rungLabel := "1"
    else if rung == 1 and va <= b2
        buyNow := true
        buyQty := (baseSizeUsdt * ${fmt(m2)}) / close
        rungLabel := "2"
    else if rung == 2 and va <= b3
        buyNow := true
        buyQty := (baseSizeUsdt * ${fmt(m3)}) / close
        rungLabel := "3"

if buyNow and buyQty > 0
    strategy.entry("LONG", strategy.long, qty=buyQty, comment="BUY rung " + rungLabel)
    rung := rung + 1
    lastBuyBar := bar_index
    if sendAlert
        buyEventId = sym + ":" + str.tostring(time) + ":BUY:" + rungLabel
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"BUY_LONG","size":' + str.tostring(buyQty, "#.########") + ',"price":' + str.tostring(close, "#.########") + ',"vapi":' + str.tostring(va, "#.##") + ',"rung":' + rungLabel + ',"buys":' + str.tostring(rung) + ',"barTimestamp":' + str.tostring(time) + ',"eventId":"' + buyEventId + '","strategy":"VAPI_LADDER_3H","timeframe":"3H","phase":"intrabar"}', alert.freq_once_per_bar)

// Sell plan, only evaluated when the 3H bar is confirmed.
sellNow = false
sellPct = 0.0
sellLevel = 0.0
if rung == 3
    if sells == 0
        sellNow := va >= l3a
        sellPct := s3a
        sellLevel := l3a
    else if sells == 1
        sellNow := va >= l3b
        sellPct := s3b
        sellLevel := l3b
    else if sells == 2
        sellNow := va >= l3c
        sellPct := 100
        sellLevel := l3c
else if rung == 2
    if sells == 0
        sellNow := va >= l2a
        sellPct := s2a
        sellLevel := l2a
    else
        sellNow := va >= l2b
        sellPct := 100
        sellLevel := l2b
else if rung == 1
    sellNow := va >= l1a
    sellPct := 100
    sellLevel := l1a

if strategy.position_size > 0 and sellNow and barstate.isconfirmed
    sellRung = rung
    sellNumber = sells + 1
    closeQty = strategy.position_size * sellPct / 100
    strategy.close("LONG", qty_percent=sellPct, comment="SELL " + str.tostring(sellPct) + "%")
    sells := sells + 1
    if sellPct >= 100
        sells := 0
        rung := 0
    if sendAlert
        sellEventId = sym + ":" + str.tostring(time) + ":SELL:" + str.tostring(sellRung) + ":" + str.tostring(sellNumber)
        alert('{"secret":"' + secret + '","ticker":"' + sym + '","action":"CLOSE_LONG","size":' + str.tostring(closeQty, "#.########") + ',"price":' + str.tostring(close, "#.########") + ',"vapi":' + str.tostring(va, "#.##") + ',"closePct":' + str.tostring(sellPct) + ',"rung":' + str.tostring(sellRung) + ',"targetLevel":' + str.tostring(sellLevel) + ',"barTimestamp":' + str.tostring(time) + ',"eventId":"' + sellEventId + '","strategy":"VAPI_LADDER_3H","timeframe":"3H","phase":"close"}', alert.freq_once_per_bar_close)

hline(0, "Zero line", color=color.new(color.gray, 0))
hline(b1, "Rung 1", color=color.new(color.lime, 35), linestyle=hline.style_dashed)
hline(b2, "Rung 2", color=color.new(color.green, 45), linestyle=hline.style_dashed)
hline(b3, "Rung 3", color=color.new(color.teal, 55), linestyle=hline.style_dashed)
hline(l1a, "Exit 1 buy", color=color.new(color.orange, 55), linestyle=hline.style_dotted)
hline(l3c, "Exit full close", color=color.new(color.red, 45), linestyle=hline.style_dotted)
plot(va, "VAPI oscillator", color=color.gray, linewidth=2)
plotshape(buyNow, "BUY", style=shape.triangleup, location=location.bottom, color=color.lime, size=size.small)
plotshape(sellNow, "SELL", style=shape.triangledown, location=location.top, color=color.orange, size=size.small)
bgcolor(strategy.position_size > 0 ? color.new(color.blue, 94) : na, title="In market")
`;
}
