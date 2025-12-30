import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TriviaQuestion {
  id: string;
  category: string;
  categoryIcon?: string;
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

// Hash a question for tracking
function hashQuestion(question: string): string {
  let hash = 0;
  for (let i = 0; i < question.length; i++) {
    const char = question.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function useTrivia() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);
  const [askedQuestionHashes, setAskedQuestionHashes] = useState<Set<string>>(new Set());

  const fetchQuestions = useCallback(async (
    amount: number = 6,
    category?: string,
    level: number = 1,
    excludeHashes: string[] = [],
    mixFromCategories: boolean = true // New param: pick one from each random category
  ) => {
    setLoading(true);
    setError(null);
    setPreparationProgress(0);
    setImagesReady(false);

    try {
      setPreparationProgress(10);

      let dbQuestions: any[] = [];
      let dbError: any = null;

      if (category) {
        // Fetch from specific category
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id, name, icon')
          .eq('category_id', category)
          .maybeSingle();

        if (categoryData) {
          const result = await supabase
            .from('questions')
            .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, category_id')
            .eq('is_active', true)
            .eq('category_id', categoryData.id)
            .gte('level_number', level)
            .lte('level_number', level + 2)
            .limit(amount + 5);
          
          dbQuestions = (result.data || []).map(q => ({
            ...q,
            categoryName: categoryData.name,
            categoryIcon: categoryData.icon
          }));
          dbError = result.error;
        }
      } else if (mixFromCategories) {
        // VS Mode: Pick one question from each of 6 random categories
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name, icon')
          .eq('is_active', true);
        
        if (categories && categories.length > 0) {
          // Shuffle and pick 6 random categories
          const randomCategories = shuffleArray(categories).slice(0, amount);
          
          setPreparationProgress(20);
          
          // Fetch one random question from each category
          const questionPromises = randomCategories.map(async (cat) => {
            const { data } = await supabase
              .from('questions')
              .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, category_id')
              .eq('is_active', true)
              .eq('category_id', cat.id)
              .limit(10);
            
            if (data && data.length > 0) {
              const randomQ = data[Math.floor(Math.random() * data.length)];
              return { ...randomQ, categoryName: cat.name, categoryIcon: cat.icon };
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
            categories!inner(name, icon)
          `)
          .eq('is_active', true)
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
      const allHashes = new Set([...askedQuestionHashes, ...excludeHashes]);

      if (!dbError && dbQuestions && dbQuestions.length > 0) {
        console.log(`Found ${dbQuestions.length} questions${category ? ` for ${category}` : ' from all categories'}`);
        
        formattedQuestions = dbQuestions
          .map((q: any) => {
            const incorrectAnswers = Array.isArray(q.incorrect_answers) 
              ? q.incorrect_answers 
              : JSON.parse(q.incorrect_answers || '[]');
            const allAnswers = shuffleArray([q.correct_answer, ...incorrectAnswers]);
            const questionHash = hashQuestion(q.question_text);

            return {
              id: q.id,
              category: q.categoryName,
              categoryIcon: q.categoryIcon || '📚',
              difficulty: (q.difficulty as "easy" | "medium" | "hard") || "easy",
              question: q.question_text,
              correctAnswer: q.correct_answer,
              incorrectAnswers,
              allAnswers,
              hash: questionHash,
            };
          })
          .filter((q: TriviaQuestion & { hash: string }) => !allHashes.has(q.hash))
          .slice(0, amount);

        setPreparationProgress(80);
      }

      if (formattedQuestions.length < amount) {
        console.warn(`Not enough questions (${formattedQuestions.length}/${amount})`);
        
        if (formattedQuestions.length === 0) {
          throw new Error("კითხვები არ მოიძებნა. გთხოვთ დაამატოთ კითხვები ადმინ პანელიდან.");
        }
      }

      // Track these questions as asked
      const newHashes = formattedQuestions.map((q: any) => q.hash);
      setAskedQuestionHashes(prev => new Set([...prev, ...newHashes]));

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
  }, [askedQuestionHashes]);

  const resetAskedQuestions = useCallback(() => {
    setAskedQuestionHashes(new Set());
  }, []);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
    preparationProgress,
    imagesReady,
    resetAskedQuestions,
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
