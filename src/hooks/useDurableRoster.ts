import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Who was in this game and what they scored — from presence, backed by the
 * table that survives it.
 *
 * Presence is volatile. A socket that went stale during the round leaves the
 * list empty or frozen, and every screen built straight off it draws a game
 * nobody played: on the controller's game-over, one player, zero points,
 * under a leaderboard heading — while the TV three feet away showed two
 * players and real scores. That is the "glitch when the round is over". It is
 * not a flash of the previous screen; it is the right screen with the wrong
 * roster, correcting itself a second later when presence recovers.
 *
 * `tv_players` is the durable record — scores are persisted there on every
 * answer — so it is the floor under presence rather than a replacement for
 * it: presence is fresher when it is alive, the table is right when it is not,
 * and the higher score wins because a score only ever goes up.
 *
 * TVResultsScreen worked this out first and carried the whole merge inline.
 * The controller's game-over did not, which is why one of them was right and
 * the other was not. Now they share it.
 */

export interface RosterPlayer {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  score: number;
  hasAnswered?: boolean;
  lastAnswerCorrect?: boolean | null;
  lastAnswer?: string | null;
  isHost?: boolean;
}

interface DbRosterRow {
  player_id: string;
  nickname: string;
  avatar_url: string | null;
  is_host: boolean;
  current_round_score: number | null;
}

/** The devices that join a session to show it, not to play it. */
const SYSTEM_IDS = ["TV_DISPLAY", "TV_MIRROR"];

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

/**
 * The merge, as a pure function so it can be tested without a database.
 *
 * ONE ROW PER PERSON, identified by normalised nickname: a re-bound device
 * leaves a second `tv_players` row and a second presence entry for the same
 * human, and a podium with the same face twice is worse than a missing one.
 * Across all of a person's entries, the best score wins.
 */
export function mergeRoster<T extends RosterPlayer>(
  presence: T[],
  dbRoster: DbRosterRow[],
): RosterPlayer[] {
  const bestByNickname = new Map<string, DbRosterRow>();
  for (const p of dbRoster) {
    const key = norm(p.nickname);
    const existing = bestByNickname.get(key);
    if (!existing || (p.current_round_score || 0) > (existing.current_round_score || 0)) {
      bestByNickname.set(key, p);
    }
  }

  const seen = new Set<string>();
  const merged = presence
    .filter((p) => {
      const key = norm(p.nickname);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p) => {
      const dbScore = bestByNickname.get(norm(p.nickname))?.current_round_score || 0;
      return dbScore > p.score ? { ...p, score: dbScore } : p;
    });

  // Anyone the table remembers who is no longer in presence at all — the
  // whole point of the fallback.
  const dbOnly: RosterPlayer[] = [...bestByNickname.values()]
    .filter((p) => !seen.has(norm(p.nickname)))
    .map((p) => ({
      id: p.player_id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      score: p.current_round_score || 0,
      hasAnswered: false,
      lastAnswerCorrect: null,
      lastAnswer: null,
      isHost: p.is_host,
    }));

  return [...merged, ...dbOnly];
}

/**
 * The roster for an end-of-game screen, highest score first.
 *
 * `sessionId` of "mock-session-id" is the showcase's stand-in and never hits
 * the network; presence alone stands for it.
 */
export function useDurableRoster<T extends RosterPlayer>(
  sessionId: string | null | undefined,
  presence: T[],
): RosterPlayer[] {
  const [dbRoster, setDbRoster] = useState<DbRosterRow[]>([]);

  useEffect(() => {
    if (!sessionId || sessionId === "mock-session-id") return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("tv_players")
        .select("player_id, nickname, avatar_url, is_host, current_round_score")
        .eq("tv_session_id", sessionId);
      if (cancelled || !data) return;
      setDbRoster(
        (data as DbRosterRow[]).filter(
          (p) => !SYSTEM_IDS.includes(p.player_id) && !SYSTEM_IDS.includes(p.nickname || ""),
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return mergeRoster(presence, dbRoster).sort((a, b) => b.score - a.score);
}
