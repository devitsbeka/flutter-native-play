import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LevelQuestionCount {
  levelNumber: number;
  count: number;
}

interface CategoryAvailability {
  categoryId: string;
  categoryUuid: string;
  totalQuestions: number;
  levelCounts: LevelQuestionCount[];
}

const MIN_QUESTIONS_PER_LEVEL = 5;

export function useQuestionAvailability() {
  const [availability, setAvailability] = useState<Map<string, CategoryAvailability>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      // Get all categories first
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, category_id, total_levels')
        .eq('is_active', true);

      if (catError) {
        console.error("Error fetching categories:", catError);
        return;
      }

      if (!categories || categories.length === 0) {
        setLoading(false);
        return;
      }

      // Get question counts grouped by category and level
      const { data: questionCounts, error: qError } = await supabase
        .from('questions')
        .select('category_id, level_number')
        .eq('is_active', true);

      if (qError) {
        console.error("Error fetching question counts:", qError);
        return;
      }

      // Build availability map
      const availabilityMap = new Map<string, CategoryAvailability>();

      for (const cat of categories) {
        const categoryQuestions = questionCounts?.filter(q => q.category_id === cat.id) || [];
        
        // Count questions per level
        const levelMap = new Map<number, number>();
        for (const q of categoryQuestions) {
          const level = q.level_number || 1;
          levelMap.set(level, (levelMap.get(level) || 0) + 1);
        }

        const levelCounts: LevelQuestionCount[] = [];
        for (let i = 1; i <= (cat.total_levels || 20); i++) {
          levelCounts.push({
            levelNumber: i,
            count: levelMap.get(i) || 0,
          });
        }

        availabilityMap.set(cat.category_id, {
          categoryId: cat.category_id,
          categoryUuid: cat.id,
          totalQuestions: categoryQuestions.length,
          levelCounts,
        });
      }

      setAvailability(availabilityMap);
    } catch (err) {
      console.error("Unexpected error in useQuestionAvailability:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasEnoughQuestions = (categoryId: string, levelNumber: number): boolean => {
    const catAvail = availability.get(categoryId);
    if (!catAvail) {
      // If map is populated but category not found, log for debugging
      // and return true as fallback to not block users (all categories have questions)
      if (availability.size > 0) {
        console.warn(`Category ${categoryId} not found in availability map. Available: ${Array.from(availability.keys()).slice(0, 5).join(', ')}...`);
        return true; // Fallback: assume available since all active categories have questions
      }
      return false; // Still loading
    }

    // If category has enough total questions, all levels are playable
    // Questions will be randomly selected from the pool
    return catAvail.totalQuestions >= MIN_QUESTIONS_PER_LEVEL;
  };

  const getQuestionCount = (categoryId: string, levelNumber: number): number => {
    const catAvail = availability.get(categoryId);
    if (!catAvail) return 0;

    // Count questions for this level range
    let totalAvailable = 0;
    for (let i = levelNumber; i <= levelNumber + 2; i++) {
      const levelCount = catAvail.levelCounts.find(l => l.levelNumber === i);
      totalAvailable += levelCount?.count || 0;
    }

    return totalAvailable;
  };

  const getCategoryTotalQuestions = (categoryId: string): number => {
    return availability.get(categoryId)?.totalQuestions || 0;
  };

  const getFirstAvailableLevel = (categoryId: string): number | null => {
    const catAvail = availability.get(categoryId);
    if (!catAvail) return null;

    for (let level = 1; level <= catAvail.levelCounts.length; level++) {
      if (hasEnoughQuestions(categoryId, level)) {
        return level;
      }
    }
    return null;
  };

  return {
    loading,
    hasEnoughQuestions,
    getQuestionCount,
    getCategoryTotalQuestions,
    getFirstAvailableLevel,
    refetch: fetchAvailability,
  };
}
