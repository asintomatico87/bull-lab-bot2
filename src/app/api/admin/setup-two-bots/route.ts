import { NextResponse } from "next/server";
import { db, pool } from "@/db";
import { tradingBots } from "@/db/schema";

/**
 * Configurazione pulita dei due bot definitivi (BTC ed ETH).
 *
 * POST /api/admin/setup-two-bots  { "confirm": "RESET" }
 *
 * - cancella ordini e log del webhook
 * - cancella tutti i bot esistenti (compresi quelli demo)
 * - crea "Bull Lab VAPI Ladder 3H BTC" e "... ETH" con le 6 regole
 * - restituisce le due secret
 *
 * È protetto dalla password del cruscotto (proxy.ts), quindi nessuno
 * può chiamarlo dall'esterno senza credenziali.
 */

const BASE_SIZE = 500;

function ladderConfig() {
  return {
    indicator: "VAPI_LazyBear",
    strategy: "VAPI_LADDER_3H",
    timeframe: "3h",
    baseSizeUsdt: BASE_SIZE,
    levels: [-25, -32, -40],
    multipliers: [1, 1.5, 2.5],
    maxBuys: 3,
    plans: {
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
    },
    feePct: 0.035,
    capital: 10000,
    vapiLength: 10,
    gateLevels: true,
    buyTrigger: "intrabar",
    sellTrigger: "close",
    ladderState: {
      buys: 0,
      sells: 0,
      lastBuyCandle: null,
      lastSellEvalCandle: null,
      investedUsdt: 0,
      avgEntry: 0,
      positionQty: 0,
    },
  };
}

function newSecret() {
  return "BL_" + Math.random().toString(36).slice(2, 9).toUpperCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== "RESET") {
      return NextResponse.json(
        { error: 'Serve conferma esplicita: invia { "confirm": "RESET" }.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    let btcSecret = "";
    let ethSecret = "";
    let removedBots = 0;
    let removedOrders = 0;
    let removedLogs = 0;

    try {
      await client.query("BEGIN");

      const orders = await client.query("DELETE FROM trade_orders");
      removedOrders = orders.rowCount ?? 0;
      const logs = await client.query("DELETE FROM webhook_logs");
      removedLogs = logs.rowCount ?? 0;
      const bots = await client.query("DELETE FROM trading_bots");
      removedBots = bots.rowCount ?? 0;

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }

    // Creazione dei due bot tramite Drizzle (dopo il commit della pulizia)
    btcSecret = newSecret();
    const [btc] = await db
      .insert(tradingBots)
      .values({
        name: "Bull Lab VAPI Ladder 3H BTC",
        pair: "BTC/USDT",
        strategyKey: "vapi_ladder",
        platform: "hyperliquid_dex",
        mode: "paper",
        status: "active",
        leverage: 1,
        orderSizeUsdt: String(BASE_SIZE),
        stopLossPct: "0",
        takeProfitPct: "22",
        trailingStopPct: "0",
        timeframe: "3h",
        totalPnL: "0",
        winCount: 0,
        lossCount: 0,
        webhookSecret: btcSecret,
        config: ladderConfig(),
      })
      .returning();

    ethSecret = newSecret();
    const [eth] = await db
      .insert(tradingBots)
      .values({
        name: "Bull Lab VAPI Ladder 3H ETH",
        pair: "ETH/USDT",
        strategyKey: "vapi_ladder",
        platform: "hyperliquid_dex",
        mode: "paper",
        status: "active",
        leverage: 1,
        orderSizeUsdt: String(BASE_SIZE),
        stopLossPct: "0",
        takeProfitPct: "22",
        trailingStopPct: "0",
        timeframe: "3h",
        totalPnL: "0",
        winCount: 0,
        lossCount: 0,
        webhookSecret: ethSecret,
        config: ladderConfig(),
      })
      .returning();

    // URL pubblico: variabile d'ambiente, altrimenti host reale della richiesta
    const host = request.headers.get("host") ?? "";
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
      (host ? `${proto}://${host}` : new URL(request.url).origin);

    return NextResponse.json({
      success: true,
      removed: { bots: removedBots, orders: removedOrders, logs: removedLogs },
      bots: [
        { id: btc.id, name: btc.name, pair: btc.pair, secret: btcSecret },
        { id: eth.id, name: eth.name, pair: eth.pair, secret: ethSecret },
      ],
      webhookUrl: `${base}/api/webhook/tradingview`,
      rules: {
        maxBuys: 3,
        stopLoss: "nessuno (regola 1)",
        levels: [-25, -32, -40],
        multipliers: [1, 1.5, 2.5],
        exits: "3 buy: 50%@0, 50%@15, 100%@22 · 2 buy: 50%@5, resto@15 · 1 buy: 100%@12",
      },
    });
  } catch (error) {
    console.error("setup-two-bots error:", error);
    return NextResponse.json(
      { error: "Configurazione non riuscita", details: String(error) },
      { status: 500 }
    );
  }
}
