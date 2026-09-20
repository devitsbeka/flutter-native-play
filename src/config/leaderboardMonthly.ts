/**
 * What finishing in a month's top three is worth.
 *
 * THE DATABASE PAYS. `leaderboard_month_prizes` in
 * `supabase/migrations/20261107110000_monthly_leaderboard_awards.sql` holds
 * the real amounts and `settle_leaderboard_month()` reads them; nothing here
 * can credit anybody. This table exists so a screen can say what a place is
 * worth BEFORE it has been won, which is the only reason a player cares.
 *
 * The two are held in step by `monthlyLeaderboardAwards.test.ts`, which
 * reads the migration. A number changed here and not there is a screen that
 * lies about the prize — the same failure the daily ladder had for months
 * (see REWARDS.DAILY_REWARDS in config/rewardConfig.ts).
 *
 * ── why the board and the prize disagree ──
 *
 * The RATING screen ranks by `profiles.coins`, a current balance. The award
 * is decided on coins EARNED during the month, from the `currency_grants`
 * ledger. They are deliberately different measures:
 *
 *   * Paying the top of a balance board makes the leader's lead permanent —
 *     the prize for being richest is more riches.
 *   * A balance board is a hoarding contest. Somebody who plays every day
 *     and spends on power-ups ranks below somebody who sat on their pile.
 *   * Earnings reset every month, so last month's win is worth nothing this
 *     month and everybody starts level.
 *
 * Coins that were BOUGHT — a shop pack, a gem exchange — are not earnings,
 * or first place would cost 24 gems. Nor is the award itself, or a winner
 * would partly win because they won.
 */

export type AwardScope = "global" | "country";

export interface MonthlyPrize {
  scope: AwardScope;
  rank: 1 | 2 | 3;
  coins: number;
  gems: number;
}

/**
 * Global pays more than a country board because it is a far bigger pond.
 * The gems barely move — they are the recognition, and 1st is 1st wherever
 * you won it — while the coins carry the difference.
 */
export const MONTHLY_PRIZES: MonthlyPrize[] = [
  { scope: "global", rank: 1, coins: 15000, gems: 3 },
  { scope: "global", rank: 2, coins: 5000, gems: 2 },
  { scope: "global", rank: 3, coins: 1500, gems: 1 },
  { scope: "country", rank: 1, coins: 5000, gems: 3 },
  { scope: "country", rank: 2, coins: 1500, gems: 2 },
  { scope: "country", rank: 3, coins: 500, gems: 1 },
];

export function monthlyPrize(scope: AwardScope, rank: number): MonthlyPrize | null {
  return MONTHLY_PRIZES.find((p) => p.scope === scope && p.rank === rank) ?? null;
}

/** 🥇🥈🥉 — the medal for a place, or nothing for a place that has none. */
export function medalForRank(rank: number): string {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
}

/**
 * The month an award is for, as the row stores it: the first day of it.
 *
 * A date rather than a string so it sorts, and UTC so that the month a
 * trophy is labelled with does not depend on which side of midnight the
 * person reading it is standing.
 */
export function monthPeriod(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** The month currently being played for — the one that has not closed yet. */
export function currentPeriod(): string {
  return monthPeriod();
}

/**
 * "September 2026", in the language being read.
 *
 * Built from the period string rather than a Date the caller made, because
 * `new Date("2026-09-01")` is midnight UTC and prints as August in every
 * timezone west of London.
 */
export function formatPeriod(period: string, locale: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
