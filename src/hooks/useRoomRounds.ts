import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RoomPotLine, RoomPotSettlement } from "@/hooks/useRoomPot";
import type { MatchRound } from "@/hooks/useMatchRounds";

/** One round of the room, with the game it was played in. */
export interface RoomRound extends MatchRound {
  /** room_games.game_number — which match of the room this round belongs to. */
  game: number;
}

/** What a stored question carries about its category (TriviaQuestion, useTrivia). */
interface StoredQuestion {
  category?: string | null;
  categoryIconSlug?: string | null;
  iconSlug?: string | null;
  questionIconSlug?: string | null;
}

interface StoredScore {
  user_id?: string;
  score?: number;
}

/**
 * Every round the room has ever played, game by game: which category, what
 * the pot was, and who won and who lost it.
 *
 * useMatchRounds tells the CURRENT match. The results screen used to stop
 * there, so a room on its third game had a summary that started at game
 * three (owner: "show all rounds pot not only last game and show all coins
 * users won or lose, like summery of the all games"). This is the same
 * read over all of room_games for the room rather than one match's ids —
 * the category and scores off each row, the money off the ledger through
 * settle_room_round, which is idempotent and reports every seat's stake and
 * prize back for a round already settled. The client still names no
 * amounts.
 *
 * In play order, oldest first; `game` and `number` say where each one sat.
 * Null until read, and null when there is nothing to tell: no room, or no
 * pot lines yet for the current round (the money is still settling, and a
 * summary that read before it would miss the round that just happened).
 */
export function useRoomRounds(
  roomId: string | null | undefined,
  ready: boolean,
  settleRoomRound: (roomId: string, gameId: string | null) => Promise<RoomPotSettlement>,
): RoomRound[] | null {
  const [rounds, setRounds] = useState<RoomRound[] | null>(null);

  useEffect(() => {
    if (!roomId || !ready) {
      setRounds(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: rows } = await supabase
        .from("room_games")
        .select("id, game_number, questions_data, player_scores, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (cancelled || !rows) return;
      const settlements = await Promise.all(rows.map((r) => settleRoomRound(roomId, r.id)));
      if (cancelled) return;

      // Round numbers restart with each game.
      const seenInGame = new Map<number, number>();
      const built: RoomRound[] = [];
      rows.forEach((row, i) => {
          const questions = (Array.isArray(row.questions_data) ? row.questions_data : []) as StoredQuestion[];
          const first = questions[0];
          const scores = (Array.isArray(row.player_scores) ? row.player_scores : []) as StoredScore[];
          const scoreOf = new Map(scores.map((s) => [s.user_id ?? "", s.score ?? 0]));
          const lines: Record<string, RoomPotLine> = settlements[i]?.lines ?? {};
          const seats = Object.entries(lines).map(([user_id, line]) => ({
            user_id,
            net: line.net,
            score: scoreOf.has(user_id) ? scoreOf.get(user_id)! : null,
          }));
          // The winner first: by what they took from the pot, then by score.
          seats.sort((a, b) => b.net - a.net || (b.score ?? 0) - (a.score ?? 0));
          // A row nobody played — a round start that lost the race to
          // another client's, which cannot delete the row it made (RLS) —
          // has no seats and is not a round anyone needs told about.
          if (seats.length === 0) return;
          const game = row.game_number ?? 1;
          const number = (seenInGame.get(game) ?? 0) + 1;
          seenInGame.set(game, number);
          built.push({
            id: row.id,
            game,
            number,
            categoryName: first?.category ?? null,
            iconSlug: first?.categoryIconSlug ?? first?.iconSlug ?? first?.questionIconSlug ?? null,
            pot: settlements[i]?.pot ?? 0,
            seats,
          });
      });
      setRounds(built);
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, ready, settleRoomRound]);

  return rounds;
}
