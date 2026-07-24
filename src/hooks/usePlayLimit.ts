import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";
import { REWARDS } from "@/config/rewardConfig";

const MAX_FREE_PLAYS = 5; // Lifetime limit for non-PRO users
const REGEN_MS = REWARDS.PLAY_REGEN_HOURS * 60 * 60 * 1000; // 3 hours in ms

export function usePlayLimit() {
  const { profile, user } = useAuth();
  const { isVip, loading: vipLoading } = useVipStatus();
  const [now, setNow] = useState(Date.now());

  // Local flag to immediately block regen after consumption,
  // preventing race condition before DB realtime update arrives
  const [regenConsumedLocally, setRegenConsumedLocally] = useState(false);
  const prevLastRegenAtRef = useRef<string | null>(null);

  const gamesPlayed = profile?.games_played || 0;
  const playsRemaining = Math.max(0, MAX_FREE_PLAYS - gamesPlayed);
  const freeGamesExhausted = playsRemaining <= 0;

  // Tick every minute so countdown updates - only when a countdown is actually shown
  useEffect(() => {
    if (isVip || !freeGamesExhausted) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [isVip, freeGamesExhausted]);

  // Regeneration logic
  const profileRegenAt = (profile as any)?.last_play_regen_at ?? null;
  const lastRegenAt = profileRegenAt
    ? new Date(profileRegenAt).getTime()
    : null;

  // Reset local consumed flag when profile updates with new last_play_regen_at
  // (realtime subscription delivered the DB change)
  useEffect(() => {
    if (profileRegenAt !== prevLastRegenAtRef.current) {
      prevLastRegenAtRef.current = profileRegenAt;
      setRegenConsumedLocally(false);
    }
  }, [profileRegenAt]);

  // If user has exhausted free games and never used regen, they get one immediately
  // (last_play_regen_at is null means timer hasn't started yet = first regen is free)
  const regenPlayAvailable = freeGamesExhausted && !isVip && !regenConsumedLocally && (
    lastRegenAt === null || (now - lastRegenAt) >= REGEN_MS
  );

  // Time until next play (only relevant when no regen play available and free games exhausted)
  let timeUntilNextPlay: string | null = null;
  if (freeGamesExhausted && !isVip && !regenPlayAvailable && lastRegenAt !== null) {
    const msRemaining = Math.max(0, REGEN_MS - (now - lastRegenAt));
    const hoursLeft = Math.floor(msRemaining / (60 * 60 * 1000));
    const minutesLeft = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
    if (hoursLeft > 0) {
      timeUntilNextPlay = `${hoursLeft}h ${minutesLeft}m`;
    } else {
      timeUntilNextPlay = `${minutesLeft}m`;
    }
  }

  const canPlay = isVip || playsRemaining > 0 || regenPlayAvailable;

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

  return {
    playsRemaining,
    playsUsed: gamesPlayed,
    maxPlays: MAX_FREE_PLAYS,
    canPlay,
    isVip,
    loading: vipLoading,
    regenPlayAvailable,
    timeUntilNextPlay,
    useRegenPlay,
    freeGamesExhausted,
  };
}

export { MAX_FREE_PLAYS };
