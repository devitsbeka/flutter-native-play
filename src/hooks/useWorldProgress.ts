import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { continents, getCountryByCode, type Continent, type Country } from "@/data/worldData";

interface CountryProgress {
  country_code: string;
  continent_id: string;
  unlocked: boolean;
  categories_completed: number;
  total_categories: number;
}

interface CategoryProgress {
  country_code: string;
  category_id: string;
  questions_answered: number;
  questions_correct: number;
  completed: boolean;
}

export function useWorldProgress() {
  const [countryProgress, setCountryProgress] = useState<CountryProgress[]>([]);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (!user) {
        // For non-logged-in users, initialize with starter countries unlocked
        initializeDefaultProgress();
        setLoading(false);
        return;
      }

      // Fetch country progress
      const { data: countries } = await supabase
        .from("user_country_progress")
        .select("*")
        .eq("user_id", user.id);

      // Fetch category progress
      const { data: categories } = await supabase
        .from("user_category_progress")
        .select("*")
        .eq("user_id", user.id);

      if (countries && countries.length > 0) {
        setCountryProgress(countries);
      } else {
        // Initialize progress for new user
        await initializeUserProgress(user.id);
      }

      if (categories) {
        setCategoryProgress(categories);
      }

      setLoading(false);
    };

    fetchProgress();
  }, []);

  const initializeDefaultProgress = () => {
    // Default progress with starter countries unlocked
    const defaultProgress: CountryProgress[] = [];
    
    continents.forEach(continent => {
      if (continent.unlockRequirement === 0) {
        continent.countries.forEach(country => {
          defaultProgress.push({
            country_code: country.code,
            continent_id: continent.id,
            unlocked: country.unlockRequirement === null,
            categories_completed: 0,
            total_categories: country.categories.length,
          });
        });
      }
    });

    setCountryProgress(defaultProgress);
  };

  const initializeUserProgress = async (userId: string) => {
    const initialProgress: CountryProgress[] = [];
    
    // Unlock starter continents and their starter countries
    continents.forEach(continent => {
      if (continent.unlockRequirement === 0) {
        continent.countries.forEach(country => {
          initialProgress.push({
            country_code: country.code,
            continent_id: continent.id,
            unlocked: country.unlockRequirement === null,
            categories_completed: 0,
            total_categories: country.categories.length,
          });
        });
      }
    });

    // Insert into database
    const { error } = await supabase
      .from("user_country_progress")
      .insert(initialProgress.map(p => ({
        user_id: userId,
        ...p,
        unlocked_at: p.unlocked ? new Date().toISOString() : null,
      })));

    if (!error) {
      setCountryProgress(initialProgress);
    }
  };

  const getUnlockedContinents = (): string[] => {
    const completedContinents = getCompletedContinentsCount();
    
    return continents
      .filter(c => c.unlockRequirement <= completedContinents)
      .map(c => c.id);
  };

  const getCompletedContinentsCount = (): number => {
    let completed = 0;
    
    continents.forEach(continent => {
      const continentCountries = countryProgress.filter(
        p => p.continent_id === continent.id && p.unlocked
      );
      
      const allCompleted = continentCountries.length === continent.countries.length &&
        continentCountries.every(p => p.categories_completed === p.total_categories);
      
      if (allCompleted && continentCountries.length > 0) {
        completed++;
      }
    });

    return completed;
  };

  const getContinentProgress = (): Record<string, { completed: number; total: number }> => {
    const progress: Record<string, { completed: number; total: number }> = {};

    continents.forEach(continent => {
      const countries = countryProgress.filter(p => p.continent_id === continent.id);
      const completed = countries.filter(
        p => p.unlocked && p.categories_completed === p.total_categories
      ).length;

      progress[continent.id] = {
        completed,
        total: continent.countries.length,
      };
    });

    return progress;
  };

  const getCountryProgress = (continentId: string): CountryProgress[] => {
    return countryProgress.filter(p => p.continent_id === continentId);
  };

  const getCategoryProgress = (countryCode: string): CategoryProgress[] => {
    return categoryProgress.filter(p => p.country_code === countryCode);
  };

  const isCountryUnlocked = (countryCode: string): boolean => {
    const progress = countryProgress.find(p => p.country_code === countryCode);
    return progress?.unlocked || false;
  };

  const isCategoryCompleted = (countryCode: string, categoryId: string): boolean => {
    const progress = categoryProgress.find(
      p => p.country_code === countryCode && p.category_id === categoryId
    );
    return progress?.completed || false;
  };

  const isCategoryUnlocked = (countryCode: string, categoryId: string): boolean => {
    const countryData = getCountryByCode(countryCode);
    if (!countryData) return false;

    const categoryIndex = countryData.country.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === 0) return true; // First category always unlocked

    // Check if previous category is completed
    const prevCategory = countryData.country.categories[categoryIndex - 1];
    return isCategoryCompleted(countryCode, prevCategory.id);
  };

  const updateCategoryProgress = async (
    countryCode: string,
    categoryId: string,
    questionsAnswered: number,
    questionsCorrect: number,
    completed: boolean
  ) => {
    if (!userId) return;

    const existing = categoryProgress.find(
      p => p.country_code === countryCode && p.category_id === categoryId
    );

    if (existing) {
      await supabase
        .from("user_category_progress")
        .update({
          questions_answered: existing.questions_answered + questionsAnswered,
          questions_correct: existing.questions_correct + questionsCorrect,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("user_id", userId)
        .eq("country_code", countryCode)
        .eq("category_id", categoryId);
    } else {
      await supabase
        .from("user_category_progress")
        .insert({
          user_id: userId,
          country_code: countryCode,
          category_id: categoryId,
          questions_answered: questionsAnswered,
          questions_correct: questionsCorrect,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        });
    }

    // Refresh progress
    const { data } = await supabase
      .from("user_category_progress")
      .select("*")
      .eq("user_id", userId);

    if (data) {
      setCategoryProgress(data);
    }
  };

  return {
    loading,
    countryProgress,
    categoryProgress,
    getUnlockedContinents,
    getContinentProgress,
    getCountryProgress,
    getCategoryProgress,
    isCountryUnlocked,
    isCategoryCompleted,
    isCategoryUnlocked,
    updateCategoryProgress,
  };
}
