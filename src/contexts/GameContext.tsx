import React, { createContext, useContext, useState, useCallback } from "react";
import { FakeOpponent, generateFakeOpponent } from "@/data/opponents";
import { TriviaQuestion, useTrivia, calculateScore } from "@/hooks/useTrivia";

export type GamePhase = "home" | "matchmaking" | "vs-screen" | "playing" | "question-result" | "match-result";

interface GameState {
  phase: GamePhase;
  opponent: FakeOpponent | null;
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  userScore: number;
  opponentScore: number;
  streak: number;
  lastAnswerCorrect: boolean | null;
  lastPointsEarned: number;
  timePerQuestion: number;
}

interface GameContextType extends GameState {
  startMatchmaking: () => Promise<void>;
  startMatch: () => void;
  answerQuestion: (answer: string, timeRemaining: number) => void;
  nextQuestion: () => void;
  finishMatch: () => void;
  resetGame: () => void;
  loading: boolean;
}

const initialState: GameState = {
  phase: "home",
  opponent: null,
  questions: [],
  currentQuestionIndex: 0,
  userScore: 0,
  opponentScore: 0,
  streak: 0,
  lastAnswerCorrect: null,
  lastPointsEarned: 0,
  timePerQuestion: 15,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const { fetchQuestions, loading } = useTrivia();

  const startMatchmaking = useCallback(async () => {
    setState(prev => ({ ...prev, phase: "matchmaking" }));
    
    // Fetch questions while "searching"
    const questions = await fetchQuestions(5);
    const opponent = generateFakeOpponent();
    
    // Simulate search time (2-4 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    setState(prev => ({
      ...prev,
      phase: "vs-screen",
      opponent,
      questions,
    }));
  }, [fetchQuestions]);

  const startMatch = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: "playing",
      currentQuestionIndex: 0,
      userScore: 0,
      opponentScore: 0,
      streak: 0,
    }));
  }, []);

  const answerQuestion = useCallback((answer: string, timeRemaining: number) => {
    setState(prev => {
      const currentQuestion = prev.questions[prev.currentQuestionIndex];
      if (!currentQuestion) return prev;

      const isCorrect = answer === currentQuestion.correctAnswer;
      const points = calculateScore(
        isCorrect,
        timeRemaining,
        prev.timePerQuestion,
        currentQuestion.difficulty,
        prev.streak
      );

      // Simulate opponent answer (60-80% accuracy)
      const opponentCorrect = Math.random() < 0.7;
      const opponentTime = prev.timePerQuestion * (0.3 + Math.random() * 0.5);
      const opponentPoints = calculateScore(
        opponentCorrect,
        opponentTime,
        prev.timePerQuestion,
        currentQuestion.difficulty,
        0
      );

      return {
        ...prev,
        phase: "question-result",
        userScore: prev.userScore + points,
        opponentScore: prev.opponentScore + opponentPoints,
        streak: isCorrect ? prev.streak + 1 : 0,
        lastAnswerCorrect: isCorrect,
        lastPointsEarned: points,
      };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentQuestionIndex + 1;
      
      if (nextIndex >= prev.questions.length) {
        return { ...prev, phase: "match-result" };
      }

      return {
        ...prev,
        phase: "playing",
        currentQuestionIndex: nextIndex,
        lastAnswerCorrect: null,
        lastPointsEarned: 0,
      };
    });
  }, []);

  const finishMatch = useCallback(() => {
    setState(prev => ({ ...prev, phase: "match-result" }));
  }, []);

  const resetGame = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <GameContext.Provider
      value={{
        ...state,
        startMatchmaking,
        startMatch,
        answerQuestion,
        nextQuestion,
        finishMatch,
        resetGame,
        loading,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
