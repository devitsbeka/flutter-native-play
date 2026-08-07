import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  getGuestProgress,
  saveGuestLevelProgress,
  clearGuestProgress,
  hasGuestProgress,
  GuestLevelProgress,
} from "./useGuestProgress";
import { getGuestGameLog, clearGuestPlays, logGuestGameComplete } from "./useGuestPlays";

interface LevelProgress {
  level_number: number;
  stars_earned: number;
  score: number;
  total_questions: number;
  completed_at: string;
}

interface CategoryProgressData {
  categoryId: string;
  completedLevels: LevelProgress[];
  currentLevel: number;
  totalStars: number;
}

// ---------- Pure helpers ----------

function calculateCurrentLevels(progressByCategory: Record<string, CategoryProgressData>) {
  Object.values(progressByCategory).forEach((catProgress) => {
    const completedSet = new Set(catProgress.completedLevels.map((l) => l.level_number));
    let nextLevel = 1;
    while (completedSet.has(nextLevel)) {
      nextLevel++;
    }
    catProgress.currentLevel = nextLevel;
  });
}

function buildGuestProgress(): Record<string, CategoryProgressData> {
  const guestProgress = getGuestProgress();
  const progressByCategory: Record<string, CategoryProgressData> = {};

  Object.entries(guestProgress).forEach(([categoryId, catProgress]) => {
    progressByCategory[categoryId] = {
      categoryId,
      completedLevels: catProgress.completedLevels.map((l: GuestLevelProgress) => ({
        level_number: l.level_number,
        stars_earned: l.stars_earned,
        score: l.score,
        total_questions: l.total_questions,
        completed_at: l.completed_at,
      })),
      currentLevel: 1,
      totalStars: catProgress.completedLevels.reduce(
        (sum: number, l: GuestLevelProgress) => sum + l.stars_earned,
        0
      ),
    };
  });

  calculateCurrentLevels(progressByCategory);
  return progressByCategory;
}

async function transferGuestProgressToDb(userId: string) {
  // Transfer level progress
  if (hasGuestProgress()) {
    const guestProgress = getGuestProgress();

    try {
      for (const [categoryId, catProgress] of Object.entries(guestProgress)) {
        for (const level of catProgress.completedLevels) {
          await supabase.from("user_level_progress").upsert(
            {
              user_id: userId,
              category_id: categoryId,
              level_number: level.level_number,
              stars_earned: level.stars_earned,
              score: level.score,
              total_questions: level.total_questions,
              completed_at: level.completed_at,
            },
            { onConflict: "user_id,category_id,level_number" }
          );
        }
      }
      clearGuestProgress();
    } catch (err) {
      console.error("Error transferring guest progress:", err);
    }
  }

  // Transfer guest game log → game_plays rows (retroactive)
  const gameLog = getGuestGameLog();
  if (gameLog.length > 0) {
    try {
      const rows = gameLog.map((g) => ({
        user_id: userId,
        category_id: g.categoryId,
        level_number: g.levelNumber,
        game_type: g.gameType,
        score: g.score,
        total_questions: g.totalQuestions,
        stars_earned: g.starsEarned,
        played_at: g.playedAt,
      }));
      await supabase.from("game_plays").insert(rows);
      clearGuestPlays();
    } catch (err) {
      console.error("Error transferring guest game log:", err);
    }
  }
}

async function fetchUserProgress(userId: string): Promise<Record<string, CategoryProgressData>> {
  await transferGuestProgressToDb(userId);

  const { data, error } = await supabase
    .from("user_level_progress")
    .select("*")
    .eq("user_id", userId)
    .order("level_number", { ascending: true });

  if (error) {
    console.error("Error fetching progress:", error);
    return {};
  }

  const progressByCategory: Record<string, CategoryProgressData> = {};

  if (data) {
    data.forEach((record) => {
      const catId = record.category_id;
      if (!progressByCategory[catId]) {
        progressByCategory[catId] = {
          categoryId: catId,
          completedLevels: [],
          currentLevel: 1,
          totalStars: 0,
        };
      }
      progressByCategory[catId].completedLevels.push({
        level_number: record.level_number,
        stars_earned: record.stars_earned,
        score: record.score,
        total_questions: record.total_questions,
        completed_at: record.completed_at,
      });
      progressByCategory[catId].totalStars += record.stars_earned;
    });
  }

  calculateCurrentLevels(progressByCategory);
  return progressByCategory;
}

