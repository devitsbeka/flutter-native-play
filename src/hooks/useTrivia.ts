import { useState, useCallback } from "react";

export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
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

export function useTrivia() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (amount: number = 5) => {
    setLoading(true);
    setError(null);

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

      setQuestions(formattedQuestions);
      return formattedQuestions;
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
