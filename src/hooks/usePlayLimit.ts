import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";
import {
  MAX_FREE_PLAYS,
  resolvePlayLimit,
  spendPlayFromWindow,
  type PlayWindow,
} from "@/utils/playLimit";

/**
 * Five free games per three hours for non-PRO users.
 *
 * THE OLD RULE, which is what the "I only had 1 game instead of 5" report was
 * actually describing: playsRemaining was `5 - profile.games_played`, and
 * games_played is a lifetime statistic that is never reset. So it was five
 * games FOR LIFE, after which a single play regenerated every three hours.
 * Anyone past their lifetime five was permanently pinned at 0/5 with one
 * play to their name - which is exactly the symptom that was reported.
 *
 * THE NEW RULE lives in its own window columns (free_plays_used,
 * free_plays_window_start) so games_played stays a statistic, and the count
 * is only ever moved by consume_free_play() - a phone-editable quota is not
 * a quota, and the column grants refuse client writes anyway.
 *
 * BOTH RULES SHIP HERE ON PURPOSE. The migration is applied to the database
 * separately from the front-end deploy, so for some window of time one will
 * be live without the other. If the columns are not there yet this hook
 * detects that on its first read and keeps the old behaviour; when they
 * appear it switches over on the next load. Neither ordering can leave
 * players unable to start a game.
 */
export function usePlayLimit() {
  const { profile, user } = useAuth();
  const { isVip, loading: vipLoading } = useVipStatus();
  const [now, setNow] = useState(Date.now());

  // Local flag to immediately block regen after consumption,
  // preventing race condition before DB realtime update arrives
  const [regenConsumedLocally, setRegenConsumedLocally] = useState(false);
  const prevLastRegenAtRef = useRef<string | null>(null);

  // null while unknown - see the "BOTH RULES" note above. `used` and `start`
  // are the server's last word; consumePlay advances them optimistically so
  // two quick taps cannot spend the same play twice.
  const [playWindow, setPlayWindow] = useState<PlayWindow | null>(null);
  const [windowSupported, setWindowSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setPlayWindow(null);
      setWindowSupported(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("free_plays_used, free_plays_window_start" as "*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // 42703 = undefined_column, i.e. the migration has not run here yet
        setWindowSupported(false);
        return;
      }
      const row = data as { free_plays_used?: number; free_plays_window_start?: string | null } | null;
      setWindowSupported(true);
      setPlayWindow({
        used: row?.free_plays_used ?? 0,
        start: row?.free_plays_window_start ? Date.parse(row.free_plays_window_start) : null,
      });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const windowMode = windowSupported === true;

  // Regeneration inputs (legacy rule only)
  const profileRegenAt = (profile as any)?.last_play_regen_at ?? null;
  const lastRegenAt = profileRegenAt ? new Date(profileRegenAt).getTime() : null;

  // All the arithmetic lives in playLimit.ts — see there for both rules.
  const {
    playsUsed,
    playsRemaining,
    freeGamesExhausted,
    regenPlayAvailable,
    canPlay,
    timeUntilNextPlay,
  } = resolvePlayLimit({
    now,
    isVip,
    windowMode,
    playWindow,
    gamesPlayed: profile?.games_played || 0,
    lastRegenAt,
    regenConsumedLocally,
  });

  // Tick every minute so countdown updates - only when a countdown is actually shown
  useEffect(() => {
    if (isVip || !freeGamesExhausted) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [isVip, freeGamesExhausted]);

  // Reset local consumed flag when profile updates with new last_play_regen_at
  // (realtime subscription delivered the DB change)
  useEffect(() => {
    if (profileRegenAt !== prevLastRegenAtRef.current) {
      prevLastRegenAtRef.current = profileRegenAt;
      setRegenConsumedLocally(false);
    }
  }, [profileRegenAt]);

  // Use a regenerated play: sets last_play_regen_at to now
  // Immediately updates local state to prevent race condition
  const useRegenPlay = useCallback(async () => {
    if (!user) return false;
    // Immediately block further regen plays locally
    setRegenConsumedLocally(true);
    const { error } = await supabase
      .from("profiles")
      .update({ last_play_regen_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);
    if (error) {
      console.error("[usePlayLimit] Failed to update regen timer:", error);
      // Rollback local state on failure
      setRegenConsumedLocally(false);
      return false;
    }
    return true;
  }, [user]);

  /**
   * Spend one play. Call this once at the point a game actually starts.
   *
   * Never returns false because of a network or RPC failure - a player who
   * has already been told they can play must not be stopped by our
   * bookkeeping. The server is still the one counting, so a dropped call
   * costs at most one uncounted game.
   */
  const consumePlay = useCallback(async () => {
    if (!user || isVip) return true;

    if (windowMode) {
      // Optimistic, before the await: two fast taps must not spend one play
      setPlayWindow(prev => spendPlayFromWindow(prev, Date.now()));

      // Cast rather than regenerate the whole database type file for one
      // function the client only ever calls with no arguments.
      const client = supabase as unknown as {
        rpc: (fn: string) => Promise<{
          data: { allowed?: boolean; used?: number; window_start?: string } | null;
          error: { message: string } | null;
        }>;
      };
      const { data: result, error } = await client.rpc("consume_free_play");
      if (error) {
        console.error("[usePlayLimit] consume_free_play failed:", error);
        return true;
      }
      if (result?.window_start) {
        setPlayWindow({
          used: result.used ?? 0,
          start: Date.parse(result.window_start),
        });
      }
      return result?.allowed !== false;
    }

    // Legacy rule: only the exhausted-plus-regen case costs anything.
    if (freeGamesExhausted && regenPlayAvailable) return useRegenPlay();
    return true;
  }, [user, isVip, windowMode, freeGamesExhausted, regenPlayAvailable, useRegenPlay]);

  return {
    playsRemaining,
    playsUsed,
    maxPlays: MAX_FREE_PLAYS,
    canPlay,
    isVip,
    // Signed-out visitors never probe the columns, so `null` must not pin
    // them in a permanent loading state.
    loading: vipLoading || (!!user && windowSupported === null),
    regenPlayAvailable,
    timeUntilNextPlay,
    useRegenPlay,
    consumePlay,
    /** True once the per-window quota is the rule in force. */
    windowMode,
    freeGamesExhausted,
  };
}

export { MAX_FREE_PLAYS };
