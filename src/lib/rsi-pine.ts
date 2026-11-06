export const RSI_PINE = `//@version=5
// ============================================================================
// BULL LAB — RSI 45m LONG/SHORT ladder
//  Ingressi LONG/SHORT: TOUCH intrabar ai livelli RSI
//  Uscite: solo a chiusura candela 45m (RSI di chiusura)
//  1 ingresso per candela + 1 barra vuota in mezzo
// ============================================================================
indicator("Bull Lab RSI 45m — Webhook", shorttitle="BL_RSI_45", overlay=false)

len = input.int(14, "RSI length", minval=2)
secret = input.string("bulllab", "Webhook secret")
ticker = input.string("BTCUSDT", "Ticker (BTCUSDT / ETHUSDT)")
sendAlert = input.bool(true, "Send JSON to Bull Lab")

rsi = ta.rsi(close, len)
plot(rsi, "RSI", color=color.gray, linewidth=2)
hline(50, "Mid", color=color.new(color.gray, 0))
hline(23, "L1", color=color.new(color.green, 30), linestyle=hline.style_dashed)
hline(18, "L2", color=color.new(color.green, 20), linestyle=hline.style_dashed)
hline(13, "L3", color=color.new(color.lime, 10), linestyle=hline.style_dashed)
hline(77, "S1", color=color.new(color.orange, 30), linestyle=hline.style_dashed)
hline(82, "S2", color=color.new(color.red, 20), linestyle=hline.style_dashed)
hline(87, "S3", color=color.new(color.maroon, 10), linestyle=hline.style_dashed)
hline(70, "Long TP2", color=color.new(color.teal, 50), linestyle=hline.style_dotted)
hline(38, "Short TP1", color=color.new(color.orange, 50), linestyle=hline.style_dotted)
hline(30, "Short TP2", color=color.new(color.teal, 50), linestyle=hline.style_dotted)

json(ev) => '{"secret":"' + secret + '","ticker":"' + ticker + '","event":"' + ev + '","rsi":' + str.tostring(rsi, "#.####") + ',"price":' + str.tostring(close) + ',"bar_time":"' + str.tostring(time) + '"}'

varip bool touched = false
if barstate.isnew
    touched := false
if barstate.isrealtime and sendAlert and not touched and (rsi <= 23 or rsi >= 77)
    touched := true
    alert(json("touch"), alert.freq_all)

if barstate.isconfirmed and sendAlert
    alert(json("close"), alert.freq_once_per_bar_close)
`;
