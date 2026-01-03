import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  getGuestProgress,
  saveGuestLevelProgress,
  clearGuestProgress,
  hasGuestProgress,
  GuestLevelProgress,
} from "./useGuestProgress";

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

export function useCategoryProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, CategoryProgressData>>({});
  const [loading, setLoading] = useState(true);

  // Transfer guest progress to database when user logs in
  const transferGuestProgress = useCallback(async (userId: string) => {
    if (!hasGuestProgress()) return;
    
    const guestProgress = getGuestProgress();
    
    try {
      for (const [categoryId, catProgress] of Object.entries(guestProgress)) {
        for (const level of catProgress.completedLevels) {
          // Try to upsert each level progress
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
            {
              onConflict: "user_id,category_id,level_number",
            }
          );
        }
      }
      
      // Clear guest progress after successful transfer
      clearGuestProgress();
    } catch (err) {
      console.error("Error transferring guest progress:", err);
    }
  }, []);

  // Fetch real progress from database
  const fetchProgress = useCallback(async () => {
    // Initialize empty progress - we'll build it from the data we receive
    const progressByCategory: Record<string, CategoryProgressData> = {};

    if (!user) {
      // Load guest progress from localStorage
      const guestProgress = getGuestProgress();
      
      Object.entries(guestProgress).forEach(([categoryId, catProgress]) => {
        progressByCategory[categoryId] = {
          categoryId,
          completedLevels: catProgress.completedLevels.map(
            (l: GuestLevelProgress) => ({
              level_number: l.level_number,
              stars_earned: l.stars_earned,
              score: l.score,
              total_questions: l.total_questions,
              completed_at: l.completed_at,
            })
          ),
          currentLevel: 1,
          totalStars: catProgress.completedLevels.reduce(
            (sum: number, l: GuestLevelProgress) => sum + l.stars_earned,
            0
          ),
        };
      });

      // Calculate current level for each category
      Object.values(progressByCategory).forEach((catProgress) => {
        const completedLevelNumbers = catProgress.completedLevels.map((l) => l.level_number);
        let nextLevel = 1;
        while (completedLevelNumbers.includes(nextLevel)) {
          nextLevel++;
        }
        catProgress.currentLevel = nextLevel;
      });

      setProgress(progressByCategory);
      setLoading(false);
      return;
    }

    // User is logged in - transfer any guest progress first
    await transferGuestProgress(user.id);

    try {
      const { data, error } = await supabase
        .from("user_level_progress")
        .select("*")
        .eq("user_id", user.id)
        .order("level_number", { ascending: true });

      if (error) {
        console.error("Error fetching progress:", error);
        setLoading(false);
        return;
      }

      // Populate with actual data
      if (data) {
        data.forEach((record) => {
          const catId = record.category_id;
          // Initialize category if it doesn't exist
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

      // Calculate current level for each category (next unplayed level)
      Object.values(progressByCategory).forEach((catProgress) => {
        const completedLevelNumbers = catProgress.completedLevels.map((l) => l.level_number);
        let nextLevel = 1;
        while (completedLevelNumbers.includes(nextLevel)) {
          nextLevel++;
        }
        catProgress.currentLevel = nextLevel;
      });

      setProgress(progressByCategory);
    } catch (err) {
      console.error("Error in fetchProgress:", err);
    } finally {
      setLoading(false);
    }
  }, [user, transferGuestProgress]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("user_level_progress_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_level_progress",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch progress when changes occur
          fetchProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchProgress]);

  const getCategoryProgress = (categoryId: string): number => {
    return progress[categoryId]?.currentLevel || 1;
  };

  const getLevelStars = (categoryId: string, levelNumber: number): number => {
    const catProgress = progress[categoryId];
    if (!catProgress) return 0;
    const level = catProgress.completedLevels.find((l) => l.level_number === levelNumber);
    return level?.stars_earned || 0;
  };

  const isLevelCompleted = (categoryId: string, levelNumber: number): boolean => {
    const catProgress = progress[categoryId];
    if (!catProgress) return false;
    // Only consider completed if at least 1 star was earned
    return catProgress.completedLevels.some(
      (l) => l.level_number === levelNumber && l.stars_earned >= 1
    );
  };

  const isCategoryUnlocked = (categoryId: string): boolean => {
    // All categories are unlocked by default - users can play any category
    return true;
  };

  const getTotalProgress = (): number => {
    return Object.values(progress).reduce(
      (sum, p) => sum + p.completedLevels.length,
      0
    );
  };

  const getTotalStars = (): number => {
    return Object.values(progress).reduce((sum, p) => sum + p.totalStars, 0);
  };

  const updateLevelProgress = async (
    categoryId: string,
    levelNumber: number,
    score: number,
    totalQuestions: number
  ): Promise<{ success: boolean; stars: number; unlockedLevel?: number }> => {
    // Calculate stars based on score percentage
    const percentage = (score / totalQuestions) * 100;
    let stars = 0;
    if (percentage >= 100) stars = 3;
    else if (percentage >= 80) stars = 3;
    else if (percentage >= 60) stars = 2;
    else if (percentage >= 40) stars = 1;
    else if (percentage >= 20) stars = 1; // At least 1 star for trying (1/5 correct)

    // For unlocking: level is unlocked if stars >= 1 AND this is the current level or beyond
    const currentMax = progress[categoryId]?.currentLevel || 1;
    const unlockedLevel = stars >= 1 && levelNumber >= currentMax ? levelNumber + 1 : undefined;

    if (!user) {
      // Save to localStorage for guests - always save even with 0 stars to track attempts
      if (stars > 0) {
        saveGuestLevelProgress(categoryId, levelNumber, score, totalQuestions, stars);
      }
      
      // Update local state immediately for reactive UI
      setProgress((prev) => {
        const updated = { ...prev };
        if (!updated[categoryId]) {
          updated[categoryId] = {
            categoryId,
            completedLevels: [],
            currentLevel: 1,
            totalStars: 0,
          };
        }

        // Only count as completed if earned at least 1 star
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
            // Only update if new stars are better
            if (stars > updated[categoryId].completedLevels[existingIndex].stars_earned) {
              const oldStars = updated[categoryId].completedLevels[existingIndex].stars_earned;
              updated[categoryId].completedLevels[existingIndex] = levelData;
              updated[categoryId].totalStars += (stars - oldStars);
            }
          } else {
            updated[categoryId].completedLevels.push(levelData);
            updated[categoryId].totalStars += stars;
          }

          // Recalculate current level - find the first level not completed with at least 1 star
          const completedLevelNumbers = updated[categoryId].completedLevels
            .filter(l => l.stars_earned >= 1)
            .map((l) => l.level_number);
          let nextLevel = 1;
          while (completedLevelNumbers.includes(nextLevel)) {
            nextLevel++;
          }
          updated[categoryId].currentLevel = nextLevel;
        }

        return updated;
      });

      return { success: true, stars, unlockedLevel };
    }

    try {
      // Check if level was previously completed with a better score
      const { data: existingProgress } = await supabase
        .from("user_level_progress")
        .select("stars_earned, score")
        .eq("user_id", user.id)
        .eq("category_id", categoryId)
        .eq("level_number", levelNumber)
        .maybeSingle();

      // Only update if this is a new record or we have a better score
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
            completed_at: existingProgress ? existingProgress.score < score ? new Date().toISOString() : undefined : new Date().toISOString(),
          },
          {
            onConflict: "user_id,category_id,level_number",
          }
        );

        if (error) {
          console.error("Error saving level progress:", error);
          return { success: false, stars: 0 };
        }
      }

      // Update profile stats
      const pointsEarned = score * 10 + stars * 20;

      // Fetch current profile to update stats
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

      // Refetch progress to update UI
      await fetchProgress();

      return { success: true, stars, unlockedLevel };
    } catch (err) {
      console.error("Error in updateLevelProgress:", err);
      return { success: false, stars: 0 };
    }
  };

  const getMapLevels = (categoriesList?: { id: string; icon: string }[]) => {
    const totalLevels = 30; // Total levels in the map
    
    // Build a map of all completed levels across all categories
    const allCompletedLevels: Map<string, { stars: number }> = new Map();
    
    Object.values(progress).forEach((catProgress) => {
      catProgress.completedLevels.forEach((level) => {
        const key = `${catProgress.categoryId}-${level.level_number}`;
        allCompletedLevels.set(key, { stars: level.stars_earned });
      });
    });

    // Calculate total completed levels for unlock logic
    const totalCompleted = getTotalProgress();
    
    // If no categories provided, return basic levels
    if (!categoriesList || categoriesList.length === 0) {
      return Array.from({ length: totalLevels }, (_, i) => ({
        id: i + 1,
        categoryId: 'unknown',
        categoryIcon: '📚',
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
      
      // Level is unlocked if it's level 1, or if the previous level in sequence is completed
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
  };

  const getLevelStats = (categoryId: string, levelNumber: number): LevelProgress | null => {
    const catProgress = progress[categoryId];
    if (!catProgress) return null;
    return catProgress.completedLevels.find((l) => l.level_number === levelNumber) || null;
  };

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
    refetch: fetchProgress,
  };
}
