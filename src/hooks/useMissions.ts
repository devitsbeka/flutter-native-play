import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./useNotifications";
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

interface MissionsData {
  daily: Mission[];
  weekly: Mission[];
}

type ColorTheme = "purple" | "blue" | "orange" | "emerald" | "rose" | "cyan" | "amber";

// One tier of a pool mission: the target and its rewards
interface MissionTier {
  target: number;
  xp: number;
  coins: number;
  gems: number;
}

// A mission template: {n} in title/description is replaced with the tier's
// target. Beginners (few games played) get softer targets and rewards than
// advanced players.
interface PoolMission {
  mission_id: string;
  title: string;
  description: string;
  beginner: MissionTier;
  advanced: MissionTier;
  power_up?: string | null;
  power_up_count?: number;
  color_theme: ColorTheme;
  emoji: string;
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

// ---------- Mission pools ----------
// Daily missions rotate: each day DAILY_ACTIVE_COUNT consecutive pool entries
// (wrapping) are active, so the set varies day to day. Weekly rotates the
// same way per ISO-ish week. Feature missions (friends, TV) are part of the
// pool so players are nudged across the whole app.

const DAILY_POOL: PoolMission[] = [
  {
    mission_id: "play_games",
    title: "მარათონელი",
    description: "ითამაშე {n} თამაში დღეს",
    beginner: { target: 3, xp: 25, coins: 60, gems: 1 },
    advanced: { target: 5, xp: 35, coins: 80, gems: 1 },
    power_up: "5050",
    power_up_count: 1,
    color_theme: "emerald",
    emoji: "👟",
  },
  {
    mission_id: "answer_correct",
    title: "სწორი პასუხები",
    description: "გაეცი {n} სწორი პასუხი",
    beginner: { target: 10, xp: 30, coins: 50, gems: 1 },
    advanced: { target: 25, xp: 45, coins: 90, gems: 1 },
    power_up: "freeze",
    power_up_count: 1,
    color_theme: "blue",
    emoji: "✅",
  },
  {
    mission_id: "win_games",
    title: "გამარჯვებული",
    description: "მოიგე {n} თამაში",
    beginner: { target: 1, xp: 30, coins: 60, gems: 1 },
    advanced: { target: 3, xp: 50, coins: 100, gems: 2 },
    power_up: "5050",
    power_up_count: 1,
    color_theme: "purple",
    emoji: "🏆",
  },
  {
    mission_id: "play_categories",
    title: "კატეგორიების მკვლევარი",
    description: "ითამაშე {n} სხვადასხვა კატეგორიაში",
    beginner: { target: 2, xp: 30, coins: 60, gems: 1 },
    advanced: { target: 4, xp: 40, coins: 80, gems: 1 },
    power_up: "freeze",
    power_up_count: 1,
    color_theme: "orange",
    emoji: "🗺️",
  },
  {
    mission_id: "perfect_round",
    title: "მიზანდასახული",
    description: "მოიგე თამაში 100% სიზუსტით",
    beginner: { target: 1, xp: 50, coins: 100, gems: 2 },
    advanced: { target: 1, xp: 60, coins: 120, gems: 3 },
    power_up: "replace",
    power_up_count: 1,
    color_theme: "rose",
    emoji: "🎯",
  },
  {
    mission_id: "play_friend",
    title: "მეგობრული მატჩი",
    description: "ითამაშე მეგობრებთან ერთად ოთახში",
    beginner: { target: 1, xp: 40, coins: 80, gems: 1 },
    advanced: { target: 1, xp: 40, coins: 80, gems: 1 },
    power_up: "replace",
    power_up_count: 1,
    color_theme: "cyan",
    emoji: "🤝",
  },
  {
    mission_id: "play_tv",
    title: "დიდი ეკრანი",
    description: "ითამაშე TV-ზე მეგობრებთან ერთად",
    beginner: { target: 1, xp: 50, coins: 100, gems: 2 },
    advanced: { target: 1, xp: 50, coins: 100, gems: 2 },
    power_up: "time-drain",
    power_up_count: 1,
    color_theme: "amber",
    emoji: "📺",
  },
];

const WEEKLY_POOL: PoolMission[] = [
  {
    mission_id: "weekly_wins",
    title: "კვირის ჩემპიონი",
    description: "მოიგე {n} თამაში ამ კვირაში",
    beginner: { target: 8, xp: 150, coins: 350, gems: 6 },
    advanced: { target: 15, xp: 200, coins: 500, gems: 10 },
    power_up: "5050",
    power_up_count: 3,
    color_theme: "purple",
    emoji: "👑",
  },
  {
    mission_id: "weekly_answers",
    title: "ცოდნის ექსპერტი",
    description: "გაეცი {n} სწორი პასუხი",
    beginner: { target: 50, xp: 120, coins: 300, gems: 5 },
    advanced: { target: 100, xp: 150, coins: 400, gems: 8 },
    power_up: "freeze",
    power_up_count: 2,
    color_theme: "cyan",
    emoji: "🧠",
  },
  {
    mission_id: "weekly_categories",
    title: "მულტიკატეგორია",
    description: "ითამაშე {n} სხვადასხვა კატეგორიაში",
    beginner: { target: 5, xp: 130, coins: 280, gems: 4 },
    advanced: { target: 10, xp: 180, coins: 350, gems: 6 },
    power_up: "replace",
    power_up_count: 2,
    color_theme: "amber",
    emoji: "🧭",
  },
  {
    mission_id: "weekly_perfect",
    title: "პერფექციონისტი",
    description: "მოიგე {n} თამაში 100% სიზუსტით",
    beginner: { target: 2, xp: 180, coins: 400, gems: 8 },
    advanced: { target: 5, xp: 250, coins: 600, gems: 15 },
    power_up: "time-drain",
    power_up_count: 2,
    color_theme: "rose",
    emoji: "💯",
  },
  {
    mission_id: "weekly_friend_games",
    title: "მეგობრების კვირა",
    description: "ითამაშე {n} თამაში მეგობრებთან",
    beginner: { target: 2, xp: 140, coins: 300, gems: 5 },
    advanced: { target: 5, xp: 190, coins: 450, gems: 8 },
    power_up: "time-drain",
    power_up_count: 2,
    color_theme: "emerald",
    emoji: "🎉",
  },
  {
    mission_id: "weekly_play_games",
    title: "კვირის მარათონი",
    description: "ითამაშე {n} თამაში ამ კვირაში",
    beginner: { target: 10, xp: 120, coins: 300, gems: 4 },
    advanced: { target: 25, xp: 170, coins: 450, gems: 7 },
    power_up: "replace",
    power_up_count: 2,
    color_theme: "blue",
    emoji: "🔥",
  },
];

const DAILY_ACTIVE_COUNT = 5;
const WEEKLY_ACTIVE_COUNT = 4;
// Players with this many finished games get the advanced targets/rewards
const ADVANCED_GAMES_THRESHOLD = 30;

function pickRotation<T>(pool: T[], slot: number, count: number): T[] {
  const start = ((slot % pool.length) + pool.length) % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}

function activeDailyPool(): PoolMission[] {
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  return pickRotation(DAILY_POOL, dayNumber, DAILY_ACTIVE_COUNT);
}

function activeWeeklyPool(): PoolMission[] {
  const weekNumber = Math.floor(Date.now() / (7 * 86_400_000));
  return pickRotation(WEEKLY_POOL, weekNumber, WEEKLY_ACTIVE_COUNT);
}

function tierOf(gamesPlayed: number): "beginner" | "advanced" {
  return gamesPlayed >= ADVANCED_GAMES_THRESHOLD ? "advanced" : "beginner";
}

function toRow(m: PoolMission, tier: "beginner" | "advanced", userId: string, missionDate: string, missionType: "daily" | "weekly") {
  const t = m[tier];
  return {
    user_id: userId,
    mission_id: m.mission_id,
    mission_title: m.title,
    mission_description: m.description.replace("{n}", String(t.target)),
    target_value: t.target,
    reward_xp: t.xp,
    reward_coins: t.coins,
    reward_gems: t.gems,
    reward_power_up: m.power_up || null,
    reward_power_up_count: m.power_up_count || 0,
    mission_date: missionDate,
    mission_type: missionType,
  };
}

// ---------- Event → mission mapping ----------
// Gameplay code reports EVENTS; each event advances every active mission
// (daily + weekly) that listens to it.
export type MissionEvent =
  | "game_played"
  | "correct_answers"
  | "game_won"
  | "categories_played"
  | "perfect_win"
  | "friend_game"
  | "tv_played";

const EVENT_MISSIONS: Record<MissionEvent, string[]> = {
  game_played: ["play_games", "weekly_play_games"],
  correct_answers: ["answer_correct", "weekly_answers"],
  game_won: ["win_games", "weekly_wins"],
  categories_played: ["play_categories", "weekly_categories"],
  perfect_win: ["perfect_round", "weekly_perfect"],
  friend_game: ["play_friend", "weekly_friend_games"],
  tv_played: ["play_tv"],
};

// Export mission helpers for UI
export function getMissionTheme(missionId: string) {
  const all = [...DAILY_POOL, ...WEEKLY_POOL];
  const mission = all.find((m) => m.mission_id === missionId);
  return mission ? MISSION_THEMES[mission.color_theme] : MISSION_THEMES.blue;
}

export function getMissionEmoji(missionId: string): string {
  const all = [...DAILY_POOL, ...WEEKLY_POOL];
  return all.find((m) => m.mission_id === missionId)?.emoji || "⭐";
}

export function getMissionType(missionId: string): "daily" | "weekly" {
  return missionId.startsWith("weekly_") ? "weekly" : "daily";
}

// Helper to get current week start (Monday)
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

// ---------- Fetch function ----------

// Rows created before a reward-tuning change keep stale reward columns;
// realign unfinished rows with the current pool so what the card shows is
// what completion actually grants. (Completed rows keep what was paid out.)
async function syncRewardColumns(
  rows: { [key: string]: unknown }[],
  defs: PoolMission[],
  tier: "beginner" | "advanced"
) {
  const updates: PromiseLike<unknown>[] = [];
  for (const row of rows) {
    if (row.completed) continue;
    const def = defs.find((d) => d.mission_id === row.mission_id);
    if (!def) continue;
    const t = def[tier];
    const powerUp = def.power_up || null;
    const powerUpCount = def.power_up_count || 0;
    if (
      row.reward_xp !== t.xp ||
      row.reward_coins !== t.coins ||
      row.reward_gems !== t.gems ||
      row.reward_power_up !== powerUp ||
      row.reward_power_up_count !== powerUpCount
    ) {
      const fresh = {
        reward_xp: t.xp,
        reward_coins: t.coins,
        reward_gems: t.gems,
        reward_power_up: powerUp,
        reward_power_up_count: powerUpCount,
      };
      Object.assign(row, fresh);
      updates.push(supabase.from("user_missions").update(fresh).eq("id", row.id as string));
    }
  }
  if (updates.length > 0) await Promise.all(updates);
}

async function fetchMissions(userId: string, gamesPlayed: number): Promise<MissionsData> {
  const today = new Date().toISOString().split("T")[0];
  const weekStart = getWeekStart();
  const tier = tierOf(gamesPlayed);
  const dailyDefs = activeDailyPool();
  const weeklyDefs = activeWeeklyPool();

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

  // Create any of today's rotation that this user doesn't have yet
  // (ignoreDuplicates keeps rows created earlier today untouched)
  const missingDaily = dailyDefs.filter((d) => !daily.some((row) => row.mission_id === d.mission_id));
  if (missingDaily.length > 0) {
    await supabase
      .from("user_missions")
      .upsert(missingDaily.map((m) => toRow(m, tier, userId, today, "daily")), {
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

  const missingWeekly = weeklyDefs.filter((d) => !weekly.some((row) => row.mission_id === d.mission_id));
  if (missingWeekly.length > 0) {
    await supabase
      .from("user_missions")
      .upsert(missingWeekly.map((m) => toRow(m, tier, userId, weekStart, "weekly")), {
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

  await Promise.all([
    syncRewardColumns(daily, dailyDefs, tier),
    syncRewardColumns(weekly, weeklyDefs, tier),
  ]);

  // Show only the current rotation (older same-day rows from a previous
  // rotation stay in the table but leave the UI)
  const dailyIds = new Set(dailyDefs.map((d) => d.mission_id));
  const weeklyIds = new Set(weeklyDefs.map((d) => d.mission_id));
  return {
    daily: daily.filter((m) => dailyIds.has(m.mission_id)),
    weekly: weekly.filter((m) => weeklyIds.has(m.mission_id)),
  };
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
  const gamesPlayed = profile?.games_played || 0;

  const { data: missionsData = EMPTY_MISSIONS, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchMissions(user!.id, gamesPlayed),
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

  // Grants a completed mission's rewards (currency via the atomic delta RPC,
  // XP through the profile, power-ups) and records them.
  const grantMissionRewards = useCallback(
    async (mission: Mission) => {
      if (!user || !profile) return;

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

      if (mission.reward_xp > 0) {
        await updateProfile({
          total_points: (profile.total_points || 0) + mission.reward_xp,
        });
      }

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
        queryClient.invalidateQueries({ queryKey: ["user-power-ups", user.id] });
      }

      await supabase.from("user_rewards").insert({
        user_id: user.id,
        reward_type: "mission",
        reward_value: {
          mission_id: mission.mission_id,
          xp_earned: mission.reward_xp,
          coins_earned: mission.reward_coins,
          gems_earned: mission.reward_gems,
          power_up: mission.reward_power_up,
          power_up_count: mission.reward_power_up_count,
        },
      });
    },
    [user, profile, updateProfile, setProfileLocal, queryClient]
  );

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
          // Rewards are granted immediately on completion — no claim step
          updates.reward_claimed = true;
        }

        await supabase
          .from("user_missions")
          .update(updates)
          .eq("id", mission.id);

        if (isCompleted) {
          // Grant rewards right away, tell the player, and drop a
          // notification so it's visible even if they're mid-game.
          try {
            await grantMissionRewards(mission);
          } catch (grantError) {
            console.error("Mission reward grant failed:", grantError);
          }

          const rewardBits = [
            mission.reward_coins > 0 ? `${mission.reward_coins} მონეტა` : null,
            mission.reward_gems > 0 ? `${mission.reward_gems} ალმასი` : null,
            mission.reward_xp > 0 ? `${mission.reward_xp} XP` : null,
          ].filter(Boolean).join(" · ");

          void createNotification(
            user.id,
            "reward",
            `მისია შესრულებულია: ${mission.mission_title}`,
            rewardBits ? `ჯილდო: ${rewardBits}` : undefined,
            {
              mission_id: mission.mission_id,
              coins: mission.reward_coins,
              gems: mission.reward_gems,
              xp: mission.reward_xp,
            }
          );

          toast.success(`🎯 ${mission.mission_title} — შესრულებულია!`, {
            description: rewardBits ? `ჯილდო: ${rewardBits}` : undefined,
          });
        }

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
    [user, dailyMissions, weeklyMissions, grantMissionRewards]
  );

  // Report a gameplay EVENT — advances every active daily + weekly mission
  // listening to it. This is what game code should call.
  const trackMissionEvent = useCallback(
    async (event: MissionEvent, amount: number = 1) => {
      const ids = EVENT_MISSIONS[event] || [];
      const results = [];
      for (const id of ids) {
        results.push(await updateMissionProgress(id, amount));
      }
      return results;
    },
    [updateMissionProgress]
  );

  // Legacy claim path — kept for older completed-but-unclaimed rows
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
        await supabase
          .from("user_missions")
          .update({ reward_claimed: true })
          .eq("id", mission.id);

        await grantMissionRewards(mission);

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
    [user, profile, dailyMissions, weeklyMissions, grantMissionRewards, queryClient]
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
    trackMissionEvent,
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
