import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STREAK_BONUSES } from "@/hooks/useMissionStreak";

/**
 * The streak milestones and their coins, and whether each has been paid.
 *
 * The tiers are the app's own — STREAK_BONUSES from day three up — so the
 * page and the server say the same numbers; the migration that pays them
 * (claim_streak_milestone) carries the same table and a unit test holds
 * the two together.
 *
 * Paid ONCE per milestone per player, through a SECURITY DEFINER function
 * that checks the streak server-side and dedupes on the ledger. The client
 * cannot read currency_grants (no SELECT policy, by design), so "already
 * claimed" also comes back from the server rather than from a flag kept
 * here — a flag kept here is exactly what let earlier streak rewards be
 * banked twice.
 *
 * `available` is false when the functions are not deployed yet: migrations
 * go through Lovable (CLAUDE.md 4a), so the client has to cope with a
 * window in which the page exists and the payout does not. The rows still
 * render; a tap says why it cannot pay.
 */
export const STREAK_MILESTONES = STREAK_BONUSES
  .filter((tier) => tier.minStreak >= 3)
  .map((tier) => ({ days: tier.minStreak, coins: tier.coins }));

/** PostgREST's "no such function" — the migration has not been applied. */
const FUNCTION_MISSING = "PGRST202";

export function useStreakMilestones() {
  const { user, setProfileLocal } = useAuth();
  const [claimed, setClaimed] = useState<number[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setClaimed([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("streak_milestones_claimed");
    if (error) {
      if (error.code === FUNCTION_MISSING) setAvailable(false);
      else console.error("[streak] claimed lookup failed:", error);
      setLoading(false);
      return;
    }
    setClaimed((data as number[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Pay a reached milestone. Resolves to the coins awarded, or null. */
  const claim = useCallback(
    async (days: number): Promise<number | null> => {
      if (!user || claiming !== null) return null;
      setClaiming(days);
      try {
        const { data, error } = await supabase.rpc("claim_streak_milestone", { p_days: days });
        if (error) {
          if (error.code === FUNCTION_MISSING) setAvailable(false);
          throw error;
        }
        const row = (data as { coins_awarded: number; new_coins: number }[] | null)?.[0];
        if (!row) return null;
        setProfileLocal({ coins: row.new_coins });
        setClaimed((prev) => (prev.includes(days) ? prev : [...prev, days]));
        return row.coins_awarded;
      } catch (error) {
        console.error("[streak] claim failed:", error);
        return null;
      } finally {
        setClaiming(null);
      }
    },
    [user, claiming, setProfileLocal],
  );

  return { milestones: STREAK_MILESTONES, claimed, available, loading, claiming, claim, refresh };
}
