import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH } from "@/utils/questionValidation";
import {
  getGlobalAskedQuestionIds,
  markQuestionsAsAskedGlobally,
  shouldResetGlobalPool,
  clearGlobalAskedQuestions,
} from "@/services/questionTracker";

const STORAGE_KEY = 'preferredLanguage';
const DEFAULT_LANGUAGE = 'ka';

export interface TriviaQuestion {
  id: string;
  category: string;      // Display name (Georgian)
  categoryId?: string;   // Database category_id for icon lookup
  categoryIcon?: string;
  categoryIconSlug?: string; // Icon slug from category
  questionIconSlug?: string; // Icon slug for specific question
  difficulty: "easy" | "medium" | "hard";
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
  imageUrl?: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useTrivia() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);
  const [noQuestionsInLanguage, setNoQuestionsInLanguage] = useState(false);

  // Get current language from localStorage
  const getCurrentLanguage = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  }, []);

  const fetchQuestions = useCallback(async (
    amount: number = 6,
    category?: string,
    level: number = 1,
    excludeHashes: string[] = [],
    mixFromCategories: boolean = true
  ) => {
    const language = getCurrentLanguage();
    
    setLoading(true);
    setError(null);
    setPreparationProgress(0);
    setImagesReady(false);
    setNoQuestionsInLanguage(false);

    try {
      setPreparationProgress(10);

      let dbQuestions: any[] = [];
      let dbError: any = null;

      if (category) {
        // Fetch from specific category
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id, name, icon, category_id, icon_slug')
          .eq('category_id', category)
          .maybeSingle();

        if (categoryData) {
          const result = await supabase
            .from('questions')
            .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, category_id, icon_slug, language')
            .eq('is_active', true)
            .eq('in_production', true)
            .eq('category_id', categoryData.id)
            .eq('language', language)
            .gte('level_number', level)
            .lte('level_number', level + 2)
            .limit(amount + 5);
          
          dbQuestions = (result.data || []).map(q => ({
            ...q,
            categoryName: categoryData.name,
            categoryIcon: categoryData.icon,
            categoryIconSlug: categoryData.icon_slug,
            categorySlug: categoryData.category_id,  // The actual category_id for icon lookup
            questionIconSlug: q.icon_slug,
          }));
          dbError = result.error;
        }
      } else if (mixFromCategories) {
        // VS Mode: Pick one question from each of 6 random categories
        // Use persistent tracking to avoid repetition
        const globalAskedIds = getGlobalAskedQuestionIds();
        
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name, icon, category_id, icon_slug')
          .eq('is_active', true);
        
        if (categories && categories.length > 0) {
          // Get total question count to check if pool needs reset
          const { count: totalCount } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('in_production', true)
            .eq('language', language);
          
          // Reset if we've used 80% of available questions
          if (totalCount && shouldResetGlobalPool(totalCount)) {
            clearGlobalAskedQuestions();
          }
          
          // Shuffle and pick 6 random categories
          const randomCategories = shuffleArray(categories).slice(0, amount);
          
          setPreparationProgress(20);
          
          // Get fresh list after potential reset
          const currentAskedIds = getGlobalAskedQuestionIds();
          
          // Fetch questions from each category with database-level exclusion
          const questionPromises = randomCategories.map(async (cat) => {
            // Build query with exclusion at database level
            let query = supabase
              .from('questions')
              .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, category_id, icon_slug, language')
              .eq('is_active', true)
              .eq('in_production', true)
              .eq('category_id', cat.id)
              .eq('language', language);
            
            // Exclude already asked questions at database level
            if (currentAskedIds.length > 0) {
              query = query.not('id', 'in', `(${currentAskedIds.join(',')})`);
            }
            
            const { data } = await query.limit(100);
            
            if (data && data.length > 0) {
              // Filter by length first, then pick random
              const validQuestions = data.filter(q => {
                if (q.question_text.length > QUESTION_MAX_LENGTH) return false;
                if (q.correct_answer.length > ANSWER_MAX_LENGTH) return false;
                const incorrects = Array.isArray(q.incorrect_answers) 
                  ? q.incorrect_answers as string[]
                  : JSON.parse(String(q.incorrect_answers) || '[]');
                if (incorrects.some((a: string) => a.length > ANSWER_MAX_LENGTH)) return false;
                return true;
              });
              
              if (validQuestions.length > 0) {
                const randomQ = validQuestions[Math.floor(Math.random() * validQuestions.length)];
                return { 
                  ...randomQ, 
                  categoryName: cat.name, 
                  categoryIcon: cat.icon,
                  categoryIconSlug: cat.icon_slug,
                  categorySlug: cat.category_id,
                  questionIconSlug: randomQ.icon_slug,
                };
              }
            }
            return null;
          });
          
          const results = await Promise.all(questionPromises);
          dbQuestions = results.filter(q => q !== null);
        }
      } else {
        // Legacy random mix mode - fetch from ALL active categories
        const result = await supabase
          .from('questions')
          .select(`
            id, 
            question_text, 
            correct_answer, 
            incorrect_answers, 
            difficulty, 
            level_number,
            language,
            categories!inner(name, icon)
          `)
          .eq('is_active', true)
          .eq('in_production', true)
          .eq('language', language)
          .limit(50);
        
        if (result.data) {
          dbQuestions = shuffleArray(result.data).slice(0, amount + 5).map(q => ({
            ...q,
            categoryName: (q.categories as any)?.name || 'ზოგადი',
            categoryIcon: (q.categories as any)?.icon || '📚'
          }));
        }
        dbError = result.error;
      }

      setPreparationProgress(30);

      let formattedQuestions: TriviaQuestion[] = [];

      if (!dbError && dbQuestions && dbQuestions.length > 0) {
        console.log(`Found ${dbQuestions.length} questions${category ? ` for ${category}` : ' from all categories'}`);
        
        formattedQuestions = dbQuestions
          .map((q: any) => {
            const incorrectAnswers = Array.isArray(q.incorrect_answers) 
              ? q.incorrect_answers 
              : JSON.parse(q.incorrect_answers || '[]');
            const allAnswers = shuffleArray([q.correct_answer, ...incorrectAnswers]);

            return {
              id: q.id,
              category: q.categoryName,
              categoryId: q.categorySlug || '',  // Pass the actual category_id for icon lookup
              categoryIcon: q.categoryIcon || '📚',
              categoryIconSlug: q.categoryIconSlug || undefined,
              questionIconSlug: q.questionIconSlug || undefined,
              difficulty: (q.difficulty as "easy" | "medium" | "hard") || "easy",
              question: q.question_text,
              correctAnswer: q.correct_answer,
              incorrectAnswers,
              allAnswers,
            };
          })
          // Filter out questions/answers that are too long for viewport
          .filter((q: TriviaQuestion) => {
            if (q.question.length > QUESTION_MAX_LENGTH) return false;
            if (q.correctAnswer.length > ANSWER_MAX_LENGTH) return false;
            if (q.incorrectAnswers.some(a => a.length > ANSWER_MAX_LENGTH)) return false;
            return true;
          })
          .slice(0, amount);

        setPreparationProgress(80);
      }

      if (formattedQuestions.length < amount) {
        console.warn(`Not enough questions (${formattedQuestions.length}/${amount}) in language: ${language}`);
        
        if (formattedQuestions.length === 0) {
          setNoQuestionsInLanguage(true);
          // Don't throw error, just return empty - UI will show friendly message
          return [];
        }
      }

      // Track these questions as asked using persistent storage
      const questionIds = formattedQuestions.map((q: TriviaQuestion) => q.id);
      markQuestionsAsAskedGlobally(questionIds);

      setPreparationProgress(100);
      setQuestions(formattedQuestions);
      setImagesReady(true);
      
      return formattedQuestions;
    } catch (err) {
      const message = err instanceof Error ? err.message : "შეცდომა მოხდა";
      setError(message);
      console.error("Trivia fetch error:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getCurrentLanguage]);

  const resetAskedQuestions = useCallback(() => {
    clearGlobalAskedQuestions();
  }, []);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
    preparationProgress,
    imagesReady,
    resetAskedQuestions,
    noQuestionsInLanguage,
  };
}

// Scoring algorithm
export function calculateScore(
  isCorrect: boolean,
  timeRemaining: number,
  maxTime: number,
  difficulty: "easy" | "medium" | "hard",
  streak: number
): number {
  if (!isCorrect) return 0;

  const basePoints = {
    easy: 100,
    medium: 150,
    hard: 200,
  };

  const timeBonus = Math.floor((timeRemaining / maxTime) * basePoints[difficulty] * 0.5);
  const streakMultiplier = 1 + Math.min(streak, 5) * 0.05;

  return Math.floor((basePoints[difficulty] + timeBonus) * streakMultiplier);
}
