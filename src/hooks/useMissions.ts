import { createElement } from "react";
import { useCallback, useEffect, useMemo } from "react";
import { RewardChipsRow } from "@/components/mission/MissionCompleteToast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./useNotifications";
import { t } from "@/lib/i18n";
import { missionTitle } from "@/utils/missionText";
import { useAuth } from "./useAuth";
import { useMissionStreak } from "./useMissionStreak";
import { useMissionAchievements } from "./useMissionAchievements";
import {
  dayKindOf,
  rotationForDate,
  todayKey,
  weekBonusPowerUp,
  weekStartOf,
  type DayKind,
} from "@/utils/missionDays";

export {
  dayKindOf,
  todayKey,
  weekBonusPowerUp,
  weekStartOf,
  type DayKind,
} from "@/utils/missionDays";

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
export type MissionIconKey =
  | "check"
  | "map"
  | "target"
  | "shoe"
  | "trophy"
  | "tv"
  | "hearts"
  // "tv" belongs to TV mode and "hearts" to the friends mission — the cinema
  // and music category missions carry their own icons so no two missions on
  // the reel share a picture.
  | "television"
  | "music";

interface PoolMission {
  mission_id: string;
  title: string;
  description: string;
  beginner: MissionTier;
  advanced: MissionTier;
  power_up?: string | null;
  power_up_count?: number;
  color_theme: ColorTheme;
  icon: MissionIconKey;
  /**
   * Only advance when the event names this thing — a category slug today.
   * Events fired without a tag (a session that spanned several categories,
   * say) cannot satisfy a mission that asks for one specific category, so
   * they leave it alone rather than crediting it by accident.
   */
  requires_tag?: string;
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

// Dailies pay 60-120 coins, 150-200 XP and 1-2 power-ups — never gems.
// The two effortful one-shots (a perfect game, a TV night) carry the double
// power-up. Historical note: five of these once ran a day at
// 1-3 gems each, which was 35-60 gems a week from the rotation alone against
// 3 for finishing all seven days, so the week bonus was the smaller prize by
// an order of magnitude. Gems are the week's currency now; see WEEK_BONUS.
const DAILY_POOL: PoolMission[] = [
  {
    mission_id: "play_games",
    title: "მარათონელი",
    description: "ითამაშე {n} თამაში დღეს",
    beginner: { target: 3, xp: 150, coins: 60, gems: 0 },
    advanced: { target: 5, xp: 160, coins: 80, gems: 0 },
    power_up: "5050",
    power_up_count: 1,
    color_theme: "emerald",
    icon: "shoe",
  },
  {
    mission_id: "answer_correct",
    title: "სწორი პასუხები",
    description: "გაეცი {n} სწორი პასუხი",
    beginner: { target: 10, xp: 150, coins: 70, gems: 0 },
    advanced: { target: 25, xp: 170, coins: 90, gems: 0 },
    power_up: "freeze",
    power_up_count: 1,
    color_theme: "blue",
    icon: "check",
  },
  {
    mission_id: "win_games",
    title: "გამარჯვებული",
    description: "მოიგე {n} თამაში",
    beginner: { target: 1, xp: 160, coins: 80, gems: 0 },
    advanced: { target: 3, xp: 180, coins: 100, gems: 0 },
    power_up: "5050",
    power_up_count: 1,
    color_theme: "purple",
    icon: "trophy",
  },
  {
    mission_id: "play_categories",
    title: "კატეგორიების მკვლევარი",
    description: "ითამაშე {n} სხვადასხვა კატეგორიაში",
    beginner: { target: 2, xp: 150, coins: 70, gems: 0 },
    advanced: { target: 4, xp: 170, coins: 90, gems: 0 },
    power_up: "freeze",
    power_up_count: 1,
    color_theme: "orange",
    icon: "map",
  },
  {
    mission_id: "perfect_round",
    title: "მიზანდასახული",
    description: "მოიგე თამაში 100% სიზუსტით",
    beginner: { target: 1, xp: 190, coins: 110, gems: 0 },
    advanced: { target: 1, xp: 200, coins: 120, gems: 0 },
    power_up: "replace",
    power_up_count: 2,
    color_theme: "rose",
    icon: "target",
  },
  {
    mission_id: "play_friend",
    title: "მეგობრული მატჩი",
    description: "ითამაშე მეგობრებთან ერთად ოთახში",
    beginner: { target: 1, xp: 170, coins: 90, gems: 0 },
    advanced: { target: 1, xp: 170, coins: 90, gems: 0 },
    power_up: "replace",
    power_up_count: 1,
    color_theme: "cyan",
    icon: "hearts",
  },
  {
    mission_id: "play_tv",
    title: "დიდი ეკრანი",
    description: "ითამაშე TV-ზე მეგობრებთან ერთად",
    beginner: { target: 1, xp: 180, coins: 100, gems: 0 },
    advanced: { target: 1, xp: 180, coins: 100, gems: 0 },
    power_up: "time-drain",
    power_up_count: 2,
    color_theme: "amber",
    icon: "tv",
  },
  {
    mission_id: "category_movies",
    title: "კინომოყვარული",
    description: "ითამაშე კინოს კატეგორიაში",
    beginner: { target: 1, xp: 150, coins: 60, gems: 0 },
    advanced: { target: 1, xp: 150, coins: 70, gems: 0 },
    power_up: "5050",
    power_up_count: 1,
    color_theme: "rose",
    icon: "television",
    requires_tag: "movies",
  },
  {
    mission_id: "category_music",
    title: "მელომანი",
    description: "ითამაშე მუსიკის კატეგორიაში",
    beginner: { target: 1, xp: 150, coins: 60, gems: 0 },
    advanced: { target: 1, xp: 150, coins: 70, gems: 0 },
    power_up: "freeze",
    power_up_count: 1,
    color_theme: "purple",
    icon: "music",
    requires_tag: "music",
  },
  {
    mission_id: "category_animals",
    title: "ველური სამყარო",
    description: "ითამაშე ცხოველების კატეგორიაში",
    beginner: { target: 1, xp: 150, coins: 60, gems: 0 },
    advanced: { target: 1, xp: 150, coins: 70, gems: 0 },
    power_up: "replace",
    power_up_count: 1,
    color_theme: "emerald",
    icon: "map",
    requires_tag: "animals",
  },
  {
    mission_id: "category_sports",
    title: "სპორტული სული",
    description: "ითამაშე სპორტის კატეგორიაში",
    beginner: { target: 1, xp: 150, coins: 60, gems: 0 },
    advanced: { target: 1, xp: 150, coins: 70, gems: 0 },
    power_up: "5050",
    power_up_count: 1,
    color_theme: "orange",
    icon: "trophy",
    requires_tag: "sports",
  },
  {
    mission_id: "category_cuisine",
    title: "გემოვნების ექსპერტი",
    description: "ითამაშე ქართული სამზარეულოს კატეგორიაში",
    beginner: { target: 1, xp: 150, coins: 60, gems: 0 },
    advanced: { target: 1, xp: 150, coins: 70, gems: 0 },
    power_up: "freeze",
    power_up_count: 1,
    color_theme: "amber",
    icon: "hearts",
    requires_tag: "georgian_cuisine",
  },
  {
    mission_id: "invite_to_play",
    title: "მოიწვიე მეგობარი",
    description: "მოიწვიე მეგობარი თამაშში",
    beginner: { target: 1, xp: 170, coins: 80, gems: 0 },
    advanced: { target: 1, xp: 180, coins: 100, gems: 0 },
    power_up: "replace",
    power_up_count: 1,
    color_theme: "cyan",
    icon: "hearts",
  },
];

// There are no weekly missions. Dailies are the whole game: finish every
// mission on all seven days and the week package (WEEK_BONUS) pays out. The
// weekly pool that lived here read as a second, impossible set of dailies —
// "win 10 games" on a card next to "win 1 game" — and splitting the player's
// attention between two ladders made both feel worse. The rotation returns
// empty so no weekly row is ever created; rows from earlier weeks stay in
// the table and simply stop rendering.
const WEEKLY_POOL: PoolMission[] = [];

const DAILY_ACTIVE_COUNT = 5;
const WEEKLY_ACTIVE_COUNT = 0;
// Players with this many finished games get the advanced targets/rewards
const ADVANCED_GAMES_THRESHOLD = 30;

/** The five missions that day's rotation runs, past or future. */
export function dailyPoolForDate(dateISO: string): PoolMission[] {
  return rotationForDate(DAILY_POOL, dateISO, DAILY_ACTIVE_COUNT);
}

function activeDailyPool(): PoolMission[] {
  return dailyPoolForDate(todayKey());
}

function activeWeeklyPool(): PoolMission[] {
  const weekNumber = Math.floor(Date.now() / (7 * 86_400_000));
  const start = ((weekNumber % WEEKLY_POOL.length) + WEEKLY_POOL.length) % WEEKLY_POOL.length;
  return Array.from({ length: Math.min(WEEKLY_ACTIVE_COUNT, WEEKLY_POOL.length) }, (_, i) =>
    WEEKLY_POOL[(start + i) % WEEKLY_POOL.length]
  );
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
  | "tv_played"
  | "friend_invited"
  /**
   * Asking someone into a room you are hosting. Separate from
   * `friend_invited`, which is sending a friend *request*: the two missions
   * ask for different things — "invite a friend to a game" against "add N new
   * friends" — and inviting someone you are already friends with must not
   * advance the one about making new ones.
   */
  | "invited_to_room";

const EVENT_MISSIONS: Record<MissionEvent, string[]> = {
  game_played: ["play_games"],
  correct_answers: ["answer_correct"],
  game_won: ["win_games"],
  categories_played: [
    "play_categories",
    // Tag-gated: only the category named advances these.
    "category_movies",
    "category_music",
    "category_animals",
    "category_sports",
    "category_cuisine",
  ],
  perfect_win: ["perfect_round"],
  friend_game: ["play_friend"],
  tv_played: ["play_tv"],
  // "დაამატე {n} ახალი მეგობარი" — new friends, so only a friend request.
  friend_invited: [],
  // "მოიწვიე მეგობარი თამაშში" — invite a friend into a game. This is the
  // event that says so. It used to hang off friend_invited, which fires only
  // when a friend *request* is sent, so inviting a friend you already had into
  // a room — the obvious way to complete a mission worded like this — advanced
  // nothing at all.
  invited_to_room: ["invite_to_play"],
};

// Export mission helpers for UI
const ALL_POOL: PoolMission[] = [...DAILY_POOL, ...WEEKLY_POOL];

export function getMissionTheme(missionId: string) {
  const all = ALL_POOL;
  const mission = all.find((m) => m.mission_id === missionId);
  return mission ? MISSION_THEMES[mission.color_theme] : MISSION_THEMES.blue;
}

export function getMissionIcon(missionId: string): MissionIconKey {
  const all = ALL_POOL;
  return all.find((m) => m.mission_id === missionId)?.icon || "check";
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
  const { recordDailyCompletion, claimStreakBonus } = useMissionStreak();
  const { checkAndUnlockAchievements } = useMissionAchievements();
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
        // A credit, so it goes through the grant path — update_user_currency
        // refuses positive deltas from a signed-in caller now.
        const { data: currencyData, error: currencyError } = await supabase.rpc(
          "credit_gameplay_reward",
          {
            p_kind: "mission",
            p_coins: mission.reward_coins || 0,
            p_gems: mission.reward_gems || 0,
            p_reference: mission.mission_id,
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
        // Increment RPC, not an absolute write from a snapshot: a game
        // settling at the same moment used to erase this XP (or lose its
        // own) — last absolute write won.
        const { data: statsData, error: statsError } = await supabase.rpc(
          "increment_profile_stats",
          { p_points: Math.min(mission.reward_xp, 5000) },
        );
        if (statsError) throw statsError;
        if (statsData) setProfileLocal(statsData as Record<string, number>);
      }

      if (mission.reward_power_up && mission.reward_power_up_count > 0) {
        // Atomic upsert-increment — the read-add-write it replaces could
        // drop a grant landing alongside a level-up's.
        const { error: powerError } = await supabase.rpc("adjust_power_up", {
          p_type: mission.reward_power_up,
          p_delta: mission.reward_power_up_count,
        });
        if (powerError) throw powerError;
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

  /**
   * Called when a daily mission completes: if it was the last one the day
   * asked for, close the day out.
   *
   * Two things happen here that nothing else in the app was doing. The
   * streak row gets its day recorded — useMissionStreak has always exposed
   * recordDailyCompletion() and nothing ever called it, so last_completion_date
   * stayed null, the streak never left its starting value, and WeekMissionsStrip,
   * which colours a day from exactly those two fields, marked finished days
   * "failed" the moment they were in the past. And the day bonus is paid, so
   * clearing a whole day is worth marginally more than the missions in it.
   *
   * The write is conditional on the row not already being there, the same
   * shape the week bonus uses: two missions finishing in the same second
   * both see an unfinished day otherwise, and both pay.
   */
  const closeOutDayIfFinished = useCallback(
    async (justCompletedId: string) => {
      if (!user) return;
      const today = todayKey();

      const { data: rows, error } = await supabase
        .from("user_missions")
        .select("id, mission_id, completed")
        .eq("user_id", user.id)
        .eq("mission_date", today)
        .eq("mission_type", "daily");
      if (error || !rows) return;

      // The row for the mission that just finished may still read false here:
      // this runs right after its update and the select can race it.
      const need = dailyPoolForDate(today).map((m) => m.mission_id);
      const done = new Set(
        rows.filter((r) => r.completed || r.id === justCompletedId).map((r) => r.mission_id)
      );
      if (!need.every((id) => done.has(id))) return;

      // One ledger row per day. Unique on (user, mission_id, date), so a
      // second caller inserts nothing and the update below finds no row.
      await supabase.from("user_missions").upsert(
        [
          {
            user_id: user.id,
            mission_id: DAY_BONUS.mission_id,
            mission_title: "day_bonus",
            mission_description: null,
            target_value: 1,
            current_progress: 1,
            completed: true,
            reward_xp: DAY_BONUS.xp,
            reward_coins: DAY_BONUS.coins,
            reward_gems: DAY_BONUS.gems,
            reward_power_up: null,
            reward_power_up_count: 0,
            mission_date: today,
            mission_type: "daily",
          },
        ],
        { onConflict: "user_id,mission_id,mission_date", ignoreDuplicates: true }
      );

      const { data: won } = await supabase
        .from("user_missions")
        .update({ reward_claimed: true })
        .eq("user_id", user.id)
        .eq("mission_id", DAY_BONUS.mission_id)
        .eq("mission_date", today)
        .eq("reward_claimed", false)
        .select("id");
      if (!won || won.length === 0) return;

      // The streak first: the strip reads it, and it should be right even if
      // the payout below throws.
      const streakResult = await recordDailyCompletion();

      // And the tier that streak has reached. claimStreakBonus existed from
      // the beginning and nothing ever called it, so the whole ladder — 25
      // coins at one day up to 300 and 15 gems at thirty — has never paid
      // anybody. The count comes from the call above rather than from hook
      // state, which has not re-rendered yet and still holds yesterday's.
      if (streakResult?.newStreak) {
        await claimStreakBonus(streakResult.newStreak);
      }

      // And the achievements those two numbers unlock. The catalogue —
      // eight of them, titles and descriptions written and translated, coins
      // and gems attached — has existed since user_achievements was created,
      // and checkAndUnlockAchievements was never called from anywhere. The
      // profile's Rewards tab reads that table, so it has shown "no rewards
      // yet" to every player who ever opened it, including players thirty
      // days into a streak.
      try {
        const unlocked = await checkAndUnlockAchievements(
          streakResult?.newStreak ?? 0,
          streakResult?.newTotal ?? 0
        );
        for (const achievement of unlocked) {
          toast.success(achievement.title, { description: achievement.description });
          void createNotification(
            user.id,
            "reward",
            achievement.title,
            achievement.description,
            { achievement_id: achievement.id, coins: achievement.reward_coins, gems: achievement.reward_gems, xp: 0 }
          );
        }
      } catch (error) {
        console.error("Achievement check failed:", error);
      }

      const { data: currency } = await supabase.rpc("credit_gameplay_reward", {
        p_kind: "mission",
        p_coins: DAY_BONUS.coins,
        p_gems: DAY_BONUS.gems,
        p_reference: DAY_BONUS.mission_id,
      });
      if (currency && currency.length > 0) {
        setProfileLocal({ coins: currency[0].new_coins, gems: currency[0].new_gems });
      }
      if (profile) {
        const { data: bonusStats } = await supabase.rpc("increment_profile_stats", {
          p_points: Math.min(DAY_BONUS.xp, 5000),
        });
        if (bonusStats) setProfileLocal(bonusStats as Record<string, number>);
      }

      void createNotification(
        user.id,
        "reward",
        t("missions.dayCompleteTitle"),
        `${t("missions.rewardLabel")}: ${DAY_BONUS.coins} ${t("common.coins")} · ${DAY_BONUS.xp} XP`,
        { mission_id: DAY_BONUS.mission_id, coins: DAY_BONUS.coins, gems: 0, xp: DAY_BONUS.xp }
      );
      // Chips with the app's own coin/XP art, not a text receipt. This is a
      // .ts file, so the JSX lives in MissionCompleteToast.tsx and is built
      // here with createElement.
      toast.success(t("missions.dayCompleteTitle"), {
        description: createElement(RewardChipsRow, { coins: DAY_BONUS.coins, xp: DAY_BONUS.xp }),
      });
    },
    [user, profile, recordDailyCompletion, claimStreakBonus, checkAndUnlockAchievements, setProfileLocal, updateProfile]
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

          // Written in the language the player is in right now, and read back
          // through the notification translator, which rebuilds it from the
          // numbers stored alongside — so the row still reads correctly to
          // someone who switches language tomorrow.
          const name = missionTitle(mission.mission_id, mission.mission_title);
          const rewardBits = [
            mission.reward_coins > 0 ? `${mission.reward_coins} ${t("common.coins")}` : null,
            mission.reward_gems > 0 ? `${mission.reward_gems} ${t("common.gems")}` : null,
            mission.reward_xp > 0 ? `${mission.reward_xp} XP` : null,
          ].filter(Boolean).join(" · ");

          void createNotification(
            user.id,
            "reward",
            t("missions.completedTitle", { mission: name }),
            rewardBits ? `${t("missions.rewardLabel")}: ${rewardBits}` : undefined,
            {
              mission_id: mission.mission_id,
              coins: mission.reward_coins,
              gems: mission.reward_gems,
              xp: mission.reward_xp,
              power_up: mission.reward_power_up,
              power_up_count: mission.reward_power_up_count,
            }
          );

          toast.success(t("missions.completedTitle", { mission: name }), {
            description: createElement(RewardChipsRow, {
              coins: mission.reward_coins,
              gems: mission.reward_gems,
              xp: mission.reward_xp,
              powerUp: mission.reward_power_up,
              powerUpCount: mission.reward_power_up_count,
            }),
          });

          // Was that the last one the day asked for? Only dailies count —
          // weekly missions run across the whole week and finishing one says
          // nothing about today.
          if (mission.mission_type === "daily") {
            void closeOutDayIfFinished(mission.id);
          }
        }

        return {
          completed: isCompleted,
          xpEarned: isCompleted ? mission.reward_xp : 0,
          missionTitle: missionTitle(mission.mission_id, mission.mission_title),
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
    [user, dailyMissions, weeklyMissions, grantMissionRewards, closeOutDayIfFinished]
  );

  // Report a gameplay EVENT — advances every active daily + weekly mission
  // listening to it. This is what game code should call.
  const trackMissionEvent = useCallback(
    async (event: MissionEvent, amount: number = 1, tag?: string) => {
      const ids = EVENT_MISSIONS[event] || [];
      const results = [];
      for (const id of ids) {
        const def = ALL_POOL.find((m) => m.mission_id === id);
        // A mission that names a category only moves for that category.
        if (def?.requires_tag && def.requires_tag !== tag) continue;
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

// ---------- One day at a time ----------

export interface DayMissions {
  kind: DayKind;
  missions: Mission[];
  loading: boolean;
}

// A pool entry dressed as a mission row for a day that has none: future days
// are a preview, so nothing is written and progress reads zero. The id is
// synthetic and never reaches the database.
function previewRow(m: PoolMission, tier: "beginner" | "advanced", dateISO: string): Mission {
  const t = m[tier];
  return {
    id: `preview-${dateISO}-${m.mission_id}`,
    mission_id: m.mission_id,
    mission_title: m.title,
    mission_description: m.description.replace("{n}", String(t.target)),
    target_value: t.target,
    current_progress: 0,
    reward_xp: t.xp,
    reward_coins: t.coins,
    reward_gems: t.gems,
    reward_power_up: m.power_up || null,
    reward_power_up_count: m.power_up_count || 0,
    completed: false,
    completed_at: null,
    reward_claimed: false,
    mission_type: "daily",
  };
}

/**
 * One day's daily missions, whichever day it is.
 *
 * A past day reads back exactly what was stored — that is the history, and
 * it must never be created or back-filled, or opening last Tuesday would
 * mint missions the player never had a chance at. A future day has no rows
 * by design and is previewed from the same rotation that will create them.
 * Today defers to the live query so progress and realtime keep working.
 */
export function useDailyMissionsFor(dateISO: string | null): DayMissions {
  const { user, profile } = useAuth();
  const live = useMissions();
  const today = todayKey();
  const date = dateISO ?? today;
  const kind = dayKindOf(date, today);
  const tier = tierOf(profile?.games_played || 0);

  const { data, isLoading } = useQuery({
    queryKey: ["missions-day", user?.id, date],
    queryFn: async (): Promise<Mission[]> => {
      const { data: rows, error } = await supabase
        .from("user_missions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("mission_date", date)
        .eq("mission_type", "daily");
      if (error) throw error;
      // Deliberately NOT filtered against dailyPoolForDate(date): the rows
      // are the history, whatever pool minted them. An older build (the
      // TestFlight app, a cached web bundle) hands out that day's dailies
      // from the pool it shipped with, and after a pool rework those ids are
      // no longer in the current rotation — the old filter then hid the whole
      // day as "no missions available" even though the player did them.
      // Unknown ids render fine: missionTitle falls back to the stored title
      // and getMissionIcon to the default.
      return (rows || []) as Mission[];
    },
    enabled: !!user && kind === "past",
    staleTime: 5 * 60 * 1000,
  });

  if (kind === "today") {
    return { kind, missions: live.dailyMissions, loading: live.loading };
  }
  if (kind === "future") {
    return {
      kind,
      missions: dailyPoolForDate(date).map((m) => previewRow(m, tier, date)),
      loading: false,
    };
  }
  return { kind, missions: data || [], loading: isLoading };
}

// ---------- End-of-week bonus ----------

/**
 * The prize for finishing every day of the week.
 *
 * Deliberately a mixed package rather than a pile of one currency: coins to
 * spend, gems to save, and a couple of power-ups to actually change a game.
 */
// Seven perfect days. This has to beat any single day by a wide margin —
// that is the whole reason to keep going on day five — so it carries the
// gems the dailies no longer pay, plus more coins and XP than a day can
// produce, plus the confetti.
export const WEEK_BONUS = {
  mission_id: "week_bonus",
  coins: 2000,
  gems: 10,
  xp: 250,
  power_up_count: 2,
} as const;

// Finishing everything a single day asked for. Small on purpose: it is a nod
// for the day, not a second payday on top of the missions themselves, and it
// is what keeps the streak worth defending between the big weekly payout.
export const DAY_BONUS = {
  mission_id: "day_bonus",
  coins: 150,
  gems: 0,
  xp: 40,
} as const;

export interface WeekBonusState {
  /** Days of this week whose whole rotation is finished. */
  daysComplete: number;
  /** Days that have actually happened — you cannot finish tomorrow. */
  daysElapsed: number;
  claimable: boolean;
  claimed: boolean;
  loading: boolean;
  claim: () => Promise<boolean>;
}

/**
 * Progress toward the week bonus, and the one-shot claim.
 *
 * The claim is guarded by a conditional UPDATE against the row's
 * reward_claimed flag rather than a read-then-write: two taps in the same
 * moment both pass a read, and this reward is large enough that granting it
 * twice matters. Only the update that actually flips the flag comes back
 * with a row, and only that caller pays out.
 */
export function useWeekBonus(): WeekBonusState {
  const { user, profile, updateProfile, setProfileLocal } = useAuth();
  const queryClient = useQueryClient();
  const today = todayKey();
  const weekStart = weekStartOf(today);

  const { data, isLoading } = useQuery({
    queryKey: ["week-bonus", user?.id, weekStart],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("user_missions")
        .select("mission_id, mission_date, completed, reward_claimed, mission_type")
        .eq("user_id", user!.id)
        .gte("mission_date", weekStart)
        .lte("mission_date", today);
      if (error) throw error;

      const byDate = new Map<string, { done: number; ids: Set<string> }>();
      for (const r of rows || []) {
        if (r.mission_type !== "daily") continue;
        const slot = byDate.get(r.mission_date) || { done: 0, ids: new Set<string>() };
        slot.ids.add(r.mission_id);
        if (r.completed) slot.done++;
        byDate.set(r.mission_date, slot);
      }

      // A day counts only when every mission its own rotation ran is done.
      let daysComplete = 0;
      let daysElapsed = 0;
      for (let i = 0; i < 7; i++) {
        const day = new Date(Date.parse(`${weekStart}T00:00:00Z`) + i * 86_400_000)
          .toISOString()
          .slice(0, 10);
        if (day > today) break;
        daysElapsed++;
        const need = dailyPoolForDate(day).map((m) => m.mission_id);
        const slot = byDate.get(day);
        if (slot && need.every((id) => slot.ids.has(id)) && slot.done >= need.length) {
          daysComplete++;
        }
      }

      const claimed = (rows || []).some(
        (r) => r.mission_id === WEEK_BONUS.mission_id && r.reward_claimed
      );
      return { daysComplete, daysElapsed, claimed };
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const daysComplete = data?.daysComplete ?? 0;
  const daysElapsed = data?.daysElapsed ?? 0;
  const claimed = data?.claimed ?? false;
  // Every day so far, and the week actually run to its end.
  const claimable = !claimed && daysElapsed >= 7 && daysComplete >= 7;

  const claim = useCallback(async (): Promise<boolean> => {
    if (!user || !profile || !claimable) return false;

    // The ledger row. mission_id + mission_date + user is unique, so this
    // creates exactly one per week no matter how often it runs.
    await supabase.from("user_missions").upsert(
      [
        {
          user_id: user.id,
          mission_id: WEEK_BONUS.mission_id,
          mission_title: "week_bonus",
          mission_description: null,
          target_value: 7,
          current_progress: 7,
          completed: true,
          reward_xp: WEEK_BONUS.xp,
          reward_coins: WEEK_BONUS.coins,
          reward_gems: WEEK_BONUS.gems,
          reward_power_up: weekBonusPowerUp(weekStart),
          reward_power_up_count: WEEK_BONUS.power_up_count,
          mission_date: weekStart,
          mission_type: "weekly",
        },
      ],
      { onConflict: "user_id,mission_id,mission_date", ignoreDuplicates: true }
    );

    // Whoever flips the flag pays out; a second caller gets no row back.
    const { data: won, error } = await supabase
      .from("user_missions")
      .update({ reward_claimed: true })
      .eq("user_id", user.id)
      .eq("mission_id", WEEK_BONUS.mission_id)
      .eq("mission_date", weekStart)
      .eq("reward_claimed", false)
      .select("id");
    if (error || !won || won.length === 0) return false;

    const { data: currency, error: currencyError } = await supabase.rpc(
      "credit_gameplay_reward",
      {
        p_kind: "mission",
        p_coins: WEEK_BONUS.coins,
        p_gems: WEEK_BONUS.gems,
        p_reference: WEEK_BONUS.mission_id,
      }
    );

    // The flag above is the double-claim guard, so it has to be set before the
    // payout — which means a payout that fails has to give it back. This
    // error was being discarded: the guard stayed set, the currency never
    // arrived, and seven perfect days paid nothing but confetti. Putting the
    // flag back leaves the package claimable, so the next attempt can pay.
    if (currencyError) {
      console.error("[weekBonus] credit failed, releasing the claim", currencyError);
      await supabase
        .from("user_missions")
        .update({ reward_claimed: false })
        .eq("user_id", user.id)
        .eq("mission_id", WEEK_BONUS.mission_id)
        .eq("mission_date", weekStart);
      queryClient.invalidateQueries({ queryKey: ["week-bonus", user.id, weekStart] });
      return false;
    }

    if (currency && currency.length > 0) {
      setProfileLocal({ coins: currency[0].new_coins, gems: currency[0].new_gems });
    }
    await updateProfile({ total_points: (profile.total_points || 0) + WEEK_BONUS.xp });

    const powerUp = weekBonusPowerUp(weekStart);
    const { data: owned } = await supabase
      .from("user_power_ups")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("power_up_type", powerUp)
      .maybeSingle();
    if (owned) {
      await supabase
        .from("user_power_ups")
        .update({ quantity: (owned.quantity || 0) + WEEK_BONUS.power_up_count })
        .eq("id", owned.id);
    } else {
      await supabase
        .from("user_power_ups")
        .insert({ user_id: user.id, power_up_type: powerUp, quantity: WEEK_BONUS.power_up_count });
    }

    queryClient.invalidateQueries({ queryKey: ["user-power-ups", user.id] });
    queryClient.invalidateQueries({ queryKey: ["week-bonus", user.id, weekStart] });
    return true;
  }, [user, profile, claimable, weekStart, setProfileLocal, updateProfile, queryClient]);

  return { daysComplete, daysElapsed, claimable, claimed, loading: isLoading, claim };
}
