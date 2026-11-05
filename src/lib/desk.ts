export type CycleRow = {
  symbol: string;
  status: string;
  entries: number;
  exitStage: number;
  qty: number;
  cost: number;
  realizedPnl: number;
};

export type TradeRow = {
  symbol: string;
  side: string;
  price: number;
  qty: number;
  vapi: number;
  note: string;
  pnl: number;
  createdAt: Date;
};

export function money(n: number, digits = 2) {
  return n.toLocaleString("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function qtyFmt(n: number) {
  return n.toLocaleString("it-IT", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}

export function utcStamp(d: Date) {
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function nextMove(c?: CycleRow) {
  if (!c) return { title: "In attesa", text: "Primo BUY quando VAPI tocca −25 durante una candela 3H." };
  if (c.exitStage > 0) {
    if (c.entries === 2 && c.exitStage === 1) return { title: "In uscita", text: "Prossima vendita: chiude il resto se VAPI ≥ 15 a chiusura 3H." };
    if (c.entries === 3 && c.exitStage === 1) return { title: "In uscita", text: "Prossima vendita: metà del rimanente se VAPI ≥ 15 a chiusura 3H." };
    if (c.entries === 3 && c.exitStage === 2) return { title: "In uscita", text: "Prossima vendita: chiude tutto se VAPI ≥ 22 a chiusura 3H." };
    return { title: "In uscita", text: "Ciclo in fase di vendita. Nuovi BUY bloccati." };
  }
  if (c.entries === 1) return { title: "1 BUY aperto", text: "Secondo BUY se VAPI ≤ −32 su una nuova candela. Oppure chiude tutto se VAPI ≥ 12 a chiusura 3H." };
  if (c.entries === 2) return { title: "2 BUY aperti", text: "Terzo BUY se VAPI ≤ −40 su una nuova candela. Oppure vende 50% se VAPI ≥ 5 a chiusura 3H." };
  return { title: "Scala piena", text: "Niente altri BUY. Vende 50% se VAPI ≥ 0 a chiusura 3H." };
}

export function exposure(c?: CycleRow) {
  if (!c || !c.qty) return 0;
  return c.cost;
}

export function rungs(baseUsd: number) {
  return [
    { n: 1, vapi: "−25", usd: baseUsd },
    { n: 2, vapi: "−32", usd: baseUsd * 1.5 },
    { n: 3, vapi: "−40", usd: baseUsd * 2.5 },
  ];
}
