import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * A room round, settled as place prizes.
 *
 * Nobody pays in and nobody loses coins. The house pays first, second and
 * third (REWARDS.ROOM_PLACE_PRIZES; only first at two players), tied seats
 * sharing their places — see supabase/migrations/20261108100000_no_wagering.sql.
 *
 * The amounts are not sent. `settle_room_round` ranks the players off their
 * live scores and writes the ledger — once per round, however many devices
 * call it — and hands back what was paid. That is deliberate: a client that
 * names its own prize is a client that can mint.
 *
 * Rounds settled before that migration still carry a stake in their ledger.
 * Only the prize is ever read from it: this screen never draws a debit.
 */

/** What `settle_room_round` sends back (and `room_round_ledger`, in part). */
interface RoomRoundResponse {
  paid?: number;
  players?: number;
  coins?: number;
  reason?: string;
  deltas?: { user_id: string; staked?: number; place?: number; prize?: number }[];
}

/** One seat's line in the settlement: what the house paid it. */
export interface RoomPrizeLine {
  prize: number;
}

export interface RoomPrizeSettlement {
  /** What this player was paid. Never negative. */
  applied: number;
  /**
   * Every seat's line, by user id — so the podium can say what each place
   * won, not only what this device's player did. Empty when the server
   * reported nothing (the function is missing).
   */
  lines: Record<string, RoomPrizeLine>;
  /** True when the round settled nothing because the function is missing. */
  unsettled: boolean;
  reason: string;
}

const NOTHING: RoomPrizeSettlement = { applied: 0, lines: {}, unsettled: true, reason: "no_room" };

/** The server's deltas, folded to one prize line per seat. */
function foldLines(deltas: RoomRoundResponse["deltas"]): Record<string, RoomPrizeLine> {
  const lines: Record<string, RoomPrizeLine> = {};
  for (const d of deltas ?? []) {
    const line = lines[d.user_id] ?? { prize: 0 };
    line.prize += Math.max(0, d.prize ?? 0);
    lines[d.user_id] = line;
  }
  return lines;
}

export function useRoomPrizes() {
  const { user, profile, setProfileLocal } = useAuth();

  const settleRoomRound = useCallback(
    async (roomId: string, gameId: string | null): Promise<RoomPrizeSettlement> => {
      if (!user || !roomId || !gameId) return NOTHING;

      // Cast rather than regenerate the database type file — see rule 1 in
      // CLAUDE.md for what regenerating it deletes.
      const client = supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: RoomRoundResponse | null;
          error: { message: string; code?: string } | null;
        }>;
      };

      try {
        const { data, error } = await client.rpc("settle_room_round", {
          p_room_id: roomId,
          p_game_id: gameId,
        });

        if (error) {
          // PGRST202: the function is not in the schema cache. Only that
          // code — a permission error that names the function is an error.
          const missing = error.code === "PGRST202";
          if (!missing) console.error("[useRoomPrizes] settle_room_round failed:", error);
          return { ...NOTHING, reason: missing ? "not_deployed" : "error" };
        }

        // Read BEFORE setProfileLocal below, for the fallback further down.
        const balanceBefore = profile?.coins;
        if (typeof data?.coins === "number") setProfileLocal({ coins: data.coins });

        const lines = foldLines(data?.deltas);

        // A round settles once, on whichever device asks first; the others
        // are told `already_settled` with the ledger's lines. If a server
        // answers without them, a rise in the balance is the best account of
        // this player's prize — and only a rise: nothing here costs coins.
        let applied = lines[user.id]?.prize ?? 0;
        if (
          !lines[user.id] &&
          data?.reason === "already_settled" &&
          typeof data.coins === "number" &&
          typeof balanceBefore === "number" &&
          data.coins > balanceBefore
        ) {
          applied = data.coins - balanceBefore;
        }

        return {
          applied,
          lines,
          unsettled: false,
          reason: data?.reason ?? "settled",
        };
      } catch (err) {
        console.error("[useRoomPrizes] settle_room_round threw:", err);
        return { ...NOTHING, reason: "error" };
      }
    },
    [user, profile?.coins, setProfileLocal],
  );

  /**
   * The ledger of a round, READ — nothing moves.
   *
   * room_round_ledger answers `{ settled, deltas }` for a round this player
   * sat in. The results screen's round-by-round list reads every earlier
   * round of the match through this, so looking never settles a round other
   * players have not finished.
   */
  const readRoomRound = useCallback(
    async (gameId: string): Promise<RoomPrizeSettlement> => {
      if (!user || !gameId) return NOTHING;
      const client = supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: (RoomRoundResponse & { settled?: boolean }) | null;
          error: { message: string; code?: string } | null;
        }>;
      };
      try {
        const { data, error } = await client.rpc("room_round_ledger", { p_game_id: gameId });
        if (error) {
          const missing = error.code === "PGRST202";
          if (!missing) console.error("[useRoomPrizes] room_round_ledger failed:", error);
          return { ...NOTHING, reason: missing ? "not_deployed" : "error" };
        }
        const lines = foldLines(data?.deltas);
        return {
          applied: lines[user.id]?.prize ?? 0,
          lines,
          unsettled: !data?.settled,
          reason: data?.settled ? "settled" : "unsettled",
        };
      } catch (err) {
        console.error("[useRoomPrizes] room_round_ledger threw:", err);
        return { ...NOTHING, reason: "error" };
      }
    },
    [user],
  );

  return { settleRoomRound, readRoomRound };
}
