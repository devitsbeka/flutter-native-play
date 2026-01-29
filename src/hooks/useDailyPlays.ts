import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { toast } from "sonner";
import { REWARDS } from "@/config/rewardConfig";

const MAX_FREE_PLAYS = 5;
const PLAYS_PER_AD = REWARDS.PLAYS_PER_AD;
const PLAY_REGEN_HOURS = REWARDS.PLAY_REGEN_HOURS;
const PLAY_REGEN_MAX = REWARDS.PLAY_REGEN_MAX;
const MAX_ADS_PER_DAY = REWARDS.MAX_ADS_PER_DAY;

interface DailyPlaysData {
  id: string;
  user_id: string;
  plays_used: number;
  plays_from_ads: number;
  plays_regenerated: number;
  last_regen_at: string | null;
  ads_watched_today: number;
  play_date: string;
}

export function useDailyPlays() {
  const { user } = useAuth();
  const { isVip, loading: vipLoading } = useVipStatus();
  const [dailyPlays, setDailyPlays] = useState<DailyPlaysData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  // Calculate regenerated plays based on time elapsed
  const calculateRegenPlays = useCallback((lastRegenAt: string | null): number => {
    if (!lastRegenAt) return 0;
    
    const now = new Date();
    const lastRegen = new Date(lastRegenAt);
    const hoursElapsed = (now.getTime() - lastRegen.getTime()) / (1000 * 60 * 60);
    const newPlays = Math.floor(hoursElapsed / PLAY_REGEN_HOURS);
    
    return Math.min(newPlays, PLAY_REGEN_MAX);
  }, []);

  // Calculate time until next regeneration
  const getTimeUntilNextRegen = useCallback((): string | null => {
    if (!dailyPlays?.last_regen_at) return null;
    
    const lastRegen = new Date(dailyPlays.last_regen_at);
    const nextRegen = new Date(lastRegen.getTime() + PLAY_REGEN_HOURS * 60 * 60 * 1000);
    const now = new Date();
    
    if (now >= nextRegen) return "ახლავე";
    
    const diff = nextRegen.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}სთ ${minutes}წთ`;
  }, [dailyPlays]);

  // Calculate remaining plays
  const regenPlays = dailyPlays?.last_regen_at 
    ? calculateRegenPlays(dailyPlays.last_regen_at) 
    : (dailyPlays?.plays_regenerated || 0);
  
  const totalPlaysAvailable = MAX_FREE_PLAYS + (dailyPlays?.plays_from_ads || 0) + regenPlays;
  const playsUsed = dailyPlays?.plays_used || 0;
  const playsRemaining = Math.max(0, totalPlaysAvailable - playsUsed);
  const canPlay = isVip || playsRemaining > 0;
  const adsWatchedToday = dailyPlays?.ads_watched_today || 0;
  const canWatchAd = adsWatchedToday < MAX_ADS_PER_DAY;

  // Fetch daily plays
  useEffect(() => {
    if (!user) {
      setDailyPlays(null);
      setLoading(false);
      return;
    }

    const fetchDailyPlays = async () => {
      try {
        const { data, error } = await supabase
          .from("user_daily_plays")
          .select("*")
          .eq("user_id", user.id)
          .eq("play_date", today)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          setDailyPlays(data as DailyPlaysData);
        } else {
          // Create new record for today
          const { data: newData, error: insertError } = await supabase
            .from("user_daily_plays")
            .insert({
              user_id: user.id,
              play_date: today,
              plays_used: 0,
              plays_from_ads: 0,
              plays_regenerated: 0,
              ads_watched_today: 0,
              last_regen_at: null,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          setDailyPlays(newData as DailyPlaysData);
        }
      } catch (error) {
        console.error("Error fetching daily plays:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyPlays();
  }, [user, today]);

  // Start regeneration timer when plays run out
  const startRegenTimer = useCallback(async () => {
    if (!user || !dailyPlays) return;
    
    // Only start timer if we don't have one and plays are used up
    if (dailyPlays.last_regen_at || playsRemaining > 0) return;
    
    try {
      const { error } = await supabase
        .from("user_daily_plays")
        .update({ last_regen_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("play_date", today);

      if (error) throw error;

      setDailyPlays(prev => prev ? { ...prev, last_regen_at: new Date().toISOString() } : null);
    } catch (error) {
      console.error("Error starting regen timer:", error);
    }
  }, [user, dailyPlays, playsRemaining, today]);

  const recordPlay = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    if (isVip) return true; // VIP doesn't need to record plays

    if (playsRemaining <= 0) {
      toast.error("თამაშების ლიმიტი ამოიწურა!");
      return false;
    }

    try {
      const newPlaysUsed = playsUsed + 1;
      
      const { error } = await supabase
        .from("user_daily_plays")
        .update({ plays_used: newPlaysUsed })
        .eq("user_id", user.id)
        .eq("play_date", today);

      if (error) throw error;

      setDailyPlays(prev => prev ? { ...prev, plays_used: newPlaysUsed } : null);
      
      // Start regeneration timer if this was the last play
      if (newPlaysUsed >= totalPlaysAvailable) {
        await startRegenTimer();
      }
      
      return true;
    } catch (error) {
      console.error("Error recording play:", error);
      return false;
    }
  }, [user, isVip, playsRemaining, playsUsed, today, totalPlaysAvailable, startRegenTimer]);

  const watchAdForPlays = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    if (!canWatchAd) {
      toast.error("დღეს რეკლამების ლიმიტი ამოიწურა");
      return false;
    }

    try {
      // Simulate ad watching (in real app, this would trigger actual ad)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newPlaysFromAds = (dailyPlays?.plays_from_ads || 0) + PLAYS_PER_AD;
      const newAdsWatched = adsWatchedToday + 1;
      
      const { error } = await supabase
        .from("user_daily_plays")
        .update({ 
          plays_from_ads: newPlaysFromAds,
          ads_watched_today: newAdsWatched,
          last_ad_watched_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("play_date", today);

      if (error) throw error;

      setDailyPlays(prev => prev ? { 
        ...prev, 
        plays_from_ads: newPlaysFromAds,
        ads_watched_today: newAdsWatched,
      } : null);
      
      toast.success(`+${PLAYS_PER_AD} თამაში მიღებულია!`);
      return true;
    } catch (error) {
      console.error("Error adding plays from ad:", error);
      toast.error("რეკლამის დამუშავება ვერ მოხერხდა");
      return false;
    }
  }, [user, dailyPlays, today, canWatchAd, adsWatchedToday]);

  const getTimeUntilReset = (): string => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}სთ ${minutes}წთ`;
  };

  return {
    playsRemaining,
    playsUsed,
    maxPlays: totalPlaysAvailable,
    canPlay,
    isVip,
    loading,
    vipLoading,
    recordPlay,
    watchAdForPlays,
    getTimeUntilReset,
    getTimeUntilNextRegen,
    canWatchAd,
    adsWatchedToday,
    maxAdsPerDay: MAX_ADS_PER_DAY,
    regenPlays,
  };
}