// ---------- Module-level realtime subscription (ref-counted singleton) ----------

let activeChannel: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;
let subscribedUserId: string | null = null;

function subscribeRealtime(userId: string, onUpdate: () => void): () => void {
  subscriberCount++;

  if (!activeChannel || subscribedUserId !== userId) {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
    }
    subscribedUserId = userId;
    activeChannel = supabase
      .channel(`category-progress-shared-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_level_progress",
          filter: `user_id=eq.${userId}`,
        },
        onUpdate
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

export function useCategoryProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["category-progress", user?.id ?? "guest"];

  const { data: progress = {} as Record<string, CategoryProgressData>, isLoading: loading } =
    useQuery({
      queryKey,
      queryFn: () =>
        user ? fetchUserProgress(user.id) : Promise.resolve(buildGuestProgress()),
      staleTime: 30 * 1000, // 30s — progress rarely changes between navigations
      gcTime: 5 * 60 * 1000,
    });

  // Single shared realtime subscription across all callers
  useEffect(() => {
    if (!user) return;
    return subscribeRealtime(user.id, () => {
      queryClient.invalidateQueries({ queryKey: ["category-progress", user.id] });
    });
  }, [user?.id, queryClient]);

  const getCategoryProgress = useCallback(
    (categoryId: string): number => {
      return progress[categoryId]?.currentLevel || 1;
    },
    [progress]
  );

  const getLevelStars = useCallback(
    (categoryId: string, levelNumber: number): number => {
      const catProgress = progress[categoryId];
      if (!catProgress) return 0;
      const level = catProgress.completedLevels.find((l) => l.level_number === levelNumber);
      return level?.stars_earned || 0;
    },
    [progress]
  );

  const isLevelCompleted = useCallback(
    (categoryId: string, levelNumber: number): boolean => {
      const catProgress = progress[categoryId];
      if (!catProgress) return false;
      return catProgress.completedLevels.some(
        (l) => l.level_number === levelNumber && l.stars_earned >= 1
      );
    },
    [progress]
  );

  const isCategoryUnlocked = useCallback((_categoryId: string): boolean => {
    return true;
  }, []);

  const getTotalProgress = useCallback((): number => {
    return Object.values(progress).reduce((sum, p) => sum + p.completedLevels.length, 0);
  }, [progress]);

  const getTotalStars = useCallback((): number => {
    return Object.values(progress).reduce((sum, p) => sum + p.totalStars, 0);
  }, [progress]);

  const updateLevelProgress = useCallback(
    async (
      categoryId: string,
      levelNumber: number,
      score: number,
      totalQuestions: number,
      categoryTotalLevels: number = 20
    ): Promise<{ success: boolean; stars: number; unlockedLevel?: number }> => {
      const percentage = (score / totalQuestions) * 100;
      let stars = 0;
      if (percentage >= 80) stars = 3;
      else if (percentage >= 60) stars = 2;
      else if (percentage >= 40) stars = 1;

      const currentMax = progress[categoryId]?.currentLevel || 1;
      const canUnlockNext = stars >= 1 && levelNumber >= currentMax && levelNumber < categoryTotalLevels;
      const unlockedLevel = canUnlockNext ? levelNumber + 1 : undefined;

      if (!user) {
        if (stars > 0) {
          saveGuestLevelProgress(categoryId, levelNumber, score, totalQuestions, stars);
        }

        // Log guest game for retroactive game_plays insertion on signup
        logGuestGameComplete({
          categoryId,
          levelNumber,
          gameType: "category",
          score,
          totalQuestions,
          starsEarned: stars,
        });

        // Optimistic update for guest
        queryClient.setQueryData<Record<string, CategoryProgressData>>(queryKey, (prev) => {
          const updated = { ...(prev || {}) };
          if (!updated[categoryId]) {
            updated[categoryId] = {
              categoryId,
              completedLevels: [],
              currentLevel: 1,
              totalStars: 0,
            };
          }

          if (stars >= 1) {
            const existingIndex = updated[categoryId].completedLevels.findIndex(
              (l) => l.level_number === levelNumber
            );

            const levelData: LevelProgress = {
              level_number: levelNumber,
              stars_earned: stars,
              score,
              total_questions: totalQuestions,
              completed_at: new Date().toISOString(),
            };

            if (existingIndex >= 0) {
              if (stars > updated[categoryId].completedLevels[existingIndex].stars_earned) {
                const oldStars = updated[categoryId].completedLevels[existingIndex].stars_earned;
                updated[categoryId] = {
                  ...updated[categoryId],
                  completedLevels: updated[categoryId].completedLevels.map((l, i) =>
                    i === existingIndex ? levelData : l
                  ),
                  totalStars: updated[categoryId].totalStars + (stars - oldStars),
                };
              }
            } else {
              updated[categoryId] = {
                ...updated[categoryId],
                completedLevels: [...updated[categoryId].completedLevels, levelData],
                totalStars: updated[categoryId].totalStars + stars,
              };
            }

            // Recalculate current level
            const completedLevelNumbers = updated[categoryId].completedLevels
              .filter((l) => l.stars_earned >= 1)
              .map((l) => l.level_number);
            let nextLevel = 1;
            while (completedLevelNumbers.includes(nextLevel)) {
              nextLevel++;
            }
            updated[categoryId] = { ...updated[categoryId], currentLevel: nextLevel };
          }

          return updated;
        });

        return { success: true, stars, unlockedLevel };
      }

      try {
        // Log game play
        await supabase.from("game_plays").insert({
          user_id: user.id,
          category_id: categoryId,
          level_number: levelNumber,
          game_type: "category",
          score,
          total_questions: totalQuestions,
          stars_earned: stars,
        });

        // Check existing progress
        const { data: existingProgress } = await supabase
          .from("user_level_progress")
          .select("stars_earned, score")
          .eq("user_id", user.id)
          .eq("category_id", categoryId)
          .eq("level_number", levelNumber)
          .maybeSingle();

        const shouldUpdate = !existingProgress || score > existingProgress.score;

        if (shouldUpdate) {
          const { error } = await supabase.from("user_level_progress").upsert(
            {
              user_id: user.id,
              category_id: categoryId,
              level_number: levelNumber,
              stars_earned: Math.max(stars, existingProgress?.stars_earned || 0),
              score: Math.max(score, existingProgress?.score || 0),
              total_questions: totalQuestions,
              completed_at: existingProgress
                ? existingProgress.score < score
                  ? new Date().toISOString()
                  : undefined
                : new Date().toISOString(),
            },
            { onConflict: "user_id,category_id,level_number" }
          );

          if (error) {
            console.error("Error saving level progress:", error);
            return { success: false, stars: 0 };
          }
        }

        // Update profile stats — XP only for a first completion or an
        // improved score, and only for the improvement itself. Without this
        // gate, replaying an already-beaten level re-awarded the full
        // points every single time (free XP farming).
        const prevScore = existingProgress?.score || 0;
        const prevStars = existingProgress?.stars_earned || 0;
        const pointsEarned = shouldUpdate
          ? Math.max(0, (score - prevScore) * 10 + Math.max(0, stars - prevStars) * 20)
          : 0;

        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("total_points, games_played, games_won, current_streak, best_streak")
          .eq("user_id", user.id)
          .maybeSingle();

        if (currentProfile) {
          const gamesWon = percentage >= 60 ? 1 : 0;
          const newStreak = percentage >= 60 ? (currentProfile.current_streak || 0) + 1 : 0;
          const newBestStreak = Math.max(newStreak, currentProfile.best_streak || 0);

          await supabase
            .from("profiles")
            .update({
              total_points: (currentProfile.total_points || 0) + pointsEarned,
              games_played: (currentProfile.games_played || 0) + 1,
              games_won: (currentProfile.games_won || 0) + gamesWon,
              current_streak: newStreak,
              best_streak: newBestStreak,
            })
            .eq("user_id", user.id);
        }

        // Update category stats
        const { data: existingStats } = await supabase
          .from("category_stats")
          .select("*")
          .eq("user_id", user.id)
          .eq("category", categoryId)
          .maybeSingle();

        if (existingStats) {
          await supabase
            .from("category_stats")
            .update({
              total_answers: (existingStats.total_answers || 0) + totalQuestions,
              correct_answers: (existingStats.correct_answers || 0) + score,
            })
            .eq("id", existingStats.id);
        } else {
          await supabase.from("category_stats").insert({
            user_id: user.id,
            category: categoryId,
            total_answers: totalQuestions,
            correct_answers: score,
          });
        }

        // Update user_category_last_seen — table FK expects categories.id (UUID), not slug
        const { data: catRow } = await supabase
          .from("categories")
          .select("id")
          .eq("category_id", categoryId)
          .maybeSingle();

        if (catRow) {
          await supabase.from("user_category_last_seen").upsert(
            {
              user_id: user.id,
              category_id: catRow.id,
              last_seen_total_levels: categoryTotalLevels,
            },
            { onConflict: "user_id,category_id" }
          );
        }

        // No manual invalidateQueries needed — the realtime subscription
        // on user_level_progress already triggers a refetch.

        return { success: true, stars, unlockedLevel };
      } catch (err) {
        console.error("Error in updateLevelProgress:", err);
        return { success: false, stars: 0 };
      }
    },
    [user, progress, queryClient, queryKey]
  );

  const getMapLevels = useCallback(
    (categoriesList?: { id: string; icon: string }[]) => {
      const totalLevels = 30;

      const allCompletedLevels: Map<string, { stars: number }> = new Map();

      Object.values(progress).forEach((catProgress) => {
        catProgress.completedLevels.forEach((level) => {
          const key = `${catProgress.categoryId}-${level.level_number}`;
          allCompletedLevels.set(key, { stars: level.stars_earned });
        });
      });

      const totalCompleted = Object.values(progress).reduce(
        (sum, p) => sum + p.completedLevels.length,
        0
      );

      if (!categoriesList || categoriesList.length === 0) {
        return Array.from({ length: totalLevels }, (_, i) => ({
          id: i + 1,
          categoryId: "unknown",
          categoryIcon: "\u{1F4DA}",
          isCompleted: false,
          isUnlocked: i === 0,
          isCurrent: i === 0,
          stars: 0,
        }));
      }

      return Array.from({ length: totalLevels }, (_, i) => {
        const levelNumber = i + 1;
        const categoryIndex = i % categoriesList.length;
        const cat = categoriesList[categoryIndex];
        const categoryLevelNumber = Math.floor(i / categoriesList.length) + 1;

        const key = `${cat.id}-${categoryLevelNumber}`;
        const completedData = allCompletedLevels.get(key);
        const isCompleted = !!completedData;

        const isUnlocked = levelNumber <= totalCompleted + 1;
        const isCurrent = levelNumber === totalCompleted + 1;

        return {
          id: levelNumber,
          categoryId: cat.id,
          categoryIcon: cat.icon,
          isCompleted,
          isUnlocked,
          isCurrent,
          stars: completedData?.stars || 0,
        };
      });
    },
    [progress]
  );

  const getLevelStats = useCallback(
    (categoryId: string, levelNumber: number): LevelProgress | null => {
      const catProgress = progress[categoryId];
      if (!catProgress) return null;
      return catProgress.completedLevels.find((l) => l.level_number === levelNumber) || null;
    },
    [progress]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    progress,
    loading,
    getCategoryProgress,
    getLevelStars,
    getLevelStats,
    isLevelCompleted,
    isCategoryUnlocked,
    getTotalProgress,
    getTotalStars,
    updateLevelProgress,
    getMapLevels,
    refetch,
  };
}
