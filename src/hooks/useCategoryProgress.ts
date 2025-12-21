import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { categories } from "@/data/categories";

interface CategoryProgress {
  categoryId: string;
  currentLevel: number;
  totalStars: number;
}

export function useCategoryProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, CategoryProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Default progress for non-logged-in users - first 3 categories unlocked
      const defaultProgress: Record<string, CategoryProgress> = {};
      categories.slice(0, 3).forEach((cat) => {
        defaultProgress[cat.id] = {
          categoryId: cat.id,
          currentLevel: 1,
          totalStars: 0,
        };
      });
      setProgress(defaultProgress);
      setLoading(false);
      return;
    }

    // For logged-in users, fetch from database
    // For now, use mock data
    const mockProgress: Record<string, CategoryProgress> = {
      science: { categoryId: "science", currentLevel: 5, totalStars: 12 },
      history: { categoryId: "history", currentLevel: 3, totalStars: 8 },
      geography: { categoryId: "geography", currentLevel: 1, totalStars: 0 },
      sports: { categoryId: "sports", currentLevel: 7, totalStars: 18 },
      movies: { categoryId: "movies", currentLevel: 2, totalStars: 5 },
      music: { categoryId: "music", currentLevel: 1, totalStars: 0 },
    };
    setProgress(mockProgress);
    setLoading(false);
  }, [user]);

  const getCategoryProgress = (categoryId: string): number => {
    return progress[categoryId]?.currentLevel || 0;
  };

  const isCategoryUnlocked = (categoryId: string): boolean => {
    // First 3 categories always unlocked
    const unlockedByDefault = ["science", "history", "geography"];
    if (unlockedByDefault.includes(categoryId)) return true;
    
    // Others need to be unlocked through progress
    return (progress[categoryId]?.currentLevel || 0) > 0;
  };

  const getTotalProgress = (): number => {
    return Object.values(progress).reduce((sum, p) => sum + p.currentLevel, 0);
  };

  const getMapLevels = () => {
    const totalLevels = 30; // Total levels in the map
    const completedLevels = getTotalProgress();
    
    return Array.from({ length: totalLevels }, (_, i) => {
      const level = i + 1;
      const categoryIndex = i % categories.length;
      const cat = categories[categoryIndex];
      
      return {
        id: level,
        categoryId: cat.id,
        categoryIcon: cat.icon,
        isCompleted: level <= completedLevels,
        isUnlocked: level <= completedLevels + 1,
        isCurrent: level === completedLevels + 1,
        stars: level <= completedLevels ? Math.floor(Math.random() * 3) + 1 : 0,
      };
    });
  };

  return {
    progress,
    loading,
    getCategoryProgress,
    isCategoryUnlocked,
    getTotalProgress,
    getMapLevels,
  };
}
