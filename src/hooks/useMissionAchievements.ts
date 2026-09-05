import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Achievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon_slug: string;
  requirement: {
    type: "streak" | "total_missions" | "daily_completions" | "weekly_completions";
    value: number;
  };
  reward_coins: number;
  reward_gems: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Streak achievements
  {
    id: "streak_3",
    title: "სტაბილური მოთამაშე",
    description: "შეინარჩუნე სთრიქი 3 დღე ზედიზედ",
    icon_slug: "flame",
    requirement: { type: "streak", value: 3 },
    reward_coins: 100,
    reward_gems: 2,
    rarity: "common",
  },
  {
    id: "streak_7",
    title: "კვირის გმირი",
    description: "შეინარჩუნე სთრიქი 7 დღე ზედიზედ",
    icon_slug: "lightning",
    requirement: { type: "streak", value: 7 },
    reward_coins: 300,
    reward_gems: 5,
    rarity: "rare",
  },
  {
    id: "streak_14",
    title: "ორკვირიანი ჩემპიონი",
    description: "შეინარჩუნე სთრიქი 14 დღე ზედიზედ",
    icon_slug: "award",
    requirement: { type: "streak", value: 14 },
    reward_coins: 500,
    reward_gems: 10,
    rarity: "epic",
  },
  {
    id: "streak_30",
    title: "თვის ლეგენდა",
    description: "შეინარჩუნე სთრიქი 30 დღე ზედიზედ",
    icon_slug: "crown",
    requirement: { type: "streak", value: 30 },
    reward_coins: 1000,
    reward_gems: 25,
    rarity: "legendary",
  },
  // Total missions
  {
    id: "missions_10",
    title: "პირველი ნაბიჯები",
    description: "შეასრულე 10 მისია ჯამში",
    icon_slug: "target",
    requirement: { type: "total_missions", value: 10 },
    reward_coins: 50,
    reward_gems: 1,
    rarity: "common",
  },
  {
    id: "missions_50",
    title: "მისიების მოყვარული",
    description: "შეასრულე 50 მისია ჯამში",
    icon_slug: "medal",
    requirement: { type: "total_missions", value: 50 },
    reward_coins: 200,
    reward_gems: 3,
    rarity: "rare",
  },
  {
    id: "missions_100",
    title: "მისიების ოსტატი",
    description: "შეასრულე 100 მისია ჯამში",
    icon_slug: "trophy",
    requirement: { type: "total_missions", value: 100 },
    reward_coins: 500,
    reward_gems: 8,
    rarity: "epic",
  },
  {
    id: "missions_500",
    title: "მისიების იმპერატორი",
    description: "შეასრულე 500 მისია ჯამში",
    icon_slug: "diamond",
    requirement: { type: "total_missions", value: 500 },
    reward_coins: 2000,
    reward_gems: 50,
    rarity: "legendary",
  },
];

export const RARITY_COLORS = {
  common: {
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
    gradient: "from-slate-400 to-slate-500",
  },
  rare: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
    gradient: "from-blue-400 to-blue-600",
  },
  epic: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-700",
    gradient: "from-purple-400 to-purple-600",
  },
  legendary: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
    gradient: "from-amber-400 to-yellow-500",
  },
};

export function useMissionAchievements() {
  const { user, profile, setProfileLocal } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!user) {
      setAchievements([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const unlockAchievement = async (achievementId: string): Promise<{ success: boolean; coins: number; gems: number }> => {
    if (!user || !profile) return { success: false, coins: 0, gems: 0 };

    // Check if already unlocked
    if (achievements.some((a) => a.achievement_id === achievementId)) {
      return { success: false, coins: 0, gems: 0 };
    }

    const definition = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!definition) return { success: false, coins: 0, gems: 0 };

    try {
      // Insert achievement
      const { error } = await supabase
        .from("user_achievements")
        .insert({
          user_id: user.id,
          achievement_id: achievementId,
        });

      if (error) throw error;

      // Award rewards.
      //
      // Not an absolute write off the in-memory profile, which is what stood
      // here. update_user_currency refuses a positive delta from a signed-in
      // caller, so it paid nothing on a database with the entitlement
      // migrations applied — and it read profile.gems, a column the client
      // is not granted once the wallet lockdown lands, so the write would
      // have set the player's gems to the reward alone and destroyed the
      // rest. It never fired only because nothing called this.
      if (definition.reward_coins > 0 || definition.reward_gems > 0) {
        const { data: currencyData, error: currencyError } = await supabase.rpc(
          "credit_gameplay_reward",
          {
            p_kind: "achievement",
            p_coins: definition.reward_coins || 0,
            p_gems: definition.reward_gems || 0,
            p_reference: achievementId,
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

      // Update local state
      setAchievements((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString(),
        },
      ]);

      return { success: true, coins: definition.reward_coins, gems: definition.reward_gems };
    } catch (error) {
      console.error("Error unlocking achievement:", error);
      return { success: false, coins: 0, gems: 0 };
    }
  };

  const checkAndUnlockAchievements = async (
    currentStreak: number,
    totalMissions: number
  ): Promise<AchievementDefinition[]> => {
    const newlyUnlocked: AchievementDefinition[] = [];

    for (const achievement of ACHIEVEMENTS) {
      // Skip if already unlocked
      if (achievements.some((a) => a.achievement_id === achievement.id)) continue;

      let shouldUnlock = false;

      if (achievement.requirement.type === "streak" && currentStreak >= achievement.requirement.value) {
        shouldUnlock = true;
      } else if (achievement.requirement.type === "total_missions" && totalMissions >= achievement.requirement.value) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        const result = await unlockAchievement(achievement.id);
        if (result.success) {
          newlyUnlocked.push(achievement);
        }
      }
    }

    return newlyUnlocked;
  };

  const isUnlocked = (achievementId: string) => 
    achievements.some((a) => a.achievement_id === achievementId);

  const unlockedCount = achievements.length;
  const totalCount = ACHIEVEMENTS.length;

  return {
    achievements,
    loading,
    unlockAchievement,
    checkAndUnlockAchievements,
    isUnlocked,
    unlockedCount,
    totalCount,
    refreshAchievements: fetchAchievements,
  };
}
