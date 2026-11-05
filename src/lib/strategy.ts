/**
 * Regole Bull Lab — "VAPI LADDER 3H" (LazyBear VAPI, periodo 10, BTC/ETH).
 * Confermate dal vecchio script Pine:
 *  R1 max 3 BUY per ciclo, nessuno stop loss
 *  R2 max 1 BUY per candela 3H (in assoluto, non per scaglione)
 *  R3 size 1× / 1,5× / 2,5× su una base in USD
 *  R4 BUY quando VAPI ≤ −25 / −32 / −40
 *  R5 ogni scaglione si riempie una sola volta e in ordine (ladder)
 *  R6 uscite a chiusura 3H sui livelli VAPI (≥ 0/15/22 con 3 BUY, ≥ 5/15 con 2, ≥ 12 con 1 BUY)
 */

export const SUPPORTED_COINS = ["BTC", "ETH"] as const;
export type Coin = (typeof SUPPORTED_COINS)[number];

export const TIMEFRAME_MINUTES = 180; // 3H
export const TIMEFRAME_MS = TIMEFRAME_MINUTES * 60_000;
export const VAPI_PERIOD = 10;
export const MAX_BUYS_PER_CYCLE = 3;
export const STOP_LOSS = false;

export type BuyTier = { tier: 1 | 2 | 3; vapi: number; size: number };

/** BUY intrabar quando VAPI ≤ soglia. size = multiplo dell'unità in USD. */
export const BUY_TIERS: readonly BuyTier[] = [
  { tier: 1, vapi: -25, size: 1 },
  { tier: 2, vapi: -32, size: 1.5 },
  { tier: 3, vapi: -40, size: 2.5 },
];

export type ExitStep = {
  /** Livello VAPI che fa scattare lo scaglione di uscita. */
  minVapi: number;
  /** Frazione della posizione RESIDUA da vendere (1 = chiude tutto). */
  sellFraction: number;
  label: string;
};

/** Uscite a CHIUSURA 3H, in funzione del numero di BUY del ciclo. Nessuno stop loss. */
export const EXIT_PLANS: Record<number, readonly ExitStep[]> = {
  1: [{ minVapi: 12, sellFraction: 1, label: "VAPI ≥ 12 → chiude tutto" }],
  2: [
    { minVapi: 5, sellFraction: 0.5, label: "VAPI ≥ 5 → vende 50%" },
    { minVapi: 15, sellFraction: 1, label: "VAPI ≥ 15 → chiude il resto" },
  ],
  3: [
    { minVapi: 0, sellFraction: 0.5, label: "VAPI ≥ 0 → vende 50%" },
    { minVapi: 15, sellFraction: 0.5, label: "VAPI ≥ 15 → vende metà del rimanente" },
    { minVapi: 22, sellFraction: 1, label: "VAPI ≥ 22 → chiude tutto" },
  ],
};

export function tierDef(tier: number): BuyTier | undefined {
  return BUY_TIERS.find((t) => t.tier === tier);
}

/** Prossimo scaglione del ladder (quello che può essere comprato ora). */
export function nextBuyTier(buyCount: number): BuyTier | undefined {
  if (buyCount >= MAX_BUYS_PER_CYCLE) return undefined;
  return tierDef(buyCount + 1);
}

/** Scaglioni con livello toccato (solo informativo: il ladder resta in ordine). */
export function touchedTiers(vapi: number): BuyTier[] {
  return BUY_TIERS.filter((t) => vapi <= t.vapi);
}

export function pnlPct(price: number, avgEntry: number): number {
  if (!(avgEntry > 0)) return 0;
  return (price / avgEntry - 1) * 100;
}

/** Scaglione di uscita raggiunto dal VAPI corrente (null se nessuno). */
export function nextExitStep(
  buyCount: number,
  exitStage: number,
  vapi: number,
): { step: ExitStep; stageIndex: number } | null {
  const plan = EXIT_PLANS[Math.min(Math.max(buyCount, 1), MAX_BUYS_PER_CYCLE)];
  const step = plan?.[exitStage];
  if (!step) return null;
  if (vapi >= step.minVapi) return { step, stageIndex: exitStage };
  return null;
}

/** Prossimo target da mostrare in dashboard, indipendentemente dal VAPI corrente. */
export function upcomingExit(buyCount: number, exitStage: number): ExitStep | null {
  const plan = EXIT_PLANS[Math.min(Math.max(buyCount, 1), MAX_BUYS_PER_CYCLE)];
  return plan?.[exitStage] ?? null;
}

/** Inizio (UTC) della candela 3H che contiene il timestamp. */
export function floorToBar(date: Date): Date {
  return new Date(Math.floor(date.getTime() / TIMEFRAME_MS) * TIMEFRAME_MS);
}

/** True se `now` è vicino a un confine di candela 3H (chiusura): da −60s a +10min. */
export function isNearBarClose(now: Date, afterMs = 10 * 60_000, beforeMs = 60_000): boolean {
  const into = now.getTime() % TIMEFRAME_MS;
  return into <= afterMs || into >= TIMEFRAME_MS - beforeMs;
}
