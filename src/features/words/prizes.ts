/** What the luck wheel can pay out. */
export type Prize = { kind: "hints"; amount: number } | { kind: "coins"; amount: number };

type T = (key: string, params?: Record<string, string | number>) => string;

export const describePrize = (t: T, p: Prize) =>
  p.kind === "coins"
    ? t("words.prizeCoins", { n: p.amount })
    : p.amount === 1
      ? t("words.prizeHint")
      : t("words.prizeHints", { n: p.amount });
