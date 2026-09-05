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

// The streak ladder. Day three and up are the milestones the streak page
// pays once each (see useStreakMilestones); the tiers used to be paid again
// every day the streak stood at them, which nothing does any more.
export const STREAK_BONUSES = [
  { minStreak: 1, coins: 25, gems: 0, xp: 15 },
  { minStreak: 3, coins: 50, gems: 1, xp: 30 },
  { minStreak: 5, coins: 75, gems: 2, xp: 50 },
  { minStreak: 7, coins: 100, gems: 3, xp: 75 },
  { minStreak: 14, coins: 150, gems: 5, xp: 100 },
  { minStreak: 21, coins: 200, gems: 8, xp: 150 },
  { minStreak: 30, coins: 300, gems: 15, xp: 250 },
];

export function useMissionStreak() {
  const { user } = useAuth();
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

  /**
   * Mark today as kept. Idempotent: a second call the same day reports the
   * standing numbers with `recorded: false`, so callers can tell the
   * completion that earned the day from the ones after it.
   */
  const recordDailyCompletion = async (): Promise<{
    newStreak: number;
    newTotal: number;
    streakBroken: boolean;
    recorded: boolean;
  }> => {
    if (!user || !streak) {
      return { newStreak: 0, newTotal: 0, streakBroken: false, recorded: false };
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
            newTotal: streak.total_completions,
            streakBroken: false,
            recorded: false,
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
      });

      return {
        newStreak: newCurrentStreak,
        newTotal: streak.total_completions + 1,
        streakBroken,
        recorded: true,
      };
    } catch (error) {
      console.error("Error recording daily completion:", error);
      return { newStreak: 0, newTotal: 0, streakBroken: false, recorded: false };
    }
  };

  // A streak is alive while yesterday or today is kept. The row keeps its
  // last count until the next completion resets it, so a player back after
  // a week away would otherwise still read the old number.
  const alive = (() => {
    if (!streak?.last_completion_date) return false;
    const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const last = Date.parse(`${streak.last_completion_date}T00:00:00Z`);
    return today - last <= 86_400_000;
  })();

  return {
    streak,
    loading,
    recordDailyCompletion,
    refreshStreak: fetchStreak,
    currentStreak: alive ? streak?.current_streak || 0 : 0,
    bestStreak: streak?.best_streak || 0,
    totalCompletions: streak?.total_completions || 0,
  };
}
