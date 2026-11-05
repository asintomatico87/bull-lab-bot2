import { SUPPORTED_COINS } from "./strategy";

export type ParsedSignal = {
  action: "BUY" | "SELL" | "PING";
  tier?: number;
  rawSymbol?: string;
  coin?: string;
  price?: number;
  vapi?: number;
  tfMinutes?: number;
  rawTf?: string;
  barTime?: Date;
  closePct?: number;
  buysHint?: number;
  sizeHint?: number;
  secret?: string;
  warnings: string[];
};

export type ParseFailure = { ok: false; code: string; message: string; parsed?: unknown };
export type ParseSuccess = { ok: true; signal: ParsedSignal; parsed: Record<string, unknown> };

const pick = (obj: Record<string, unknown>, keys: string[]): unknown => {
  const lower: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const toNumber = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", ".").trim());
    if (Number.isFinite(n) && v.trim() !== "") return n;
  }
  return undefined;
};

/** "BINANCE:BTCUSDT.P", "BTCUSD", "BTC-PERP", "BTC/USDT:USDT" → "BTC". */
export function normalizeCoin(raw: string): string {
  let s = raw.toUpperCase().trim();
  if (s.includes("/")) s = s.split(":")[0];
  else if (s.includes(":")) s = s.split(":").pop() ?? s;
  s = s.replace(/[-_/\s]/g, "");
  s = s.replace(/(\.P|\.PERP|PERP)$/, "");
  s = s.replace(/(USDT|USDC|BUSD|USDE|USD)$/, "");
  if (s === "XBT") s = "BTC";
  return s;
}

export function isSupportedCoin(coin: string): boolean {
  return (SUPPORTED_COINS as readonly string[]).includes(coin);
}

/** "180", "3H", "3h", "180m", "D" → minuti. */
export function parseTimeframe(raw: string): number | undefined {
  const s = raw.trim().toUpperCase();
  let m = s.match(/^(\d+)\s*(H|HR|HOUR|HOURS)$/);
  if (m) return Number(m[1]) * 60;
  m = s.match(/^(\d+)\s*(M|MIN|MINS|MINUTE|MINUTES)$/);
  if (m) return Number(m[1]);
  if (/^\d+$/.test(s)) return Number(s);
  m = s.match(/^(\d*)\s*D$/);
  if (m) return (m[1] ? Number(m[1]) : 1) * 1440;
  return undefined;
}

