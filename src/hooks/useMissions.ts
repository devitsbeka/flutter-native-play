import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Mission {
  id: string;
  mission_id: string;
  mission_title: string;
  mission_description: string | null;
  target_value: number;
  current_progress: number;
  reward_xp: number;
  completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
  reward_coins: number;
  reward_gems: number;
  reward_power_up: string | null;
  reward_power_up_count: number;
  mission_type: string;
}

interface MissionDefinition {
  mission_id: string;
  mission_title: string;
  mission_description: string;
  target_value: number;
  reward_xp: number;
  reward_coins: number;
  reward_gems: number;
  reward_power_up: string | null;
  reward_power_up_count: number;
  color_theme: "purple" | "blue" | "orange" | "emerald" | "rose" | "cyan" | "amber";
  mission_type: "daily" | "weekly";
}

interface MissionsData {
  daily: Mission[];
  weekly: Mission[];
}

// Mission color themes for UI
export const MISSION_THEMES = {
  purple: {
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    progress: "from-violet-500 to-purple-500",
    icon: "bg-violet-100 text-violet-600",
  },
  blue: {
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    progress: "from-blue-500 to-cyan-500",
    icon: "bg-blue-100 text-blue-600",
  },
  orange: {
    gradient: "from-orange-500 to-amber-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    progress: "from-orange-500 to-amber-500",
    icon: "bg-orange-100 text-orange-600",
  },
  emerald: {
    gradient: "from-emerald-500 to-green-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    progress: "from-emerald-500 to-green-500",
    icon: "bg-emerald-100 text-emerald-600",
  },
  rose: {
    gradient: "from-rose-500 to-pink-500",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    progress: "from-rose-500 to-pink-500",
    icon: "bg-rose-100 text-rose-600",
  },
  cyan: {
    gradient: "from-cyan-500 to-teal-500",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-700",
    progress: "from-cyan-500 to-teal-500",
    icon: "bg-cyan-100 text-cyan-600",
  },
  amber: {
    gradient: "from-amber-500 to-yellow-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    progress: "from-amber-500 to-yellow-500",
    icon: "bg-amber-100 text-amber-600",
  },
};

const DAILY_MISSIONS: MissionDefinition[] = [
  {
    mission_id: "win_games",
    mission_title: "მოიგე 3 თამაში",
    mission_description: "გამოიჩინე ოსტატობა და მოიგე 3 თამაში",
    target_value: 3,
    reward_xp: 50,
    reward_coins: 100,
    reward_gems: 2,
    reward_power_up: "5050",
    reward_power_up_count: 1,
    color_theme: "purple",
    mission_type: "daily",
  },
  {
    mission_id: "answer_correct",
    mission_title: "სწორი პასუხები",
    mission_description: "გაეცი 10 სწორი პასუხი",
    target_value: 10,
    reward_xp: 30,
    reward_coins: 50,
    reward_gems: 1,
    reward_power_up: null,
    reward_power_up_count: 0,
    color_theme: "blue",
    mission_type: "daily",
  },
  {
    mission_id: "play_categories",
    mission_title: "კატეგორიების მკვლევარი",
    mission_description: "ითამაშე 2 სხვადასხვა კატეგორიაში",
    target_value: 2,
    reward_xp: 40,
    reward_coins: 60,
    reward_gems: 1,
    reward_power_up: "freeze",
    reward_power_up_count: 1,
    color_theme: "orange",
    mission_type: "daily",
  },
  {
    mission_id: "play_games",
    mission_title: "მარათონელი",
    mission_description: "ითამაშე 5 თამაში დღეში",
    target_value: 5,
    reward_xp: 35,
    reward_coins: 80,
    reward_gems: 0,
    reward_power_up: null,
    reward_power_up_count: 0,
    color_theme: "emerald",
    mission_type: "daily",
  },
  {
    mission_id: "perfect_round",
    mission_title: "სრულყოფილება",
    mission_description: "მოიგე თამაში 100% სიზუსტით",
    target_value: 1,
    reward_xp: 60,
    reward_coins: 120,
    reward_gems: 3,
    reward_power_up: "replace",
    reward_power_up_count: 1,
    color_theme: "rose",
    mission_type: "daily",
  },
];

