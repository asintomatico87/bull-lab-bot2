import { NextResponse } from "next/server";
import { db } from "@/db";
import { tradingBots, tradeOrders, webhookLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  computeVapiSeries,
  generateThreeHourCandles,
  type VapiCandle,
} from "@/lib/vapi";

async function fetchRealThreeHourCandles(pair: string): Promise<{
  candles: VapiCandle[];
  source: "BINANCE_LIVE_3H" | "BULL_LAB_SYNTHETIC_3H";
}> {
  const symbol = pair.toUpperCase().includes("ETH") ? "ETHUSDT" : "BTCUSDT";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=3h&limit=35`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);

    if (res.ok) {
      const raw = await res.json();
      if (Array.isArray(raw) && raw.length >= 15) {
        const candles: VapiCandle[] = raw.map((row: any[]) => {
          const ts = Number(row[0]);
          const d = new Date(ts);
          const time = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:00`;
          return {
            timestamp: ts,
            time,
            open: parseFloat(row[1]),
            high: parseFloat(row[2]),
            low: parseFloat(row[3]),
            close: parseFloat(row[4]),
            volume: Math.round(parseFloat(row[5])),
          };
        });
        return { candles, source: "BINANCE_LIVE_3H" };
      }
    }
  } catch {
    // Fallback to deterministic 3H engine if external network is restricted
  }

  return {
    candles: generateThreeHourCandles(pair, 40),
    source: "BULL_LAB_SYNTHETIC_3H",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      botId,
      overrideVapi = null,
      resetCandleLock = false,
      resetAllLadder = false,
    } = body ?? {};

    // Find the VAPI Ladder bot (or specified botId)
    const allBots = await db.select().from(tradingBots);
    const bot =
      (botId ? allBots.find((b) => b.id === Number(botId)) : null) ??
      allBots.find((b) => b.strategyKey === "vapi_ladder") ??
      allBots[0];

    if (!bot) {
      return NextResponse.json({ error: "Nessun bot trovato" }, { status: 404 });
    }

    const botConfig = { ...((bot.config ?? {}) as Record<string, any>) };
    const levels: number[] = Array.isArray(botConfig.levels)
      ? botConfig.levels.map(Number)
      : [-25, -32, -40];
    const multipliers: number[] = Array.isArray(botConfig.multipliers)
      ? botConfig.multipliers.map(Number)
      : [1, 1.5, 2.5];
    const baseSizeUsdt = Number(botConfig.baseSizeUsdt ?? bot.orderSizeUsdt ?? 500);
    const vapiLength = Number(botConfig.vapiLength ?? 10);
    const plans: Record<string, { level: number; fractionPct: number }[]> =
      botConfig.plans ?? {
        "1": [{ level: 12, fractionPct: 100 }],
        "2": [
          { level: 5, fractionPct: 50 },
          { level: 15, fractionPct: 100 },
        ],
        "3": [
          { level: 0, fractionPct: 50 },
          { level: 15, fractionPct: 50 },
          { level: 22, fractionPct: 100 },
        ],
      };

    let ladder = {
      buys: 0,
      sells: 0,
      lastBuyCandle: null as number | null,
      lastSellEvalCandle: null as number | null,
      investedUsdt: 0,
      avgEntry: 0,
      positionQty: 0,
      ...(botConfig.ladderState ?? {}),
    };

    if (resetAllLadder) {
      ladder = {
        buys: 0,
        sells: 0,
        lastBuyCandle: null,
        lastSellEvalCandle: null,
        investedUsdt: 0,
        avgEntry: 0,
        positionQty: 0,
      };
      botConfig.ladderState = ladder;
      await db
        .update(tradingBots)
        .set({ config: botConfig, lastRunAt: new Date() })
        .where(eq(tradingBots.id, bot.id));

      return NextResponse.json({
        success: true,
        decision: "RESET_LADDER",
        message: "Scala Martingala azzerata: 0/3 buy a mercato, pronta per un nuovo ciclo.",
        ladderState: ladder,
      });
    }

    // Fetch 3H candles and compute VAPI WITHOUT TradingView.
    // HYBRID TRIGGER:
    //   BUY  -> intrabar: uses the forming 3H candle (live high/low/close/volume).
    //   SELL -> close only: uses the last CLOSED 3H candle, once per candle.
    const { candles, source } = await fetchRealThreeHourCandles(bot.pair);
    const TF_MS = 3 * 60 * 60 * 1000;
    const now = Date.now();
    const isSimulation =
      overrideVapi !== null && overrideVapi !== "" && Number.isFinite(Number(overrideVapi));

    const closedCandles = candles.filter((candle) => candle.timestamp + TF_MS <= now + 1500);
    const forming = candles[candles.length - 1];
    const formingStillOpen = Boolean(forming && forming.timestamp + TF_MS > now + 1500);
    const usedClosedOnly = !isSimulation && closedCandles.length >= vapiLength + 2;

    // Confirmed series (excluding the candle still forming) -> SELL decisions
    const seriesClosed = computeVapiSeries(usedClosedOnly ? closedCandles : candles, vapiLength);
    const closedPoint = seriesClosed[seriesClosed.length - 1];

    // Provisional series (including the forming candle) -> BUY decisions
    const seriesIntrabar =
      !isSimulation && usedClosedOnly && formingStillOpen
        ? computeVapiSeries(candles, vapiLength)
        : seriesClosed;
    const intrabarPoint = seriesIntrabar[seriesIntrabar.length - 1];

    const vapiClosed = isSimulation ? Number(overrideVapi) : closedPoint.va;
    const vapiIntrabar = isSimulation ? Number(overrideVapi) : intrabarPoint.va;
    const nextCloseMs = formingStillOpen ? forming.timestamp + TF_MS : now + TF_MS;

    // Buy price: live price of the forming candle when available, else last close
    const price =
      !isSimulation && formingStillOpen && forming ? forming.close : closedPoint.close;

    const sellBucket = resetCandleLock
      ? -1 // force a brand new sell evaluation window in manual tests
      : Math.floor(closedPoint.timestamp / TF_MS);
    const buyBucket = resetCandleLock
      ? Math.floor(Date.now() / 1000) // unique bucket for manual test
      : Math.floor((formingStillOpen && forming ? forming.timestamp : closedPoint.timestamp) / TF_MS);

    // Sells are evaluated once per CLOSED candle only
    const sellWindowOpen = isSimulation || ladder.lastSellEvalCandle !== sellBucket;

    const timing = {
      mode: isSimulation ? "SIMULATION" : "HYBRID_BUY_INTRABAR_SELL_CLOSE",
      buyEvaluation: formingStillOpen ? "INTRABAR (candela in formazione)" : "candela appena chiusa",
      sellEvaluation: "SOLO a chiusura candela 3H",
      confirmedCandle: closedPoint.time,
      formingCandle: formingStillOpen ? forming.time : null,
      nextCloseUtc: new Date(nextCloseMs).toISOString(),
    };

    let decision: "EXECUTED_BUY" | "EXECUTED_SELL" | "HOLD_WAITING" = "HOLD_WAITING";
    let explanation = "";
    let executedOrder: any = null;

    // 1. SELL rules (R6) — evaluated ONLY on the last CLOSED 3H candle, once per candle
    if (ladder.buys > 0 && sellWindowOpen) {
      const activePlan = plans[String(ladder.buys)] ?? [];
      const nextTarget = activePlan[ladder.sells];

      if (nextTarget && vapiClosed >= nextTarget.level) {
        const fraction = nextTarget.fractionPct / 100;
        const sellUsdt = Math.round(Math.max(100, ladder.investedUsdt * fraction) * 100) / 100;
        const sellQty = Math.round((sellUsdt / price) * 1e6) / 1e6;
        const simulatedPnl = Math.round(sellUsdt * (0.025 + Math.random() * 0.03) * 100) / 100;

        const [order] = await db
          .insert(tradeOrders)
          .values({
            botId: bot.id,
            pair: bot.pair,
            type: "CLOSE_LONG",
            price: String(price),
            amount: String(sellQty),
            totalUsdt: String(sellUsdt),
            status: "FILLED",
            pnlUsdt: String(simulatedPnl),
            pnlPct: String(Math.round((simulatedPnl / sellUsdt) * 10000) / 100),
            source: "AUTOPILOT_3H_NO_TV",
            notes: `[Auto-Pilot Senza TV] R6: Vendita ${nextTarget.fractionPct}% (${ladder.buys} buy) a VAPI di CHIUSURA ${vapiClosed} (candela ${closedPoint.time}) >= ${nextTarget.level}`,
            platform: bot.platform,
          })
          .returning();

        executedOrder = order;
        decision = "EXECUTED_SELL";
        ladder.sells += 1;
        ladder.investedUsdt = Math.max(0, Math.round((ladder.investedUsdt - sellUsdt) * 100) / 100);

        if (nextTarget.fractionPct >= 100 || ladder.sells >= activePlan.length) {
          explanation = `🎯 R6 COMPLETATA (a chiusura candela ${closedPoint.time}): VAPI chiusura ${vapiClosed} ≥ ${nextTarget.level}. Chiuso il 100% residuo della posizione (+$${simulatedPnl}). Ciclo concluso e scala azzerata a 0/3!`;
          ladder = {
            buys: 0,
            sells: 0,
            lastBuyCandle: null,
            lastSellEvalCandle: sellBucket,
            investedUsdt: 0,
            avgEntry: 0,
            positionQty: 0,
          };
        } else {
          explanation = `💰 R6 TARGET PARZIALE (a chiusura candela ${closedPoint.time}): VAPI chiusura ${vapiClosed} ≥ ${nextTarget.level}. Venduto il ${nextTarget.fractionPct}% della posizione (+$${simulatedPnl}). Restano attivi i target successivi.`;
        }

        await db
          .update(tradingBots)
          .set({
            totalPnL: String((Number(bot.totalPnL) + simulatedPnl).toFixed(2)),
            winCount: bot.winCount + 1,
            config: { ...botConfig, ladderState: ladder },
            lastRunAt: new Date(),
          })
          .where(eq(tradingBots.id, bot.id));
      }

      // Sells are evaluated only once per CLOSED 3H candle
      if (!isSimulation) {
        ladder.lastSellEvalCandle = sellBucket;
      }
    }

    // 2. If no sell triggered, check BUY rules (R1, R2, R3, R4, R5)
    if (decision === "HOLD_WAITING") {
      const sellsAlreadyStarted = ladder.sells > 0;
      const sameCandleLocked = ladder.lastBuyCandle === buyBucket && !resetCandleLock;

      if (ladder.buys >= levels.length) {
        explanation = `🛡️ R1 (Scala Piena 3/3): Hai già effettuato tutti i 3 acquisti previsti. Nessuno Stop Loss attivo per regola: il bot mantiene la posizione e attende VAPI ≥ 0 per vendere il primo 50%.`;
      } else if (sellsAlreadyStarted) {
        const activePlan = plans[String(ladder.buys)] ?? [];
        const nextTarget = activePlan[ladder.sells];
        explanation = `⏳ R5/R6 (Fase di scarico): Vendite parziali già iniziate. Nuovi acquisti bloccati fino a fine ciclo. Prossima vendita a VAPI ≥ ${nextTarget?.level ?? 15}.`;
      } else if (sameCandleLocked) {
        explanation = `⏱️ R2 (1 solo Buy per candela 3H): Hai già comprato in questa candela di 3 ore. Anche se il VAPI live è ${vapiIntrabar}, il bot attende l'apertura della prossima candela 3H.`;
      } else {
        const nextRungIndex = ladder.buys;
        const requiredLevel = levels[nextRungIndex];
        const multiplier = multipliers[nextRungIndex] ?? 1;

        // BUY: intrabar — the provisional VAPI of the forming candle is enough
        if (vapiIntrabar <= requiredLevel) {
          const buyUsdt = Math.round(baseSizeUsdt * multiplier * 100) / 100;
          const buyQty = Math.round((buyUsdt / price) * 1e6) / 1e6;

          const [order] = await db
            .insert(tradeOrders)
            .values({
              botId: bot.id,
              pair: bot.pair,
              type: "BUY_LONG",
              price: String(price),
              amount: String(buyQty),
              totalUsdt: String(buyUsdt),
              status: "FILLED",
              pnlUsdt: "0",
              pnlPct: "0",
              source: "AUTOPILOT_3H_NO_TV",
              notes: `[Auto-Pilot Senza TV] Scaglione #${nextRungIndex + 1}/3 (${multiplier}x = $${buyUsdt}) a VAPI INTRABAR ${vapiIntrabar} <= ${requiredLevel}`,
              platform: bot.platform,
            })
            .returning();

          executedOrder = order;
          decision = "EXECUTED_BUY";
          ladder.buys += 1;
          ladder.lastBuyCandle = buyBucket;
          ladder.investedUsdt = Math.round((ladder.investedUsdt + buyUsdt) * 100) / 100;
          ladder.positionQty = Math.round((ladder.positionQty + buyQty) * 1e6) / 1e6;
          ladder.avgEntry = Math.round((ladder.investedUsdt / ladder.positionQty) * 100) / 100;

          botConfig.ladderState = ladder;
          await db
            .update(tradingBots)
            .set({ config: botConfig, lastRunAt: new Date() })
            .where(eq(tradingBots.id, bot.id));

          explanation = `✅ ACQUISTO ESEGUITO INTRABAR (Scaglione #${nextRungIndex + 1}/3): VAPI live ${vapiIntrabar} ≤ ${requiredLevel}. Comprato ${multiplier}x size ($${buyUsdt} USDT) su ${bot.platform} appena toccato il livello, senza aspettare la chiusura.`;
        } else {
          const activePlan = ladder.buys > 0 ? plans[String(ladder.buys)] ?? [] : [];
          const nextSell = activePlan[ladder.sells];
          explanation =
            ladder.buys === 0
              ? `👀 IN ATTESA (0/3 buy): VAPI live intrabar ${vapiIntrabar} (candela ${intrabarPoint.time}), VAPI chiusura ${vapiClosed}. Il 1° acquisto (1x = $${baseSizeUsdt}) scatta appena il VAPI tocca ${requiredLevel}, anche a candela aperta.`
              : `👀 IN POSIZIONE (${ladder.buys}/3 buy): VAPI live ${vapiIntrabar}, VAPI chiusura ${vapiClosed}. Acquisto #${nextRungIndex + 1} (${multiplier}x) se il VAPI tocca ${requiredLevel} intrabar; vendita (${nextSell?.fractionPct ?? 100}%) solo se alla CHIUSURA il VAPI ≥ ${nextSell?.level ?? 12}.`;
        }
      }
    }

    if (!isSimulation) {
      botConfig.ladderState = ladder;
      await db
        .update(tradingBots)
        .set({ config: botConfig, lastRunAt: new Date() })
        .where(eq(tradingBots.id, bot.id));
    }

    // Log check in webhookLogs for full transparency
    await db.insert(webhookLogs).values({
      ticker: bot.pair.replace("/", ""),
      action: decision,
      price: String(price),
      rawPayload: JSON.stringify({
        engine: "AUTOPILOT_3H_HYBRID_BUY_INTRABAR_SELL_CLOSE",
        candleSource: source,
        confirmedCandle: closedPoint.time,
        formingCandle: formingStillOpen ? forming.time : null,
        vapiIntrabar,
        vapiClosed,
        decision,
        ladderBuys: ladder.buys,
      }),
      status: decision === "HOLD_WAITING" ? "CHECKED_NO_TRIGGER" : "EXECUTED",
      sourceIp: "AUTOPILOT_NO_TV_3H",
    });

    return NextResponse.json({
      success: true,
      source,
      pair: bot.pair,
      platform: bot.platform,
      candle: closedPoint,
      intrabarCandle: intrabarPoint,
      vapi: decision === "EXECUTED_SELL" ? vapiClosed : vapiIntrabar,
      vapiIntrabar,
      vapiClosed,
      decision,
      explanation,
      timing,
      ladderState: ladder,
      levels,
      multipliers,
      baseSizeUsdt,
      order: executedOrder,
    });
  } catch (error) {
    console.error("Autopilot error:", error);
    return NextResponse.json(
      { error: "Errore nel motore Auto-Pilot 3H", details: String(error) },
      { status: 500 }
    );
  }
}