function parseTime(v: unknown): Date | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = toNumber(v);
  if (n !== undefined) {
    const ms = n > 1e12 ? n : n > 1e9 ? n * 1000 : NaN;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/**
 * Azioni accettate. Include il formato del vecchio script Bull Lab:
 * BUY_LONG / CLOSE_LONG (con campi ticker, rung, buys, closePct).
 */
function normalizeAction(raw: string): { action: "BUY" | "SELL" | "PING"; tier?: number } | null {
  const s = raw.toLowerCase().trim();
  if (/^(ping|test|hello)$/.test(s)) return { action: "PING" };
  const m = s.match(/^(buy|buy_long|buylong|long|entry|enter|open|bull)[\s_-]?([1-3])?$/);
  if (m) return { action: "BUY", tier: m[2] ? Number(m[2]) : undefined };
  if (
    /^(sell|sell_long|selllong|close|close_long|closelong|exit|bar_close|barclose|bar-close|tp|take_profit|check|exit_check)$/.test(
      s,
    )
  ) {
    return { action: "SELL" };
  }
  return null;
}

export function parsePayload(
  rawBody: string,
  query: URLSearchParams,
  headerSecret?: string | null,
): ParseSuccess | ParseFailure {
  const body = rawBody.replace(/^\uFEFF/, "").trim();
  if (!body) {
    return {
      ok: false,
      code: "EMPTY_BODY",
      message:
        "Body vuoto: nel campo 'Messaggio' dell'alert TradingView devi inserire il JSON (vedi pagina Setup).",
    };
  }

  let obj: Record<string, unknown> | null = null;
  try {
    const j = JSON.parse(body);
    if (j && typeof j === "object" && !Array.isArray(j)) obj = j as Record<string, unknown>;
  } catch {
    // proviamo i formati testuali
  }

  if (!obj) {
    // "BUY BTCUSDT" / "SELL ETHUSDT 3500"
    const t = body.match(/^(\w+)\s+([A-Za-z0-9:._/-]+)(?:\s+(-?\d+(?:[.,]\d+)?))?$/);
    if (t && normalizeAction(t[1])) {
      obj = { action: t[1], symbol: t[2], ...(t[3] ? { price: t[3] } : {}) };
    }
  }

  if (!obj && /\{\{[^}]*\}\}/.test(body)) {
    return {
      ok: false,
      code: "PLACEHOLDER_NOT_RESOLVED",
      message: `Nel body sono rimasti placeholder TradingView non sostituiti (${body.match(/\{\{[^}]*\}\}/)?.[0]}), quindi il JSON non è valido. Succede quando l'alert non è creato sull'indicatore/script che definisce quel valore (es. {{plot("VAPI")}} richiede un plot chiamato esattamente "VAPI"). Inizio ricevuto: "${body.slice(0, 160)}".`,
    };
  }

  if (!obj) {
    return {
      ok: false,
      code: "BAD_JSON",
      message: `Il body non è JSON valido. Inizio ricevuto: "${body.slice(0, 160)}". Se è il testo standard di una strategy (“order buy @ …”), sostituiscilo con il JSON della pagina Setup.`,
    };
  }

  // Placeholder TradingView non sostituiti, es. "{{close}}" o {{plot("VAPI")}}
  const unresolved = JSON.stringify(obj).match(/\{\{[^}]*\}\}/);
  if (unresolved) {
    return {
      ok: false,
      code: "PLACEHOLDER_NOT_RESOLVED",
      message: `Il placeholder ${unresolved[0]} è arrivato non sostituito: TradingView lo risolve solo nel campo Messaggio di un alert creato sull'indicatore/strategia giusti (es. {{plot("VAPI")}} richiede un plot chiamato esattamente "VAPI").`,
      parsed: obj,
    };
  }

  const actionRaw = pick(obj, ["action", "side", "signal", "type", "command", "order_action"]);
  if (typeof actionRaw !== "string") {
    return {
      ok: false,
      code: "MISSING_ACTION",
      message: "Manca il campo 'action' (BUY, SELL / BAR_CLOSE oppure PING).",
      parsed: obj,
    };
  }
  const act = normalizeAction(actionRaw);
  if (!act) {
    return {
      ok: false,
      code: "BAD_ACTION",
      message: `Azione '${actionRaw}' non riconosciuta. Valori ammessi: BUY, SELL, BAR_CLOSE.`,
      parsed: obj,
    };
  }

  const warnings: string[] = [];
  let tier = act.tier;
  const tierRaw = toNumber(pick(obj, ["tier", "rung", "level", "step", "scaglione"]));
  if (tierRaw !== undefined) {
    if ([1, 2, 3].includes(tierRaw)) tier = tierRaw;
    else warnings.push(`tier ${tierRaw} ignorato (ammessi 1, 2, 3)`);
  }

  const symRaw = pick(obj, ["symbol", "ticker", "pair", "coin", "market", "asset"]);
  const rawSymbol = symRaw !== undefined ? String(symRaw) : undefined;
  const tfRaw = pick(obj, ["tf", "interval", "timeframe", "resolution"]);
  const closePctRaw = toNumber(pick(obj, ["closePct", "close_pct", "sellPct", "exitPct"]));
  const buysRaw = toNumber(pick(obj, ["buys", "buyCount", "buy_count"]));
  const sizeRaw = toNumber(pick(obj, ["size", "qty", "quantity", "amount"]));
  const secretRaw = pick(obj, ["secret", "token", "passphrase", "key", "password"]);

  const signal: ParsedSignal = {
    action: act.action,
    tier,
    rawSymbol,
    coin: rawSymbol ? normalizeCoin(rawSymbol) : undefined,
    price: toNumber(pick(obj, ["price", "close", "px", "last"])),
    vapi: toNumber(pick(obj, ["vapi", "value", "indicator", "osc"])),
    rawTf: tfRaw !== undefined ? String(tfRaw) : undefined,
    tfMinutes: tfRaw !== undefined ? parseTimeframe(String(tfRaw)) : undefined,
    barTime: parseTime(pick(obj, ["barTime", "bar_time", "time", "timenow", "timestamp"])),
    closePct: closePctRaw,
    buysHint: buysRaw,
    sizeHint: sizeRaw,
    secret:
      (secretRaw !== undefined ? String(secretRaw) : undefined) ??
      query.get("secret") ??
      headerSecret ??
      undefined,
    warnings,
  };

  // Non conservare il secret nel log
  const safe = { ...obj };
  for (const k of Object.keys(safe)) {
    if (["secret", "token", "passphrase", "key", "password"].includes(k.toLowerCase())) {
      safe[k] = "***";
    }
  }

  return { ok: true, signal, parsed: safe };
}

/** Rimuove il secret dal body grezzo prima di salvarlo nel log. */
export function redactRawBody(raw: string): string {
  return raw.replace(
    /("(?:secret|token|passphrase|key|password)"\s*:\s*")([^"]*)(")/gi,
    "$1***$3",
  );
}
