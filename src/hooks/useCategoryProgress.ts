import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { categories } from "@/data/categories";

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

  // Fetch real progress from database
  const fetchProgress = useCallback(async () => {
    if (!user) {
      // Default progress for non-logged-in users - first 3 categories unlocked at level 1
      const defaultProgress: Record<string, CategoryProgressData> = {};
      categories.slice(0, 3).forEach((cat) => {
        defaultProgress[cat.id] = {
          categoryId: cat.id,
          completedLevels: [],
          currentLevel: 1,
          totalStars: 0,
        };
      });
      setProgress(defaultProgress);
      setLoading(false);
      return;
    }

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

      // Group progress by category
      const progressByCategory: Record<string, CategoryProgressData> = {};

      // Initialize all categories
      categories.forEach((cat) => {
        progressByCategory[cat.id] = {
          categoryId: cat.id,
          completedLevels: [],
          currentLevel: 1,
          totalStars: 0,
        };
      });

      // Populate with actual data
      if (data) {
        data.forEach((record) => {
          const catId = record.category_id;
          if (progressByCategory[catId]) {
            progressByCategory[catId].completedLevels.push({
              level_number: record.level_number,
              stars_earned: record.stars_earned,
              score: record.score,
              total_questions: record.total_questions,
              completed_at: record.completed_at,
            });
            progressByCategory[catId].totalStars += record.stars_earned;
          }
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
  }, [user]);

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
    return progress[categoryId]?.currentLevel || 0;
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
    return catProgress.completedLevels.some((l) => l.level_number === levelNumber);
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
  ): Promise<{ success: boolean; stars: number }> => {
    if (!user) {
      return { success: false, stars: 0 };
    }

    // Calculate stars based on score percentage
    const percentage = (score / totalQuestions) * 100;
    let stars = 0;
    if (percentage >= 100) stars = 3;
    else if (percentage >= 80) stars = 3;
    else if (percentage >= 60) stars = 2;
    else if (percentage >= 40) stars = 1;

    try {
      // Upsert the level progress
      const { error } = await supabase.from("user_level_progress").upsert(
        {
          user_id: user.id,
          category_id: categoryId,
          level_number: levelNumber,
          stars_earned: stars,
          score: score,
          total_questions: totalQuestions,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,category_id,level_number",
        }
      );

      if (error) {
        console.error("Error saving level progress:", error);
        return { success: false, stars: 0 };
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

      return { success: true, stars };
    } catch (err) {
      console.error("Error in updateLevelProgress:", err);
      return { success: false, stars: 0 };
    }
  };

  const getMapLevels = () => {
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
    
    return Array.from({ length: totalLevels }, (_, i) => {
      const levelNumber = i + 1;
      const categoryIndex = i % categories.length;
      const cat = categories[categoryIndex];
      const categoryLevelNumber = Math.floor(i / categories.length) + 1;
      
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

  return {
    progress,
    loading,
    getCategoryProgress,
    getLevelStars,
    isLevelCompleted,
    isCategoryUnlocked,
    getTotalProgress,
    getTotalStars,
    updateLevelProgress,
    getMapLevels,
    refetch: fetchProgress,
  };
}
