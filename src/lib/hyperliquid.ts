import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { formatPrice, formatSize } from "@nktkas/hyperliquid/utils";
import { privateKeyToAccount } from "viem/accounts";

function env() {
  const pk = (process.env.HL_AGENT_PRIVATE_KEY || "").trim();
  const address = (process.env.HL_ACCOUNT_ADDRESS || "").trim() as `0x${string}` | "";
  const testnet = process.env.HL_TESTNET === "true";
  const slip = Number(process.env.HL_SLIPPAGE || 0.01);
  return { pk, address, testnet, slip: Number.isFinite(slip) && slip > 0 ? slip : 0.01 };
}

export function hlConfigured() {
  const { pk, address } = env();
  return Boolean(pk && address && address.startsWith("0x") && address.length === 42);
}

export function hlPublicAddress() {
  const { address, testnet } = env();
  return { address: address || null, testnet };
}

type Clients = { info: InfoClient; exchange?: ExchangeClient; universe: { name: string; szDecimals: number }[] };
let cache: Clients | null = null;

async function clients(needExchange: boolean): Promise<Clients> {
  if (cache && (!needExchange || cache.exchange)) return cache;
  const { pk, testnet } = env();
  const transport = new HttpTransport({ isTestnet: testnet });
  const info = new InfoClient({ transport });
  const meta = await info.meta();
  let exchange: ExchangeClient | undefined;
  if (needExchange) {
    if (!pk) throw new Error("HL_AGENT_PRIVATE_KEY assente");
    const hex = (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;
    const wallet = privateKeyToAccount(hex);
    exchange = new ExchangeClient({ transport, wallet });
  }
  cache = { info, exchange, universe: meta.universe };
  return cache;
}

export type HlFill = { qty: number; price: number; oid?: number };

export async function placeMarket(opts: { symbol: "BTC" | "ETH"; isBuy: boolean; qty: number; reduceOnly: boolean }): Promise<HlFill> {
  if (!hlConfigured()) throw new Error("Hyperliquid non configurato");
  const { info, exchange, universe } = await clients(true);
  if (!exchange) throw new Error("Exchange client assente");
  const coin = opts.symbol;
  const asset = universe.findIndex((u) => u.name === coin);
  if (asset < 0) throw new Error(`Asset ${coin} non trovato su Hyperliquid`);
  const szDecimals = universe[asset].szDecimals;
  const mids = await info.allMids();
  const mid = Number(mids[coin]);
  if (!Number.isFinite(mid) || mid <= 0) throw new Error(`Prezzo mid ${coin} non disponibile`);
  const { slip } = env();
  const rawPx = opts.isBuy ? mid * (1 + slip) : mid * (1 - slip);
  const p = formatPrice(String(rawPx), szDecimals);
  const s = formatSize(String(opts.qty), szDecimals);
  if (Number(s) <= 0) throw new Error("Quantità arrotondata a zero: aumenta la size");
  const result = await exchange.order({
    orders: [{ a: asset, b: opts.isBuy, p, s, r: opts.reduceOnly, t: { limit: { tif: "Ioc" } } }],
    grouping: "na",
  });
  if (result.status !== "ok") throw new Error("Hyperliquid ha rifiutato l'ordine");
  const st = result.response.data.statuses[0] as Record<string, unknown>;
  if (typeof st.error === "string") throw new Error(st.error);
  const filled = st.filled as { totalSz?: string; avgPx?: string; oid?: number } | undefined;
  if (filled?.totalSz && filled?.avgPx) {
    return { qty: Number(filled.totalSz), price: Number(filled.avgPx), oid: filled.oid };
  }
  throw new Error("Ordine non eseguito a mercato (nessun fill IOC)");
}

export async function hlOverview() {
  const { address, testnet } = env();
  if (!address) return null;
  try {
    const { info } = await clients(false);
    const st = await info.clearinghouseState({ user: address });
    return {
      testnet,
      address,
      equity: Number(st.marginSummary.accountValue),
      withdrawable: Number(st.withdrawable),
      positions: st.assetPositions.map((p) => ({
        coin: p.position.coin,
        szi: Number(p.position.szi),
        entry: Number(p.position.entryPx),
        uPnl: Number(p.position.unrealizedPnl),
        lev: p.position.leverage.value,
      })),
    };
  } catch {
    return { testnet, address, error: true as const, equity: 0, withdrawable: 0, positions: [] as { coin: string; szi: number; entry: number; uPnl: number; lev: number }[] };
  }
}
