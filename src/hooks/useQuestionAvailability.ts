import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPreferredLanguage } from "@/utils/questionFetcher";

interface LevelQuestionCount {
  levelNumber: number;
  count: number;
}

interface CategoryAvailability {
  categoryId: string;
  categoryUuid: string;
  totalQuestions: number;
  totalQuestionsInLanguage: number;
  levelCounts: LevelQuestionCount[];
  levelCountsInLanguage: LevelQuestionCount[];
}

interface ValidationResult {
  sufficient: boolean;
  available: number;
  required: number;
  language: string;
  warningMessage?: string;
}

const MIN_QUESTIONS_PER_LEVEL = 5;
const MIN_QUESTIONS_FOR_GAME = 5;

export function useQuestionAvailability() {
  const [availability, setAvailability] = useState<Map<string, CategoryAvailability>>(new Map());
  const [loading, setLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState<string>(getPreferredLanguage());

  // Update language when it changes
  useEffect(() => {
    const checkLanguage = () => {
      const newLang = getPreferredLanguage();
      if (newLang !== currentLanguage) {
        setCurrentLanguage(newLang);
      }
    };
    
    // Check periodically for language changes
    const interval = setInterval(checkLanguage, 1000);
    return () => clearInterval(interval);
  }, [currentLanguage]);

  // Refetch when language changes
  useEffect(() => {
    fetchAvailability();
  }, [currentLanguage]);

  const fetchAvailability = async () => {
    const language = getPreferredLanguage();
    
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

      // Get question counts for ALL questions (for fallback info)
      const { data: allQuestionCounts, error: allQError } = await supabase
        .from('questions')
        .select('category_id, level_number')
        .eq('is_active', true)
        .eq('in_production', true);

      // Get question counts for questions in current language
      const { data: langQuestionCounts, error: langQError } = await supabase
        .from('questions')
        .select('category_id, level_number')
        .eq('is_active', true)
        .eq('in_production', true)
        .eq('language', language);

      if (allQError || langQError) {
        console.error("Error fetching question counts:", allQError || langQError);
        return;
      }

      // Build availability map
      const availabilityMap = new Map<string, CategoryAvailability>();

      for (const cat of categories) {
        const allCategoryQuestions = allQuestionCounts?.filter(q => q.category_id === cat.id) || [];
        const langCategoryQuestions = langQuestionCounts?.filter(q => q.category_id === cat.id) || [];
        
        // Count questions per level - all questions
        const allLevelMap = new Map<number, number>();
        for (const q of allCategoryQuestions) {
          const level = q.level_number || 1;
          allLevelMap.set(level, (allLevelMap.get(level) || 0) + 1);
        }

        // Count questions per level - language specific
        const langLevelMap = new Map<number, number>();
        for (const q of langCategoryQuestions) {
          const level = q.level_number || 1;
          langLevelMap.set(level, (langLevelMap.get(level) || 0) + 1);
        }

        const levelCounts: LevelQuestionCount[] = [];
        const levelCountsInLanguage: LevelQuestionCount[] = [];
        
        for (let i = 1; i <= (cat.total_levels || 20); i++) {
          levelCounts.push({
            levelNumber: i,
            count: allLevelMap.get(i) || 0,
          });
          levelCountsInLanguage.push({
            levelNumber: i,
            count: langLevelMap.get(i) || 0,
          });
        }

        availabilityMap.set(cat.category_id, {
          categoryId: cat.category_id,
          categoryUuid: cat.id,
          totalQuestions: allCategoryQuestions.length,
          totalQuestionsInLanguage: langCategoryQuestions.length,
          levelCounts,
          levelCountsInLanguage,
        });
      }

      setAvailability(availabilityMap);
    } catch (err) {
      console.error("Unexpected error in useQuestionAvailability:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasEnoughQuestions = useCallback((categoryId: string, levelNumber: number): boolean => {
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

    // Check language-specific questions first
    if (catAvail.totalQuestionsInLanguage >= MIN_QUESTIONS_PER_LEVEL) {
      return true;
    }
    
    // Fall back to total questions (other languages may be available)
    return catAvail.totalQuestions >= MIN_QUESTIONS_PER_LEVEL;
  }, [availability]);

  /**
   * Validate if a category has enough questions before starting a game
   * Returns detailed validation result with warning message if needed
   */
  const validateBeforeGameStart = useCallback((
    categoryId: string,
    requiredQuestions: number = MIN_QUESTIONS_FOR_GAME
  ): ValidationResult => {
    const language = getPreferredLanguage();
    const catAvail = availability.get(categoryId);
    
    if (!catAvail) {
      return {
        sufficient: false,
        available: 0,
        required: requiredQuestions,
        language,
        warningMessage: loading 
          ? 'კითხვების რაოდენობა მოწმდება...' 
          : 'კატეგორია ვერ მოიძებნა',
      };
    }
    
    const availableInLanguage = catAvail.totalQuestionsInLanguage;
    
    if (availableInLanguage >= requiredQuestions) {
      return {
        sufficient: true,
        available: availableInLanguage,
        required: requiredQuestions,
        language,
      };
    }
    
    // Not enough in current language
    const languageNames: Record<string, string> = {
      'ka': 'ქართულ',
      'en': 'ინგლისურ',
      'ru': 'რუსულ',
    };
    
    const langName = languageNames[language] || language;
    
    if (availableInLanguage === 0) {
      return {
        sufficient: false,
        available: 0,
        required: requiredQuestions,
        language,
        warningMessage: `ამ კატეგორიაში ${langName} ენაზე კითხვები არ მოიძებნა. გთხოვთ აირჩიოთ სხვა კატეგორია ან შეცვალოთ ენა.`,
      };
    }
    
    return {
      sufficient: false,
      available: availableInLanguage,
      required: requiredQuestions,
      language,
      warningMessage: `ამ კატეგორიაში მხოლოდ ${availableInLanguage} კითხვაა ${langName} ენაზე (საჭიროა მინიმუმ ${requiredQuestions}).`,
    };
  }, [availability, loading]);

  /**
   * Quick check for sufficient questions (async, queries DB directly)
   */
  const checkCategoryAvailability = useCallback(async (
    categorySlug: string,
    requiredQuestions: number = MIN_QUESTIONS_FOR_GAME
  ): Promise<ValidationResult> => {
    const language = getPreferredLanguage();
    
    // Get category UUID
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('category_id', categorySlug)
      .single();
    
    if (!category) {
      return {
        sufficient: false,
        available: 0,
        required: requiredQuestions,
        language,
        warningMessage: 'კატეგორია ვერ მოიძებნა',
      };
    }
    
    // Count questions in language
    const { count, error } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', language)
      .eq('category_id', category.id);
    
    if (error) {
      console.error('Error checking category availability:', error);
      return {
        sufficient: false,
        available: 0,
        required: requiredQuestions,
        language,
        warningMessage: 'კითხვების შემოწმება ვერ მოხერხდა',
      };
    }
    
    const available = count || 0;
    
    if (available >= requiredQuestions) {
      return {
        sufficient: true,
        available,
        required: requiredQuestions,
        language,
      };
    }
    
    const languageNames: Record<string, string> = {
      'ka': 'ქართულ',
      'en': 'ინგლისურ',
      'ru': 'რუსულ',
    };
    
    const langName = languageNames[language] || language;
    
    if (available === 0) {
      return {
        sufficient: false,
        available: 0,
        required: requiredQuestions,
        language,
        warningMessage: `ამ კატეგორიაში ${langName} ენაზე კითხვები არ მოიძებნა.`,
      };
    }
    
    return {
      sufficient: false,
      available,
      required: requiredQuestions,
      language,
      warningMessage: `მხოლოდ ${available} კითხვაა ${langName} ენაზე (საჭიროა ${requiredQuestions}).`,
    };
  }, []);

  const getQuestionCount = useCallback((categoryId: string, levelNumber: number): number => {
    const catAvail = availability.get(categoryId);
    if (!catAvail) return 0;

    // Count questions for this level range in current language
    let totalAvailable = 0;
    for (let i = levelNumber; i <= levelNumber + 2; i++) {
      const levelCount = catAvail.levelCountsInLanguage.find(l => l.levelNumber === i);
      totalAvailable += levelCount?.count || 0;
    }

    return totalAvailable;
  }, [availability]);

  const getCategoryTotalQuestions = useCallback((categoryId: string): number => {
    return availability.get(categoryId)?.totalQuestionsInLanguage || 0;
  }, [availability]);

  const getFirstAvailableLevel = useCallback((categoryId: string): number | null => {
    const catAvail = availability.get(categoryId);
    if (!catAvail) return null;

    for (let level = 1; level <= catAvail.levelCountsInLanguage.length; level++) {
      if (hasEnoughQuestions(categoryId, level)) {
        return level;
      }
    }
    return null;
  }, [availability, hasEnoughQuestions]);

  return {
    loading,
    currentLanguage,
    hasEnoughQuestions,
    validateBeforeGameStart,
    checkCategoryAvailability,
    getQuestionCount,
    getCategoryTotalQuestions,
    getFirstAvailableLevel,
    refetch: fetchAvailability,
  };
}
