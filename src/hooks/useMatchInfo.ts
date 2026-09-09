import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MatchInfo {
  /** Which match of the room this round belongs to — room_games.game_number. */
  game: number;
  /** Which round of that match this is, from 1. */
  round: number;
  /** Every round of the match so far, in play order. */
  roundIds: string[];
}

/**
 * Which game a round belongs to, and which round of it this is — off
 * room_games, where every round of the room is a row and game_number is
 * the match it was played in (owner: "show which round it was - Game 1,
 * Round 2"). Null until read, and null for a room that predates the
 * numbering.
 *
 * Read by the results screen (the pill under the room's name, and the
 * match standings) and by the 3-2-1 countdown (owner: "show room icon +
 * title game-round info here too"), so the two say the same thing.
 */
export function useMatchInfo(roomId: string | null | undefined, gameId: string | null | undefined): MatchInfo | null {
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  useEffect(() => {
    if (!roomId || !gameId) {
      setMatchInfo(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("room_games")
        .select("id, game_number, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;
      const current = data.find((g) => g.id === gameId);
      if (!current) {
        setMatchInfo(null);
        return;
      }
      const rounds = data.filter((g) => g.game_number === current.game_number);
      setMatchInfo({
        game: current.game_number,
        round: rounds.findIndex((g) => g.id === gameId) + 1,
        roundIds: rounds.map((g) => g.id),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, gameId]);
  return matchInfo;
}
