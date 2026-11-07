// Secret condiviso tra TradingView e il server.
// Se su Vercel manca WEBHOOK_SECRET si usa il valore di riserva "bulllab",
// che coincide con il default dello script Pine: funziona, ma è prevedibile.
export const DEFAULT_SECRET = "bulllab";
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || DEFAULT_SECRET;
export const usingDefaultSecret = WEBHOOK_SECRET === DEFAULT_SECRET;
