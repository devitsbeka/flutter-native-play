import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { toast } from "sonner";

const MAX_FREE_PLAYS = 5;
const PLAYS_PER_AD = 2;

interface DailyPlaysData {
  id: string;
  user_id: string;
  plays_used: number;
  plays_from_ads: number;
  play_date: string;
}

export function useDailyPlays() {
  const { user } = useAuth();
  const { isVip, loading: vipLoading } = useVipStatus();
  const [dailyPlays, setDailyPlays] = useState<DailyPlaysData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  // Calculate remaining plays
  const totalPlaysAvailable = MAX_FREE_PLAYS + (dailyPlays?.plays_from_ads || 0);
  const playsUsed = dailyPlays?.plays_used || 0;
  const playsRemaining = Math.max(0, totalPlaysAvailable - playsUsed);
  const canPlay = isVip || playsRemaining > 0;

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
      return true;
    } catch (error) {
      console.error("Error recording play:", error);
      return false;
    }
  }, [user, isVip, playsRemaining, playsUsed, today]);

  const watchAdForPlays = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Simulate ad watching (in real app, this would trigger actual ad)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newPlaysFromAds = (dailyPlays?.plays_from_ads || 0) + PLAYS_PER_AD;
      
      const { error } = await supabase
        .from("user_daily_plays")
        .update({ 
          plays_from_ads: newPlaysFromAds,
          last_ad_watched_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("play_date", today);

      if (error) throw error;

      setDailyPlays(prev => prev ? { ...prev, plays_from_ads: newPlaysFromAds } : null);
      toast.success(`+${PLAYS_PER_AD} თამაში მიღებულია!`);
      return true;
    } catch (error) {
      console.error("Error adding plays from ad:", error);
      toast.error("რეკლამის დამუშავება ვერ მოხერხდა");
      return false;
    }
  }, [user, dailyPlays, today]);

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
  };
}
