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

/** One seat's line in the settlement: what they paid in, what they took out. */
export interface RoomPotLine {
  staked: number;
  prize: number;
  /** prize − staked, signed. */
  net: number;
}

export interface RoomPotSettlement {
  /** Signed, from this player's seat: prize minus stake. */
  applied: number;
  /** Everything staked into this round. */
  pot: number;
  /**
   * Every seat's line, by user id — so the podium can say what each place
   * won, not only what this device's player did. Empty when the server
   * reported nothing (the function is missing, or predates the migration
   * that reports the ledger back to every device).
   */
  lines: Record<string, RoomPotLine>;
  /** True when the round settled nothing because the function is missing. */
  unsettled: boolean;
  reason: string;
}

const NOTHING: RoomPotSettlement = { applied: 0, pot: 0, lines: {}, unsettled: true, reason: "no_room" };

/** The server's deltas, folded to one line per seat. */
function foldLines(deltas: RoomPotResponse["deltas"]): Record<string, RoomPotLine> {
  const lines: Record<string, RoomPotLine> = {};
  for (const d of deltas ?? []) {
    const line = lines[d.user_id] ?? { staked: 0, prize: 0, net: 0 };
    line.staked += d.staked ?? 0;
    line.prize += d.prize ?? 0;
    line.net = line.prize - line.staked;
    lines[d.user_id] = line;
  }
  return lines;
}

export function useRoomPot() {
  const { user, profile, setProfileLocal } = useAuth();

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

        // What the balance was before the server said what it is now. Read
        // BEFORE setProfileLocal below, for the fallback further down.
        const balanceBefore = profile?.coins;
        if (typeof data?.coins === "number") setProfileLocal({ coins: data.coins });

        const lines = foldLines(data?.deltas);

        // What moved for THIS player: their prize, less the stake they paid.
        //
        // A round settles once, on whichever device asks first; every other
        // device is told `already_settled`. The function reports the ledger
        // back on that answer now (the deltas-for-everyone migration), so
        // every screen has the lines. Until that migration is applied, a
        // second device gets no lines at all — and the winner's screen showed
        // nothing while the loser's showed the stake gone. In that one
        // window, the balance the server just
        // reported against the balance this device last knew is the best
        // account of what moved; it is only ever used when there is nothing
        // better, and only for this player's own line.
        let applied = lines[user.id]?.net ?? 0;
        if (
          !lines[user.id] &&
          data?.reason === "already_settled" &&
          typeof data.coins === "number" &&
          typeof balanceBefore === "number" &&
          data.coins !== balanceBefore
        ) {
          applied = data.coins - balanceBefore;
        }

        return {
          applied,
          pot: data?.pot ?? 0,
          lines,
          unsettled: false,
          reason: data?.reason ?? "settled",
        };
      } catch (err) {
        console.error("[useRoomPot] settle_room_round threw:", err);
        return { ...NOTHING, reason: "error" };
      }
    },
    [user, profile?.coins, setProfileLocal],
  );

  return { settleRoomRound, stakeAmount: REWARDS.GAME_STAKE };
}
