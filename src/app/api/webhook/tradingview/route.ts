import { NextResponse } from "next/server";
import { db } from "@/db";
import { tradingBots, tradeOrders, webhookLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  let rawBody = "";
  try {
    rawBody = await request.text();
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // Allow key=value formatted payload if user sends plain text
      return NextResponse.json(
        { error: "Invalid JSON format in webhook body" },
        { status: 400 }
      );
    }

    const {
      secret,
      ticker = "BTCUSDT",
      action = "BUY_LONG",
      size = 0.05,
      price = null,
      vapi = null,
      phase = null,
      strategy = "TradingView_Alert",
      notes = "TradingView Webhook Execution",
    } = payload;

    const normalizedAction = String(action).toUpperCase();
    const vapiValue = vapi === null || vapi === undefined || vapi === "" ? null : Number(vapi);

    const clientIp = request.headers.get("x-forwarded-for") || "tradingview-alert";

    if (!secret) {
      await db.insert(webhookLogs).values({
        ticker: String(ticker),
        action: String(action),
        price: price ? String(price) : "0",
        rawPayload: rawBody.slice(0, 1000),
        status: "REJECTED_BAD_SECRET",
        sourceIp: clientIp,
      });
      return NextResponse.json(
        { error: "Webhook secret key is required" },
        { status: 401 }
      );
    }

    // Find bot with this secret
    const bots = await db
      .select()
      .from(tradingBots)
      .where(eq(tradingBots.webhookSecret, String(secret)))
      .limit(1);

    if (bots.length === 0) {
      await db.insert(webhookLogs).values({
        ticker: String(ticker),
        action: String(action),
        price: price ? String(price) : "0",
        rawPayload: rawBody.slice(0, 1000),
        status: "REJECTED_BAD_SECRET",
        sourceIp: clientIp,
      });
      return NextResponse.json(
        { error: "Unknown webhook secret. No matching Bull Lab bot found." },
        { status: 403 }
      );
    }

    const bot = bots[0];
    const botConfig = (bot.config ?? {}) as Record<string, unknown>;

    // Il ticker dell'alert deve corrispondere alla coppia del bot: ogni bot ha la
    // propria scala, quindi un alert ETH non deve mai muovere la scala di un bot BTC.
    const tickerPair = String(ticker).toUpperCase().includes("ETH") ? "ETH/USDT" : "BTC/USDT";
    const botPair = String(bot.pair ?? "BTC/USDT").toUpperCase();

    if (botPair !== tickerPair) {
      await db.insert(webhookLogs).values({
        ticker: String(ticker),
        action: String(action),
        price: price ? String(price) : "0",
        rawPayload: rawBody.slice(0, 1000),
        status: "REJECTED_PAIR_MISMATCH",
        sourceIp: clientIp,
      });
      return NextResponse.json(
        {
          error: `Questo bot opera su ${botPair}, ma l'alert riguarda ${tickerPair}. Crea un bot dedicato per ${tickerPair} e usa la sua secret nello script applicato al grafico ${tickerPair}.`,
          botPair,
          alertPair: tickerPair,
          botId: bot.id,
        },
        { status: 409 }
      );
    }


    // ---------------------------------------------------------------------
    // VAPI LEVEL GATE — validates the LazyBear oscillator thresholds that
    // are configured on the bot before any order can reach the exchange.
    // ---------------------------------------------------------------------
    if (bot.strategyKey === "vapi_lazybear" && botConfig.gateLevels !== false) {
      const longEntry = Number(botConfig.longEntry ?? 10);
      const shortEntry = Number(botConfig.shortEntry ?? -10);
      const isEntry = normalizedAction === "BUY_LONG" || normalizedAction === "SELL_SHORT";

      if (isEntry && (vapiValue === null || !Number.isFinite(vapiValue))) {
        await db.insert(webhookLogs).values({
          ticker: String(ticker),
          action: String(action),
          price: price ? String(price) : "0",
          rawPayload: rawBody.slice(0, 1000),
          status: "REJECTED_MISSING_VAPI",
          sourceIp: clientIp,
        });
        return NextResponse.json(
          {
            error:
              "VAPI level gate active: the alert must include the current VAPI value in the payload (e.g. \"vapi\": 12.4).",
            requiredLevels: { longEntry, shortEntry },
          },
          { status: 422 }
        );
      }

      if (isEntry) {
        const violatesLong = normalizedAction === "BUY_LONG" && (vapiValue as number) < longEntry;
        const violatesShort = normalizedAction === "SELL_SHORT" && (vapiValue as number) > shortEntry;

        if (violatesLong || violatesShort) {
          await db.insert(webhookLogs).values({
            ticker: String(ticker),
            action: String(action),
            price: price ? String(price) : "0",
            rawPayload: rawBody.slice(0, 1000),
            status: "REJECTED_LEVEL_GATE",
            sourceIp: clientIp,
          });
          return NextResponse.json(
            {
              error:
                normalizedAction === "BUY_LONG"
                  ? `VAPI ${vapiValue} is below the LONG entry level (${longEntry}). Order rejected by the level gate.`
                  : `VAPI ${vapiValue} is above the SHORT entry level (${shortEntry}). Order rejected by the level gate.`,
              received: vapiValue,
              requiredLevels: { longEntry, shortEntry },
            },
            { status: 409 }
          );
        }
      }
    }

    // ---------------------------------------------------------------------
    // VAPI LADDER GATE — enforces the 6 martingale rules before execution:
    // one buy per candle, one buy per rung, max 3 buys, tiered sell plan.
    // ---------------------------------------------------------------------
    if (bot.strategyKey === "vapi_ladder" && botConfig.gateLevels !== false) {
      const levels = Array.isArray(botConfig.levels)
        ? (botConfig.levels as unknown[]).map(Number)
        : [-25, -32, -40];
      const multipliers = Array.isArray(botConfig.multipliers)
        ? (botConfig.multipliers as unknown[]).map(Number)
        : [1, 1.5, 2.5];
      const baseSizeUsdt = Number(botConfig.baseSizeUsdt ?? 500);
      const plans = (botConfig.plans ?? {}) as Record<string, { level: number; fractionPct: number }[]>;
      const ladder = {
        buys: 0,
        sells: 0,
        lastBuyCandle: null as number | null,
        investedUsdt: 0,
        ...((botConfig.ladderState ?? {}) as Record<string, unknown>),
      } as { buys: number; sells: number; lastBuyCandle: number | null; investedUsdt: number };

      const candleId = Math.floor(Date.now() / (3 * 60 * 60 * 1000));
      const isBuy = normalizedAction === "BUY_LONG";
      const isSell = normalizedAction === "CLOSE_LONG";

      const rejectLadder = async (reason: string) => {
        await db.insert(webhookLogs).values({
          ticker: String(ticker),
          action: String(action),
          price: price ? String(price) : "0",
          rawPayload: rawBody.slice(0, 1000),
          status: "REJECTED_LADDER_RULE",
          sourceIp: clientIp,
        });
        return NextResponse.json({ error: reason, ladderState: ladder, rules: { levels, multipliers } }, { status: 409 });
      };

      if ((isBuy || isSell) && (vapiValue === null || !Number.isFinite(vapiValue))) {
        await db.insert(webhookLogs).values({
          ticker: String(ticker),
          action: String(action),
          price: price ? String(price) : "0",
          rawPayload: rawBody.slice(0, 1000),
          status: "REJECTED_MISSING_VAPI",
          sourceIp: clientIp,
        });
        return NextResponse.json(
          { error: "VAPI ladder gate: payload must include the current VAPI value.", requiredLevels: levels },
          { status: 422 }
        );
      }

      if (isBuy) {
        if (ladder.buys >= levels.length) return await rejectLadder(`R1: ladder is full (${levels.length} buys), no stop loss by design.`);
        if (ladder.lastBuyCandle === candleId) return await rejectLadder("R2: one buy per 3H candle already executed.");
        if (ladder.sells > 0) return await rejectLadder("Buys are disabled once the sell plan has started.");
        const expectedLevel = levels[ladder.buys];
        if ((vapiValue as number) > expectedLevel) {
          return await rejectLadder(`R4/R5: next rung requires VAPI <= ${expectedLevel} (received ${vapiValue}).`);
        }

        const expectedQty = (baseSizeUsdt * (multipliers[ladder.buys] ?? 1)) / Math.max(1, Number(price ?? 0) || 1);
        const sentQty = Number(size) || expectedQty;
        const notional = Math.round(sentQty * (Number(price) || 0));
        ladder.buys += 1;
        ladder.lastBuyCandle = candleId;
        ladder.investedUsdt = Math.round((ladder.investedUsdt + notional) * 100) / 100;
      }

      if (isSell) {
        // SELL side must be evaluated on the 3H candle close, never intrabar
        if (String(phase ?? "").toLowerCase() === "intrabar") {
          return await rejectLadder(
            "R6: sells are evaluated only when the 3H candle closes. Send the sell alert at bar close (phase: close)."
          );
        }
        if (ladder.buys === 0) return await rejectLadder("No open ladder position to close.");
        const plan = plans[String(ladder.buys)] ?? [];
        const target = plan[ladder.sells];
        if (!target) return await rejectLadder(`R6: sell plan for ${ladder.buys} buys is already completed.`);
        if ((vapiValue as number) < target.level) {
          return await rejectLadder(
            `R6: with ${ladder.buys} buys the next exit needs VAPI >= ${target.level} (${target.fractionPct}% of the position).`
          );
        }
        ladder.sells += 1;
        if (target.fractionPct >= 100 || ladder.sells >= plan.length) {
          ladder.buys = 0;
          ladder.sells = 0;
          ladder.investedUsdt = 0;
        }
      }

      botConfig.ladderState = ladder;
      await db
        .update(tradingBots)
        .set({ config: { ...botConfig } })
        .where(eq(tradingBots.id, bot.id));
    }

    if (bot.status !== "active") {
      await db.insert(webhookLogs).values({
        ticker: String(ticker),
        action: String(action),
        price: price ? String(price) : "0",
        rawPayload: rawBody.slice(0, 1000),
        status: "IGNORED_BOT_PAUSED",
        sourceIp: clientIp,
      });
      return NextResponse.json({
        warning: `Bot #${bot.id} (${bot.name}) is currently ${bot.status}. Trade was ignored.`,
      });
    }

    // Determine execution price
    const executionPrice = price ? Number(price) : ticker.includes("ETH") ? 2450.00 : 84150.00;
    const standardPair = tickerPair;
    const tradeAmount = Number(size);
    const totalUsdt = (executionPrice * tradeAmount).toFixed(2);

    let pnlUsdt = "0";
    let pnlPct = "0";

    if (action.includes("CLOSE")) {
      const simulatedPnl = Math.round((Math.random() * 95 - 20) * 100) / 100;
      pnlUsdt = String(simulatedPnl);
      pnlPct = (simulatedPnl / Number(totalUsdt) * 100).toFixed(2);
    }

    // Execute Trade Order
    const [order] = await db
      .insert(tradeOrders)
      .values({
        botId: bot.id,
        pair: standardPair,
        type: String(action).toUpperCase(),
        price: String(executionPrice),
        amount: String(tradeAmount),
        totalUsdt,
        status: "FILLED",
        pnlUsdt,
        pnlPct,
        source: "WEBHOOK_TRADINGVIEW",
        notes: `${notes} [Strat: ${strategy}]${vapiValue !== null ? ` [VAPI ${vapiValue}]` : ""}${
          phase ? ` [${String(phase).toUpperCase()}]` : ""
        } via ${bot.platform}`,
        platform: bot.platform,
      })
      .returning();

    // Update Bot Stats
    const newTotalPnL = (Number(bot.totalPnL) + Number(pnlUsdt)).toFixed(2);
    const winCount = Number(pnlUsdt) > 0 ? bot.winCount + 1 : bot.winCount;
    const lossCount = Number(pnlUsdt) < 0 ? bot.lossCount + 1 : bot.lossCount;

    await db
      .update(tradingBots)
      .set({
        totalPnL: newTotalPnL,
        winCount,
        lossCount,
        lastRunAt: new Date(),
      })
      .where(eq(tradingBots.id, bot.id));

    // Log Successful Webhook
    await db.insert(webhookLogs).values({
      ticker: String(ticker),
      action: String(action),
      price: String(executionPrice),
      rawPayload: rawBody.slice(0, 1000),
      status: "EXECUTED",
      sourceIp: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: `Bull Lab Webhook executed successfully on ${bot.platform}!`,
      order: {
        id: order.id,
        botId: bot.id,
        botName: bot.name,
        pair: standardPair,
        action: order.type,
        price: order.price,
        amount: order.amount,
        platform: order.platform,
        status: order.status,
        timestamp: order.timestamp,
      },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const logs = await db
      .select()
      .from(webhookLogs)
      .orderBy(eq(webhookLogs.id, webhookLogs.id))
      .limit(30);

    return NextResponse.json({
      endpoint: "/api/webhook/tradingview",
      method: "POST",
      description: "Bull Lab TradingView Webhook Gateway",
      examplePayload: {
        secret: "YOUR_BOT_WEBHOOK_SECRET",
        ticker: "BTCUSDT",
        action: "BUY_LONG",
        size: 0.05,
        price: 84200,
        vapi: 14.7,
        strategy: "VAPI_LB_3H",
      },
      recentLogs: logs,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to read webhook logs" }, { status: 500 });
  }
}
