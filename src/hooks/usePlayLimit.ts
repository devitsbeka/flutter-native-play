import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";

const MAX_FREE_PLAYS = 5; // Lifetime limit for non-PRO users

export function usePlayLimit() {
  const { profile } = useAuth();
  const { isVip, loading: vipLoading } = useVipStatus();
  
  // Total games played is already tracked in profiles.games_played
  const gamesPlayed = profile?.games_played || 0;
  const playsRemaining = Math.max(0, MAX_FREE_PLAYS - gamesPlayed);
  const canPlay = isVip || playsRemaining > 0;
  
  return {
    playsRemaining,
    playsUsed: gamesPlayed,
    maxPlays: MAX_FREE_PLAYS,
    canPlay,
    isVip,
    loading: vipLoading,
  };
}

export { MAX_FREE_PLAYS };
