import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeaderboardScope = "local" | "global";

/**
 * The signed-in player's place on the fun leaderboard.
 *
 * Counted rather than read off a list, so it is correct however far down the
 * board the player sits: rank is "how many ranked players hold more coins,
 * plus one". Admin accounts are excluded, matching the public list — they
 * stay hidden there but would otherwise inflate everyone else's number.
 *
 * Lives here rather than in the Leaderboards page because the home screen
 * shows the same number next to the player's name. The query key is shared,
 * so opening the board after seeing the badge costs nothing.
 */
export function useMyLeaderboardRank(
  scope: LeaderboardScope,
  countryCode: string | null | undefined,
  myCoins: number | undefined,
  myUserId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ["fun-leaderboard-my-rank", scope, countryCode, myCoins, myUserId],
    queryFn: async (): Promise<number | null> => {
      const { data: adminData } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const adminIds = (adminData || []).map((r) => r.user_id);

      let query = supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .gt("coins", myCoins ?? 0);
      if (scope === "local" && countryCode) {
        query = query.eq("country_code", countryCode);
      }
      if (adminIds.length > 0) {
        query = query.not("user_id", "in", `(${adminIds.join(",")})`);
      }
      const { count } = await query;
      return (count ?? 0) + 1;
    },
    enabled: enabled && !!myUserId,
    staleTime: 60_000,
  });
}

/**
 * The board a player thinks of as "mine": their country's when we know it,
 * the global one otherwise. Same rule the Leaderboards page opens with, so
 * the badge on the home screen and the board itself agree.
 */
export const defaultScopeFor = (countryCode: string | null | undefined): LeaderboardScope =>
  countryCode ? "local" : "global";
