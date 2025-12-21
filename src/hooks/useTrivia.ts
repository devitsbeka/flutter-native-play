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

interface OpenTDBResponse {
  response_code: number;
  results: {
    category: string;
    type: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }[];
}

// Map Open Trivia DB categories
const categoryMap: Record<number, string> = {
  9: "General Knowledge",
  10: "Books",
  11: "Film",
  12: "Music",
  13: "Musicals & Theatre",
  14: "Television",
  15: "Video Games",
  16: "Board Games",
  17: "Science & Nature",
  18: "Computers",
  19: "Mathematics",
  20: "Mythology",
  21: "Sports",
  22: "Geography",
  23: "History",
  24: "Politics",
  25: "Art",
  26: "Celebrities",
  27: "Animals",
  28: "Vehicles",
  29: "Comics",
  30: "Gadgets",
  31: "Anime & Manga",
  32: "Cartoons",
};

function decodeHTML(html: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function searchQuestionImage(question: string, category: string): Promise<string | undefined> {
  try {
    const { data, error } = await supabase.functions.invoke('search-question-image', {
      body: { question, category }
    });
    
    if (error) {
      console.error('Error searching image:', error);
      return undefined;
    }
    
    return data?.imageUrl;
  } catch (err) {
    console.error('Failed to search image:', err);
    return undefined;
  }
}

// Preload image into browser cache
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export function useTrivia() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);

  const fetchQuestions = useCallback(async (amount: number = 5) => {
    setLoading(true);
    setError(null);
    setPreparationProgress(0);
    setImagesReady(false);

    try {
      // Get random category or mixed
      const categoryIds = Object.keys(categoryMap).map(Number);
      const randomCategory = categoryIds[Math.floor(Math.random() * categoryIds.length)];
      
      const response = await fetch(
        `https://opentdb.com/api.php?amount=${amount}&category=${randomCategory}&type=multiple`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }

      const data: OpenTDBResponse = await response.json();

      if (data.response_code !== 0) {
        throw new Error("No questions available");
      }

      setPreparationProgress(20);

      const formattedQuestions: TriviaQuestion[] = data.results.map((q, index) => {
        const correctAnswer = decodeHTML(q.correct_answer);
        const incorrectAnswers = q.incorrect_answers.map(decodeHTML);
        const allAnswers = shuffleArray([correctAnswer, ...incorrectAnswers]);

        return {
          id: `q-${index}-${Date.now()}`,
          category: q.category,
          difficulty: q.difficulty as "easy" | "medium" | "hard",
          question: decodeHTML(q.question),
          correctAnswer,
          incorrectAnswers,
          allAnswers,
        };
      });

      // Fetch images for all questions in parallel
      const questionsWithImages = await Promise.all(
        formattedQuestions.map(async (q, index) => {
          const imageUrl = await searchQuestionImage(q.question, q.category);
          setPreparationProgress(20 + Math.floor(((index + 1) / formattedQuestions.length) * 50));
          return { ...q, imageUrl };
        })
      );

      setPreparationProgress(70);

      // Preload all images into browser cache
      await Promise.all(
        questionsWithImages
          .filter(q => q.imageUrl)
          .map(async (q, index) => {
            if (q.imageUrl) {
              try {
                await preloadImage(q.imageUrl);
              } catch (e) {
                console.warn(`Failed to preload image for question ${index}`, e);
              }
              setPreparationProgress(70 + Math.floor(((index + 1) / questionsWithImages.length) * 30));
            }
          })
      );

      setQuestions(questionsWithImages);
      setPreparationProgress(100);
      setImagesReady(true);
      
      return questionsWithImages;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
    preparationProgress,
    imagesReady,
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
