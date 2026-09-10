import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MatchInfo } from "@/hooks/useMatchInfo";
import type { RoomPotLine, RoomPotSettlement } from "@/hooks/useRoomPot";

/** One seat's line in one round: what moved for them, and what they scored. */
export interface MatchRoundSeat {
  user_id: string;
  /** prize − stake, signed. */
  net: number;
  score: number | null;
}

/** One round of the match, as the results screen tells it. */
export interface MatchRound {
  id: string;
  /** 1-based, in play order. */
  number: number;
  /** The category's stored name — whatever language the host's picker was showing. */
  categoryName: string | null;
  iconSlug: string | null;
  /** Everything staked into the round. */
  pot: number;
  /** Every seat, the round's winner first. */
  seats: MatchRoundSeat[];
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
 * Every round of the match, round by round: which category, what the pot
 * was, and who won and who lost it.
 *
 * The results screen said what THIS round paid, under the podium, and —
 * once the last round was in — a single total per seat over the match.
 * Between the two there was nothing: a match of three rounds ended on a
 * screen that could not say what happened in round two (owner: "show what
 * happened in rounds, per match has its pot - we need to show it clear
 * who won who lose per round").
 *
 * Two reads, both of things this screen already trusts. The round rows
 * come off room_games (useMatchInfo lists the match's rounds), whose
 * questions_data names the category the round was played in and whose
 * player_scores says who scored what. The money comes off the ledger
 * through room_round_ledger, a READ: it reports every seat's stake and
 * prize for a round that has settled and nothing for one that has not.
 * This used to call settle_room_round per round, which settles — so
 * opening the results of round three settled round two for anyone who had
 * not finished it, through a screen that was only meant to look. The
 * client still names no amounts.
 *
 * Null until read, and null when there is nothing to tell: no match, or
 * no pot lines yet for the current round (the money is still settling).
 */
export function useMatchRounds(
  roomId: string | null | undefined,
  matchInfo: MatchInfo | null,
  ready: boolean,
  readRoomRound: (gameId: string) => Promise<RoomPotSettlement>,
): MatchRound[] | null {
  const [rounds, setRounds] = useState<MatchRound[] | null>(null);
  // The ids as one string, so a re-render with the same rounds is not a re-read.
  const roundKey = matchInfo?.roundIds.join(",") ?? "";

  useEffect(() => {
    if (!roomId || !matchInfo || !ready || matchInfo.roundIds.length === 0) {
      setRounds(null);
      return;
    }
    let cancelled = false;
    const ids = matchInfo.roundIds;
    void (async () => {
      const [{ data: rows }, settlements] = await Promise.all([
        supabase
          .from("room_games")
          .select("id, questions_data, player_scores")
          .in("id", ids),
        Promise.all(ids.map((id) => readRoomRound(id))),
      ]);
      if (cancelled) return;
      const byId = new Map((rows ?? []).map((r) => [r.id, r]));
      setRounds(
        ids.map((id, i) => {
          const row = byId.get(id);
          const questions = (Array.isArray(row?.questions_data) ? row.questions_data : []) as StoredQuestion[];
          const first = questions[0];
          const scores = (Array.isArray(row?.player_scores) ? row.player_scores : []) as StoredScore[];
          const scoreOf = new Map(scores.map((s) => [s.user_id ?? "", s.score ?? 0]));
          const lines: Record<string, RoomPotLine> = settlements[i]?.lines ?? {};
          const seats: MatchRoundSeat[] = Object.entries(lines).map(([user_id, line]) => ({
            user_id,
            net: line.net,
            score: scoreOf.has(user_id) ? scoreOf.get(user_id)! : null,
          }));
          // The winner first: by what they took from the pot, then by score.
          seats.sort((a, b) => b.net - a.net || (b.score ?? 0) - (a.score ?? 0));
          return {
            id,
            number: i + 1,
            categoryName: first?.category ?? null,
            iconSlug: first?.categoryIconSlug ?? first?.iconSlug ?? first?.questionIconSlug ?? null,
            pot: settlements[i]?.pot ?? 0,
            seats,
          };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, roundKey, ready, readRoomRound]);

  return rounds;
}

/** Every seat's coins over the whole match, most first. */
export function matchTotals(rounds: MatchRound[]): { user_id: string; net: number }[] {
  const totals = new Map<string, number>();
  for (const round of rounds) {
    for (const seat of round.seats) totals.set(seat.user_id, (totals.get(seat.user_id) ?? 0) + seat.net);
  }
  return [...totals].map(([user_id, net]) => ({ user_id, net })).sort((a, b) => b.net - a.net);
}