const WEEKLY_MISSIONS: MissionDefinition[] = [
  {
    mission_id: "weekly_wins",
    mission_title: "კვირის ჩემპიონი",
    mission_description: "მოიგე 15 თამაში ამ კვირაში",
    target_value: 15,
    reward_xp: 200,
    reward_coins: 500,
    reward_gems: 10,
    reward_power_up: "5050",
    reward_power_up_count: 3,
    color_theme: "purple",
    mission_type: "weekly",
  },
  {
    mission_id: "weekly_answers",
    mission_title: "ცოდნის ექსპერტი",
    mission_description: "გაეცი 100 სწორი პასუხი",
    target_value: 100,
    reward_xp: 150,
    reward_coins: 400,
    reward_gems: 8,
    reward_power_up: "freeze",
    reward_power_up_count: 2,
    color_theme: "cyan",
    mission_type: "weekly",
  },
  {
    mission_id: "weekly_categories",
    mission_title: "მულტიკატეგორია",
    mission_description: "ითამაშე 10 სხვადასხვა კატეგორიაში",
    target_value: 10,
    reward_xp: 180,
    reward_coins: 350,
    reward_gems: 6,
    reward_power_up: "replace",
    reward_power_up_count: 2,
    color_theme: "amber",
    mission_type: "weekly",
  },
  {
    mission_id: "weekly_perfect",
    mission_title: "პერფექციონისტი",
    mission_description: "მოიგე 5 თამაში 100% სიზუსტით",
    target_value: 5,
    reward_xp: 250,
    reward_coins: 600,
    reward_gems: 15,
    reward_power_up: "time-drain",
    reward_power_up_count: 2,
    color_theme: "rose",
    mission_type: "weekly",
  },
];

// Helper to get current week start (Monday)
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

// Export mission definitions for UI to access color themes
export function getMissionTheme(missionId: string) {
  const allMissions = [...DAILY_MISSIONS, ...WEEKLY_MISSIONS];
  const mission = allMissions.find((m) => m.mission_id === missionId);
  return mission ? MISSION_THEMES[mission.color_theme] : MISSION_THEMES.blue;
}

export function getMissionType(missionId: string): "daily" | "weekly" {
  if (WEEKLY_MISSIONS.some((m) => m.mission_id === missionId)) return "weekly";
  return "daily";
}

// ---------- Fetch function ----------

async function fetchMissions(userId: string): Promise<MissionsData> {
  const today = new Date().toISOString().split("T")[0];
  const weekStart = getWeekStart();

  // Fetch daily and weekly in parallel
  const [dailyResult, weeklyResult] = await Promise.all([
    supabase
      .from("user_missions")
      .select("*")
      .eq("user_id", userId)
      .eq("mission_date", today)
      .eq("mission_type", "daily"),
    supabase
      .from("user_missions")
      .select("*")
      .eq("user_id", userId)
      .eq("mission_date", weekStart)
      .eq("mission_type", "weekly"),
  ]);

  if (dailyResult.error) throw dailyResult.error;
  if (weeklyResult.error) throw weeklyResult.error;

  let daily = dailyResult.data || [];
  let weekly = weeklyResult.data || [];

  // Create daily missions if needed
  if (daily.length === 0) {
    const dailyToCreate = DAILY_MISSIONS.map((m) => ({
      user_id: userId,
      mission_id: m.mission_id,
      mission_title: m.mission_title,
      mission_description: m.mission_description,
      target_value: m.target_value,
      reward_xp: m.reward_xp,
      reward_coins: m.reward_coins,
      reward_gems: m.reward_gems,
      reward_power_up: m.reward_power_up,
      reward_power_up_count: m.reward_power_up_count,
      mission_date: today,
      mission_type: "daily",
    }));

    await supabase
      .from("user_missions")
      .upsert(dailyToCreate, {
        onConflict: "user_id,mission_id,mission_date",
        ignoreDuplicates: true,
      });

    const { data: refreshedDaily } = await supabase
      .from("user_missions")
      .select("*")
      .eq("user_id", userId)
      .eq("mission_date", today)
      .eq("mission_type", "daily");

    daily = refreshedDaily || [];
  }

  // Create weekly missions if needed
  if (weekly.length === 0) {
    const weeklyToCreate = WEEKLY_MISSIONS.map((m) => ({
      user_id: userId,
      mission_id: m.mission_id,
      mission_title: m.mission_title,
      mission_description: m.mission_description,
      target_value: m.target_value,
      reward_xp: m.reward_xp,
      reward_coins: m.reward_coins,
      reward_gems: m.reward_gems,
      reward_power_up: m.reward_power_up,
      reward_power_up_count: m.reward_power_up_count,
      mission_date: weekStart,
      mission_type: "weekly",
    }));

    await supabase
      .from("user_missions")
      .upsert(weeklyToCreate, {
        onConflict: "user_id,mission_id,mission_date",
        ignoreDuplicates: true,
      });

    const { data: refreshedWeekly } = await supabase
      .from("user_missions")
      .select("*")
      .eq("user_id", userId)
      .eq("mission_date", weekStart)
      .eq("mission_type", "weekly");

    weekly = refreshedWeekly || [];
  }

  return { daily, weekly };
}

// ---------- Module-level realtime subscription (ref-counted singleton) ----------

let activeChannel: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;
let subscribedUserId: string | null = null;

