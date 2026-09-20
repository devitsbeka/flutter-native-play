import { useCallback, useEffect, useState } from "react";
import { callRpc, selectRows } from "@/integrations/supabase/rpc";
import type { AwardScope } from "@/config/leaderboardMonthly";

export interface MonthlyAward {
  id: string;
  period: string;
  scope: AwardScope;
  country_code: string | null;
  rank: number;
  user_id: string;
  coins: number;
  gems: number;
  earned_coins: number;
  seen_at: string | null;
}

const COLUMNS = "id, period, scope, country_code, rank, user_id, coins, gems, earned_coins, seen_at";

/**
 * Settle whatever months have finished, once per app run.
 *
 * There is no scheduler on this database, so nothing fires on the first of
 * the month — `settle_leaderboard_month()` is what pays, and somebody has to
 * call it. It is idempotent, it takes an advisory lock so two people opening
 * the leaderboard together cannot both settle, and after the first call of a
 * month it does nothing but a primary-key lookup. So the leaderboard opening
 * is a fine place to trigger it, and the first player through the door after
 * a month ends settles it for everybody.
 *
 * Module-level rather than per-hook: several screens mount this, and there is
 * no reason for each of them to ask.
 */
let settlePromise: Promise<void> | null = null;

export function settleMonthsOnce(): Promise<void> {
  if (!settlePromise) {
    settlePromise = callRpc<{ settled: number; awarded: number }[]>("settle_leaderboard_month")
      .then(({ error }) => {
        if (error) {
          // Never fatal, and never shown. A failed settle means trophies are
          // late, not lost: the next caller settles the same months, and the
          // awards are decided from a ledger that does not move.
          console.warn("[month-awards] settle failed:", error.message);
        }
      })
      .catch((e) => console.warn("[month-awards] settle failed:", e));
  }
  return settlePromise;
}

/**
 * Somebody's leaderboard trophies, newest month first.
 *
 * Takes a user id rather than reading the session, because the public profile
 * shows another player's. Awards are world-readable for exactly that reason.
 */
export function useMonthlyAwards(userId?: string | null) {
  const [awards, setAwards] = useState<MonthlyAward[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAwards([]);
      setLoading(false);
      return;
    }

    // Settle first, so a player who opens their profile on the 1st sees last
    // month's trophy rather than an empty shelf that fills in later.
    await settleMonthsOnce();

    const { data, error } = await selectRows<MonthlyAward>("leaderboard_month_awards", (q) =>
      q.select(COLUMNS).eq("user_id", userId).order("period", { ascending: false }),
    );
    if (error) {
      console.warn("[month-awards] could not load awards:", error.message);
      setAwards([]);
    } else {
      setAwards(data ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * The trophy to celebrate: the newest one the player has not been shown.
   *
   * Marking it seen cannot cost anything — the prize was paid when the award
   * row was written, in the same transaction — so this is only about whether
   * the card has been opened.
   */
  const unseen = awards.find((a) => a.seen_at === null) ?? null;

  const markSeen = useCallback(async (awardId: string) => {
    setAwards((prev) =>
      prev.map((a) => (a.id === awardId ? { ...a, seen_at: new Date().toISOString() } : a)),
    );
    const { error } = await callRpc("mark_month_award_seen", { p_award_id: awardId });
    if (error) console.warn("[month-awards] could not mark seen:", error.message);
  }, []);

  return { awards, loading, unseen, markSeen, refresh };
}

/**
 * How many times a place has been taken, for "🥇 #1 Global ×3".
 *
 * Counted rather than stored: an award row is written once a month and never
 * changes, so the count is a fact about the rows and a second place to keep
 * it would only be a second place to get it wrong.
 */
export function countAwards(awards: MonthlyAward[], scope: AwardScope, rank: number): number {
  return awards.filter((a) => a.scope === scope && a.rank === rank).length;
}
