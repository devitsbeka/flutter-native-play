/** What the luck wheel can pay out. */
export type Prize = { kind: "hints"; amount: number } | { kind: "coins"; amount: number };

export const describePrize = (p: Prize) =>
  p.kind === "coins" ? `${p.amount} coins` : p.amount === 1 ? "1 free hint" : `${p.amount} free hints`;
