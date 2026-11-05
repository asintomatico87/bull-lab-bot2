import { hlNetwork } from "./settings";

export type ExecParams = {
  mode: "paper" | "live";
  coin: string;
  side: "BUY" | "SELL";
  /** Quantità desiderata in coin. */
  qty: number;
  /** Prezzo di riferimento (quello del segnale). */
  refPrice: number;
  reduceOnly?: boolean;
};

export type ExecResult = {
  qty: number;
  price: number;
  raw: Record<string, unknown>;
};

/** Esegue un ordine: in paper simula il fill al prezzo del segnale, in live manda un IOC a Hyperliquid. */
export async function executeOrder(p: ExecParams): Promise<ExecResult> {
  if (p.mode === "paper") {
    return { qty: p.qty, price: p.refPrice, raw: { simulated: true } };
  }
  return liveExecute(p);
}

const floorDec = (n: number, dec: number) => {
  const f = 10 ** dec;
  return Math.floor(n * f + 1e-9) / f;
};

/** Hyperliquid: max 5 cifre significative e max (6 - szDecimals) decimali per i perp. */
export function formatPrice(px: number, szDecimals: number): string {
  if (Number.isInteger(px)) return String(px);
  const sig = Number(px.toPrecision(5));
  const dec = Math.max(0, 6 - szDecimals);
  return String(Number(sig.toFixed(dec)));
}

export function formatSize(sz: number, szDecimals: number): string {
  return String(Number(sz.toFixed(szDecimals)));
}

async function liveExecute(p: ExecParams): Promise<ExecResult> {
  const pkRaw = process.env.HL_PRIVATE_KEY?.trim();
  if (!pkRaw) throw new Error("Modalità LIVE ma HL_PRIVATE_KEY non è configurata nelle variabili d'ambiente.");

  const { ExchangeClient, HttpTransport, InfoClient } = await import("@nktkas/hyperliquid");
  const { privateKeyToAccount } = await import("viem/accounts");

  const transport = new HttpTransport({ isTestnet: hlNetwork() === "testnet" });
  const info = new InfoClient({ transport });
  const wallet = privateKeyToAccount((pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as `0x${string}`);
  const exchange = new ExchangeClient({ transport, wallet });

  const meta = await info.meta();
  const asset = meta.universe.findIndex((u) => u.name === p.coin);
  if (asset < 0) throw new Error(`Asset ${p.coin} non trovato su Hyperliquid.`);
  const szDecimals = meta.universe[asset].szDecimals;

  const mids = await info.allMids();
  const mid = Number(mids[p.coin]) || p.refPrice;
  const slippage = (Number(process.env.HL_SLIPPAGE_PCT ?? "3") || 3) / 100;
  const limit = p.side === "BUY" ? mid * (1 + slippage) : mid * (1 - slippage);

  const size = floorDec(p.qty, szDecimals);
  if (size <= 0) throw new Error(`Size troppo piccola dopo l'arrotondamento (${p.qty} ${p.coin}).`);

  const lev = Number(process.env.HL_LEVERAGE ?? "");
  if (p.side === "BUY" && Number.isFinite(lev) && lev >= 1) {
    try {
      await exchange.updateLeverage({ asset, isCross: true, leverage: lev });
    } catch {
      // non bloccante: si usa il leverage già impostato sull'account
    }
  }

  const res = await exchange.order({
    orders: [
      {
        a: asset,
        b: p.side === "BUY",
        p: formatPrice(limit, szDecimals),
        s: formatSize(size, szDecimals),
        r: Boolean(p.reduceOnly),
        t: { limit: { tif: "Ioc" } },
      },
    ],
    grouping: "na",
  });

  const status = res.response.data.statuses[0];
  if (typeof status === "object" && status !== null && "filled" in status) {
    return {
      qty: Number(status.filled.totalSz),
      price: Number(status.filled.avgPx),
      raw: { oid: status.filled.oid, network: hlNetwork() },
    };
  }
  if (typeof status === "object" && status !== null && "error" in status) {
    throw new Error(`Hyperliquid ha rifiutato l'ordine: ${status.error}`);
  }
  throw new Error(`Ordine non eseguito (nessun fill IOC): ${JSON.stringify(status)}`);
}
