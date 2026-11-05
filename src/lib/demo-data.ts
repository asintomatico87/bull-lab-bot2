/** Profili cassiere creati dallo seed: non sono account dell'utente. */
export const DEMO_CASHIER_NAMES = [
  "Hyperliquid Perp L1 (DEX)",
  "OurBit Futures (No-KYC)",
  "Bitbase Affiliate Pro",
  "Bybit V5 Unified (CEX)",
  "Binance USD-M Futures",
  "Paper Trading Virtual Engine",
  "Paper Trading Simulator",
];

const DEMO_KEY_HINTS = [
  "PAPER_SIM",
  "PAPER_VIRTUAL",
  "0x7a3",
  "ourbit_ak_98124",
  "bitbase_live_3309",
  "byb_live_key_9182",
  "binance_f_981",
];

export function isDemoCashier(profile: { name?: string | null; apiKeyMasked?: string | null }): boolean {
  if (profile.name && DEMO_CASHIER_NAMES.includes(profile.name)) return true;
  const key = profile.apiKeyMasked ?? "";
  return DEMO_KEY_HINTS.some((hint) => key.includes(hint));
}
