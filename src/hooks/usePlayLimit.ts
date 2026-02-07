import { useState, useEffect, useCallback } from "react";
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

  // Tick every minute so countdown updates
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const gamesPlayed = profile?.games_played || 0;
  const playsRemaining = Math.max(0, MAX_FREE_PLAYS - gamesPlayed);
  const freeGamesExhausted = playsRemaining <= 0;

  // Regeneration logic
  const lastRegenAt = (profile as any)?.last_play_regen_at
    ? new Date((profile as any).last_play_regen_at).getTime()
    : null;

  // If user has exhausted free games and never used regen, they get one immediately
  // (last_play_regen_at is null means timer hasn't started yet = first regen is free)
  const regenPlayAvailable = freeGamesExhausted && !isVip && (
    lastRegenAt === null || (now - lastRegenAt) >= REGEN_MS
  );

  // Time until next play (only relevant when no regen play available and free games exhausted)
  let timeUntilNextPlay: string | null = null;
  if (freeGamesExhausted && !isVip && !regenPlayAvailable && lastRegenAt !== null) {
    const msRemaining = Math.max(0, REGEN_MS - (now - lastRegenAt));
    const hoursLeft = Math.floor(msRemaining / (60 * 60 * 1000));
    const minutesLeft = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
    if (hoursLeft > 0) {
      timeUntilNextPlay = `${hoursLeft}სთ ${minutesLeft}წთ`;
    } else {
      timeUntilNextPlay = `${minutesLeft}წთ`;
    }
  }

  const canPlay = isVip || playsRemaining > 0 || regenPlayAvailable;

  // Use a regenerated play: sets last_play_regen_at to now
  const useRegenPlay = useCallback(async () => {
    if (!user) return false;
    const { error } = await supabase
      .from("profiles")
      .update({ last_play_regen_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);
    if (error) {
      console.error("[usePlayLimit] Failed to update regen timer:", error);
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
