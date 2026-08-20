import { useState, useCallback } from "react";
import { getQuestions, FormattedQuestion } from "@/services/questionService";
import { clearGlobalAskedQuestions } from "@/services/questionTracker";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = 'preferredLanguage';
const DEFAULT_LANGUAGE = 'en';

export interface TriviaQuestion {
  id: string;
  category: string;      // Display name (Georgian)
  categoryId?: string;   // Database category_id for icon lookup
  categoryIcon?: string;
  categoryIconSlug?: string; // Icon slug from category
  questionIconSlug?: string; // Icon slug for specific question
  iconSlug?: string;     // Icon slug for custom questions (MyTrivia)
  difficulty: "easy" | "medium" | "hard";
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
}

export interface ExhaustionInfo {
  totalAvailable: number;
  totalSeen: number;
  wasReset: boolean;
  usedFallback: boolean;
  percentUsed: number;
}

export function useTrivia() {
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);
  const [noQuestionsInLanguage, setNoQuestionsInLanguage] = useState(false);
  const [exhaustionInfo, setExhaustionInfo] = useState<ExhaustionInfo | null>(null);

  const fetchQuestions = useCallback(async (
    amount: number = 6,
    category?: string,
    level: number = 1,
    excludeHashes: string[] = [],
    mixFromCategories: boolean = true
  ) => {
    setLoading(true);
    setError(null);
    setPreparationProgress(0);
    setImagesReady(false);
    setNoQuestionsInLanguage(false);
    setExhaustionInfo(null);

    try {
      setPreparationProgress(10);

      // Use unified questionService for all fetching
      // __mixed__ is a virtual category - treat as VS mode (random from all categories)
      const isMixed = category === '__mixed__';
      const result = await getQuestions({
        mode: (category && !isMixed) ? 'category' : 'vs',
        categorySlug: isMixed ? undefined : category,
        levelNumber: level,
        count: amount,
        excludeIds: excludeHashes,
      });

      setPreparationProgress(50);

      // Handle no questions case
      if (result.questions.length === 0) {
        console.warn(`No questions available in language: ${result.language}`);
        setNoQuestionsInLanguage(true);
        setLoading(false);
        return [];
      }

      // Check for low question count
      if (result.questions.length < amount) {
        console.warn(`Not enough questions (${result.questions.length}/${amount})`);
      }

      setPreparationProgress(80);

      // Map to TriviaQuestion format
      const formattedQuestions: TriviaQuestion[] = result.questions.map((q: FormattedQuestion) => ({
        id: q.id,
        // No hardcoded-Georgian fallback: an empty header beats a header in
        // the wrong language. q.category arrives already localized from
        // questionService.
        category: q.category || '',
        categoryId: q.categorySlug || '',
        categoryIcon: '📚',
        categoryIconSlug: undefined,
        questionIconSlug: q.iconSlug || undefined,
        difficulty: q.difficulty,
        question: q.question,
        correctAnswer: q.correctAnswer,
        incorrectAnswers: q.incorrectAnswers,
        allAnswers: q.allAnswers,
        imageUrl: q.imageUrl || undefined,
        videoUrl: q.videoUrl || undefined,
        audioUrl: q.audioUrl || undefined,
      }));

      // Store exhaustion info for UI display
      if (result.exhaustionInfo) {
        const percentUsed = result.exhaustionInfo.totalAvailable > 0
          ? Math.round((result.exhaustionInfo.totalSeen / result.exhaustionInfo.totalAvailable) * 100)
          : 100;
        setExhaustionInfo({
          ...result.exhaustionInfo,
          percentUsed,
        });
      }

      setPreparationProgress(100);
      setQuestions(formattedQuestions);
      setImagesReady(true);
      
      return formattedQuestions;
    } catch (err) {
      const message = err instanceof Error ? err.message : t("extra.errorOccurred");
      setError(message);
      console.error("Trivia fetch error:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    exhaustionInfo,
  };
}

// Scoring: the app-wide unified policy (100 + secondsRemaining × 10) —
// solo matches pay exactly what multiplayer rooms, TV and challenges pay
// for the same answer. Difficulty and streak no longer change the value.
export { calculatePoints as calculateScore } from "@/utils/scoring";
