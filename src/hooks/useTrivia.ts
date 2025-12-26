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
      // Select random category if not provided
      const selectedCategory = category 
        ? georgianCategories.find(c => c.id === category) || georgianCategories[0]
        : georgianCategories[Math.floor(Math.random() * georgianCategories.length)];

      setPreparationProgress(10);

      // Call the Georgian trivia edge function
      const { data, error: fetchError } = await supabase.functions.invoke('generate-category-trivia', {
        body: {
          category: selectedCategory.name,
          categoryId: selectedCategory.id,
          level,
          count: amount + 3, // Request more to filter duplicates
        }
      });

      if (fetchError) {
        console.error("Error fetching Georgian questions:", fetchError);
        throw new Error(fetchError.message || "კითხვების ჩატვირთვა ვერ მოხერხდა");
      }

      if (!data?.questions || !Array.isArray(data.questions)) {
        throw new Error("კითხვები არ მოიძებნა");
      }

      setPreparationProgress(50);

      // Format and filter questions
      const allHashes = new Set([...askedQuestionHashes, ...excludeHashes]);
      
      const formattedQuestions: TriviaQuestion[] = data.questions
        .map((q: any, index: number) => {
          const correctAnswer = q.correct_answer;
          const incorrectAnswers = q.incorrect_answers || [];
          const allAnswers = shuffleArray([correctAnswer, ...incorrectAnswers]);
          const questionHash = hashQuestion(q.question);

          return {
            id: `q-${index}-${Date.now()}`,
            category: selectedCategory.name,
            difficulty: (q.difficulty as "easy" | "medium" | "hard") || "easy",
            question: q.question,
            correctAnswer,
            incorrectAnswers,
            allAnswers,
            hash: questionHash,
          };
        })
        .filter((q: TriviaQuestion & { hash: string }) => !allHashes.has(q.hash))
        .slice(0, amount);

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

  // Base points by difficulty
  const basePoints = {
    easy: 100,
    medium: 150,
    hard: 200,
  };

  // Time bonus (up to 50% extra for answering fast)
  const timeBonus = Math.floor((timeRemaining / maxTime) * basePoints[difficulty] * 0.5);

  // Streak bonus (5% per streak, max 25%)
  const streakMultiplier = 1 + Math.min(streak, 5) * 0.05;

  return Math.floor((basePoints[difficulty] + timeBonus) * streakMultiplier);
}
