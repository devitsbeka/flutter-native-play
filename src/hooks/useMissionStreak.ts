import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface MissionStreak {
  id: string;
  current_streak: number;
  best_streak: number;
  last_completion_date: string | null;
  total_completions: number;
  streak_bonus_claimed: boolean;
}

// Streak bonus rewards based on current streak
export const STREAK_BONUSES = [
  { minStreak: 1, coins: 25, gems: 0, xp: 15 },
  { minStreak: 3, coins: 50, gems: 1, xp: 30 },
  { minStreak: 5, coins: 75, gems: 2, xp: 50 },
  { minStreak: 7, coins: 100, gems: 3, xp: 75 },
  { minStreak: 14, coins: 150, gems: 5, xp: 100 },
  { minStreak: 21, coins: 200, gems: 8, xp: 150 },
  { minStreak: 30, coins: 300, gems: 15, xp: 250 },
];

export function getStreakBonus(streak: number) {
  // Find the highest applicable bonus
  const applicableBonus = STREAK_BONUSES
    .filter((b) => streak >= b.minStreak)
    .sort((a, b) => b.minStreak - a.minStreak)[0];

  return applicableBonus || { minStreak: 0, coins: 20, gems: 0, xp: 10 };
}

export function useMissionStreak() {
  const { user, profile, updateProfile, setProfileLocal } = useAuth();
  const [streak, setStreak] = useState<MissionStreak | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!user) {
      setStreak(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_mission_streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setStreak(data);
      } else {
        // Create initial streak record
        const { data: newStreak, error: insertError } = await supabase
          .from("user_mission_streaks")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setStreak(newStreak);
      }
    } catch (error) {
      console.error("Error fetching streak:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const recordDailyCompletion = async (): Promise<{
    newStreak: number;
    streakBroken: boolean;
    bonusAvailable: boolean;
  }> => {
    if (!user || !streak) {
      return { newStreak: 0, streakBroken: false, bonusAvailable: false };
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const lastDate = streak.last_completion_date;

      let newCurrentStreak = 1;
      let streakBroken = false;

      if (lastDate) {
        const lastDateObj = new Date(lastDate);
        const todayObj = new Date(today);
        const diffDays = Math.floor(
          (todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 0) {
          // Already completed today
          return { 
            newStreak: streak.current_streak, 
            streakBroken: false, 
            bonusAvailable: !streak.streak_bonus_claimed 
          };
        } else if (diffDays === 1) {
          // Consecutive day - extend streak
          newCurrentStreak = streak.current_streak + 1;
        } else {
          // Streak broken
          streakBroken = true;
          newCurrentStreak = 1;
        }
      }

      const newBestStreak = Math.max(streak.best_streak, newCurrentStreak);

      const { error } = await supabase
        .from("user_mission_streaks")
        .update({
          current_streak: newCurrentStreak,
          best_streak: newBestStreak,
          last_completion_date: today,
          total_completions: streak.total_completions + 1,
          streak_bonus_claimed: false, // Reset for new day
          updated_at: new Date().toISOString(),
        })
        .eq("id", streak.id);

      if (error) throw error;

      setStreak({
        ...streak,
        current_streak: newCurrentStreak,
        best_streak: newBestStreak,
        last_completion_date: today,
        total_completions: streak.total_completions + 1,
        streak_bonus_claimed: false,
      });

      return { 
        newStreak: newCurrentStreak, 
        streakBroken, 
        bonusAvailable: true 
      };
    } catch (error) {
      console.error("Error recording daily completion:", error);
      return { newStreak: 0, streakBroken: false, bonusAvailable: false };
    }
  };

  const claimStreakBonus = async (): Promise<{ success: boolean; coins: number; gems: number; xp: number }> => {
    if (!user || !profile || !streak || streak.streak_bonus_claimed) {
      return { success: false, coins: 0, gems: 0, xp: 0 };
    }

    try {
      const bonus = getStreakBonus(streak.current_streak);

      // Mark as claimed
      await supabase
        .from("user_mission_streaks")
        .update({ streak_bonus_claimed: true })
        .eq("id", streak.id);

      // Award coins/gems atomically via the delta RPC — an absolute write
      // off the in-memory profile overwrites gems granted by other claims
      // (the client can't read the locked gems column back).
      if (bonus.coins > 0 || bonus.gems > 0) {
        const { data: currencyData, error: currencyError } = await supabase.rpc(
          "update_user_currency",
          {
            p_user_id: user.id,
            p_coins_delta: bonus.coins || 0,
            p_gems_delta: bonus.gems || 0,
          }
        );
        if (currencyError) throw currencyError;
        if (currencyData && currencyData.length > 0) {
          setProfileLocal({
            coins: currencyData[0].new_coins,
            gems: currencyData[0].new_gems,
          });
        }
      }

      if (bonus.xp > 0) {
        await updateProfile({
          total_points: (profile.total_points || 0) + bonus.xp,
        });
      }

      setStreak({ ...streak, streak_bonus_claimed: true });

      return { success: true, coins: bonus.coins, gems: bonus.gems, xp: bonus.xp };
    } catch (error) {
      console.error("Error claiming streak bonus:", error);
      return { success: false, coins: 0, gems: 0, xp: 0 };
    }
  };

  return {
    streak,
    loading,
    recordDailyCompletion,
    claimStreakBonus,
    refreshStreak: fetchStreak,
    currentStreak: streak?.current_streak || 0,
    bestStreak: streak?.best_streak || 0,
    totalCompletions: streak?.total_completions || 0,
    canClaimBonus: streak ? !streak.streak_bonus_claimed : false,
  };
}