function subscribeRealtime(userId: string, onUpdate: (mission: Mission) => void): () => void {
  subscriberCount++;

  if (!activeChannel || subscribedUserId !== userId) {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
    }
    subscribedUserId = userId;
    activeChannel = supabase
      .channel(`missions-shared-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_missions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onUpdate(payload.new as Mission);
        }
      )
      .subscribe();
  }

  return () => {
    subscriberCount--;
    if (subscriberCount <= 0 && activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
      subscribedUserId = null;
      subscriberCount = 0;
    }
  };
}

// ---------- Hook ----------

const EMPTY_MISSIONS: MissionsData = { daily: [], weekly: [] };

export function useMissions() {
  const { user, profile, updateProfile, setProfileLocal } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["missions", user?.id];

  const { data: missionsData = EMPTY_MISSIONS, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchMissions(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,     // 1 min — missions update via realtime
    gcTime: 10 * 60 * 1000,
  });

  const dailyMissions = missionsData.daily;
  const weeklyMissions = missionsData.weekly;

  // Single shared realtime subscription — updates cache directly
  useEffect(() => {
    if (!user) return;
    return subscribeRealtime(user.id, (updated) => {
      queryClient.setQueryData<MissionsData>(["missions", user.id], (prev) => {
        if (!prev) return prev;
        if (updated.mission_type === "daily") {
          return {
            ...prev,
            daily: prev.daily.map((m) => (m.id === updated.id ? updated : m)),
          };
        }
        return {
          ...prev,
          weekly: prev.weekly.map((m) => (m.id === updated.id ? updated : m)),
        };
      });
    });
  }, [user?.id, queryClient]);

  const updateMissionProgress = useCallback(
    async (
      missionId: string,
      progressIncrement: number
    ): Promise<{
      completed: boolean;
      xpEarned: number;
      missionTitle?: string;
      rewardCoins?: number;
      rewardGems?: number;
      rewardXp?: number;
      rewardPowerUp?: string | null;
      rewardPowerUpCount?: number;
    }> => {
      if (!user) return { completed: false, xpEarned: 0 };

      const allMissions = [...dailyMissions, ...weeklyMissions];
      const mission = allMissions.find((m) => m.mission_id === missionId);
      if (!mission || mission.completed) return { completed: false, xpEarned: 0 };

      try {
        const newProgress = Math.min(
          mission.current_progress + progressIncrement,
          mission.target_value
        );
        const isCompleted = newProgress >= mission.target_value;

        const updates: Record<string, unknown> = {
          current_progress: newProgress,
        };

        if (isCompleted) {
          updates.completed = true;
          updates.completed_at = new Date().toISOString();
        }

        await supabase
          .from("user_missions")
          .update(updates)
          .eq("id", mission.id);

        return {
          completed: isCompleted,
          xpEarned: isCompleted ? mission.reward_xp : 0,
          missionTitle: mission.mission_title,
          rewardCoins: mission.reward_coins,
          rewardGems: mission.reward_gems,
          rewardXp: mission.reward_xp,
          rewardPowerUp: mission.reward_power_up,
          rewardPowerUpCount: mission.reward_power_up_count,
        };
      } catch (error) {
        console.error("Error updating mission progress:", error);
        return { completed: false, xpEarned: 0 };
      }
    },
    [user, dailyMissions, weeklyMissions]
  );

  const claimMissionReward = useCallback(
    async (
      missionId: string
    ): Promise<{
      success: boolean;
      coins: number;
      gems: number;
      xp: number;
      powerUp: string | null;
      powerUpCount: number;
    }> => {
      if (!user || !profile) {
        return { success: false, coins: 0, gems: 0, xp: 0, powerUp: null, powerUpCount: 0 };
      }

      const allMissions = [...dailyMissions, ...weeklyMissions];
      const mission = allMissions.find((m) => m.mission_id === missionId);
      if (!mission || !mission.completed || mission.reward_claimed) {
        return { success: false, coins: 0, gems: 0, xp: 0, powerUp: null, powerUpCount: 0 };
      }

      try {
        // Mark as claimed
        await supabase
          .from("user_missions")
          .update({ reward_claimed: true })
          .eq("id", mission.id);

        // Grant coins/gems atomically via the delta RPC. An absolute
        // read-modify-write off the in-memory profile loses rewards: the
        // client cannot read the gems column back (wallet columns are
        // locked), so profile.gems is stale and each claim overwrites the
        // previous one's gems.
        if (mission.reward_coins > 0 || mission.reward_gems > 0) {
          const { data: currencyData, error: currencyError } = await supabase.rpc(
            "update_user_currency",
            {
              p_user_id: user.id,
              p_coins_delta: mission.reward_coins || 0,
              p_gems_delta: mission.reward_gems || 0,
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

        // XP is not wallet-locked, so updateProfile handles it safely
        if (mission.reward_xp > 0) {
          await updateProfile({
            total_points: (profile.total_points || 0) + mission.reward_xp,
          });
        }

        // Add power-up if any
        if (mission.reward_power_up && mission.reward_power_up_count > 0) {
          const { data: existingPowerUp } = await supabase
            .from("user_power_ups")
            .select("*")
            .eq("user_id", user.id)
            .eq("power_up_type", mission.reward_power_up)
            .single();

          if (existingPowerUp) {
            await supabase
              .from("user_power_ups")
              .update({
                quantity: (existingPowerUp.quantity || 0) + mission.reward_power_up_count,
              })
              .eq("id", existingPowerUp.id);
          } else {
            await supabase
              .from("user_power_ups")
              .insert({
                user_id: user.id,
                power_up_type: mission.reward_power_up,
                quantity: mission.reward_power_up_count,
              });
          }

          // Invalidate power-ups cache so UI reflects new quantity
          queryClient.invalidateQueries({ queryKey: ["user-power-ups", user.id] });
        }

        // Record reward
        await supabase.from("user_rewards").insert({
          user_id: user.id,
          reward_type: "mission",
          reward_value: {
            mission_id: missionId,
            xp_earned: mission.reward_xp,
            coins_earned: mission.reward_coins,
            gems_earned: mission.reward_gems,
            power_up: mission.reward_power_up,
            power_up_count: mission.reward_power_up_count,
          },
        });

        // Optimistic update
        queryClient.setQueryData<MissionsData>(["missions", user.id], (prev) => {
          if (!prev) return prev;
          const updateList = (list: Mission[]) =>
            list.map((m) => (m.id === mission.id ? { ...m, reward_claimed: true } : m));
          return {
            daily: updateList(prev.daily),
            weekly: updateList(prev.weekly),
          };
        });

        return {
          success: true,
          coins: mission.reward_coins,
          gems: mission.reward_gems,
          xp: mission.reward_xp,
          powerUp: mission.reward_power_up,
          powerUpCount: mission.reward_power_up_count,
        };
      } catch (error) {
        console.error("Error claiming mission reward:", error);
        return { success: false, coins: 0, gems: 0, xp: 0, powerUp: null, powerUpCount: 0 };
      }
    },
    [user, profile, dailyMissions, weeklyMissions, updateProfile, setProfileLocal, queryClient]
  );

  const refreshMissions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Computed values
  const computed = useMemo(() => {
    const allMissions = [...dailyMissions, ...weeklyMissions];
    const completedDaily = dailyMissions.filter((m) => m.completed).length;
    const claimedDaily = dailyMissions.filter((m) => m.reward_claimed).length;
    const unclaimedDaily = dailyMissions.filter((m) => m.completed && !m.reward_claimed).length;
    const completedWeekly = weeklyMissions.filter((m) => m.completed).length;
    const claimedWeekly = weeklyMissions.filter((m) => m.reward_claimed).length;
    const unclaimedWeekly = weeklyMissions.filter((m) => m.completed && !m.reward_claimed).length;
    const allDailyComplete = dailyMissions.length > 0 && completedDaily === dailyMissions.length;
    const allDailyClaimed = dailyMissions.length > 0 && claimedDaily === dailyMissions.length;

    let totalProgress = 0;
    let totalTarget = 0;
    allMissions.forEach((mission) => {
      totalProgress += Math.min(mission.current_progress, mission.target_value);
      totalTarget += mission.target_value;
    });
    const overallProgress = totalTarget > 0 ? Math.round((totalProgress / totalTarget) * 100) : 0;

    return {
      allMissions,
      completedDaily,
      claimedDaily,
      unclaimedDaily,
      completedWeekly,
      claimedWeekly,
      unclaimedWeekly,
      allDailyComplete,
      allDailyClaimed,
      overallProgress,
    };
  }, [dailyMissions, weeklyMissions]);

  return {
    dailyMissions,
    weeklyMissions,
    allMissions: computed.allMissions,
    loading,
    updateMissionProgress,
    claimMissionReward,
    refreshMissions,
    completedDaily: computed.completedDaily,
    claimedDaily: computed.claimedDaily,
    unclaimedDaily: computed.unclaimedDaily,
    totalDaily: dailyMissions.length,
    completedWeekly: computed.completedWeekly,
    claimedWeekly: computed.claimedWeekly,
    unclaimedWeekly: computed.unclaimedWeekly,
    totalWeekly: weeklyMissions.length,
    allDailyComplete: computed.allDailyComplete,
    allDailyClaimed: computed.allDailyClaimed,
    overallProgress: computed.overallProgress,
    // Legacy exports for backward compatibility
    missions: computed.allMissions,
    completedCount: computed.completedDaily + computed.completedWeekly,
    totalCount: computed.allMissions.length,
    unclaimedCount: computed.unclaimedDaily + computed.unclaimedWeekly,
  };
}
