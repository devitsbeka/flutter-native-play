import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
  imageUrl?: string;
}

// Georgian categories for the game
const georgianCategories = [
  { id: "general", name: "ზოგადი ცოდნა" },
  { id: "geography", name: "გეოგრაფია" },
  { id: "history", name: "ისტორია" },
  { id: "science", name: "მეცნიერება" },
  { id: "culture", name: "კულტურა" },
  { id: "sports", name: "სპორტი" },
];

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
    amount: number = 5,
    category?: string,
    level: number = 1,
    excludeHashes: string[] = []
  ) => {
    setLoading(true);
    setError(null);
    setPreparationProgress(0);
    setImagesReady(false);

    try {
      // Select category
      const selectedCategory = category 
        ? georgianCategories.find(c => c.id === category) || georgianCategories[0]
        : georgianCategories[Math.floor(Math.random() * georgianCategories.length)];

      setPreparationProgress(10);

      // ============ DB-FIRST: Try to fetch from database first ============
      // First, get the category UUID from the category_id string
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('category_id', selectedCategory.id)
        .single();

      let dbQuestions: any[] = [];
      let dbError: any = null;

      if (categoryData) {
        const result = await supabase
          .from('questions')
          .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, category_id')
          .eq('is_active', true)
          .eq('category_id', categoryData.id)
          .gte('level_number', level)
          .lte('level_number', level + 2)
          .limit(amount + 5);
        
        dbQuestions = result.data || [];
        dbError = result.error;
      }

      setPreparationProgress(30);

      let formattedQuestions: TriviaQuestion[] = [];
      const allHashes = new Set([...askedQuestionHashes, ...excludeHashes]);

      // If we have enough DB questions, use them
      if (!dbError && dbQuestions && dbQuestions.length >= amount) {
        console.log(`Found ${dbQuestions.length} questions in database for ${selectedCategory.id}`);
        
        formattedQuestions = dbQuestions
          .map((q: any, index: number) => {
            const incorrectAnswers = Array.isArray(q.incorrect_answers) 
              ? q.incorrect_answers 
              : JSON.parse(q.incorrect_answers || '[]');
            const allAnswers = shuffleArray([q.correct_answer, ...incorrectAnswers]);
            const questionHash = hashQuestion(q.question_text);

            return {
              id: q.id,
              category: selectedCategory.name,
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

      // No AI fallback - only use database questions
      if (formattedQuestions.length < amount) {
        console.warn(`Not enough questions in database (${formattedQuestions.length}/${amount}) for category ${selectedCategory.id}`);
        
        if (formattedQuestions.length === 0) {
          throw new Error("ამ კატეგორიაში კითხვები არ მოიძებნა. გთხოვთ დაამატოთ კითხვები ადმინ პანელიდან.");
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
