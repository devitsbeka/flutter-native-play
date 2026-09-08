import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { REWARDS } from "@/config/rewardConfig";

/**
 * A room round, settled as a pot.
 *
 * Everybody at the table puts {@link REWARDS.GAME_STAKE} in and the table is
 * what gets paid out: winner takes all at two players, 70/20/10 to first,
 * second and third at three or more. The same shape as a quick game, which
 * costs 500 to lose and pays 500 to win.
 *
 * The amounts are not sent. `settle_room_round` collects the stakes, ranks
 * the players off their live scores, splits the pot and writes the ledger —
 * once per round, however many devices call it — and hands back what
 * actually moved for the caller. That is deliberate: a client that names its
 * own prize is a client that can mint, which is the hole the old room payout
 * left open (see supabase/migrations/20261015100000_room_round_pot.sql).
 */

/** What `settle_room_round` sends back. */
interface RoomPotResponse {
  pot?: number;
  paid?: number;
  players?: number;
  coins?: number;
  reason?: string;
  deltas?: { user_id: string; staked?: number; place?: number; prize?: number }[];
}

export interface RoomPotSettlement {
  /** Signed, from this player's seat: prize minus stake. */
  applied: number;
  /** Everything staked into this round. */
  pot: number;
  /** True when the round settled nothing because the function is missing. */
  unsettled: boolean;
  reason: string;
}

const NOTHING: RoomPotSettlement = { applied: 0, pot: 0, unsettled: true, reason: "no_room" };

export function useRoomPot() {
  const { user, setProfileLocal } = useAuth();

  const settleRoomRound = useCallback(
    async (roomId: string, gameId: string | null): Promise<RoomPotSettlement> => {
      if (!user || !roomId || !gameId) return NOTHING;

      // Cast rather than regenerate the database type file — see rule 1 in
      // CLAUDE.md for what regenerating it deletes.
      const client = supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: RoomPotResponse | null;
          error: { message: string; code?: string } | null;
        }>;
      };

      try {
        const { data, error } = await client.rpc("settle_room_round", {
          p_room_id: roomId,
          p_game_id: gameId,
        });

        if (error) {
          // PGRST202: the function is not in the schema cache, i.e. the
          // migration has not reached this project yet. The caller keeps the
          // old placement payout for that case rather than paying nobody.
          const missing = error.code === "PGRST202" || /settle_room_round/i.test(error.message);
          if (!missing) console.error("[useRoomPot] settle_room_round failed:", error);
          return { ...NOTHING, reason: missing ? "not_deployed" : "error" };
        }

        if (typeof data?.coins === "number") setProfileLocal({ coins: data.coins });

        // What moved for THIS player: their prize, less the stake they paid.
        const mine = (data?.deltas ?? []).filter((d) => d.user_id === user.id);
        const staked = mine.reduce((sum, d) => sum + (d.staked ?? 0), 0);
        const prize = mine.reduce((sum, d) => sum + (d.prize ?? 0), 0);

        return {
          applied: prize - staked,
          pot: data?.pot ?? 0,
          unsettled: false,
          reason: data?.reason ?? "settled",
        };
      } catch (err) {
        console.error("[useRoomPot] settle_room_round threw:", err);
        return { ...NOTHING, reason: "error" };
      }
    },
    [user, setProfileLocal],
  );

  return { settleRoomRound, stakeAmount: REWARDS.GAME_STAKE };
}
