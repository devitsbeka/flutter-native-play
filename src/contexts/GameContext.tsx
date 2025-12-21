import React, { createContext, useContext, useState, useCallback } from "react";
import { FakeOpponent, generateFakeOpponent } from "@/data/opponents";
import { TriviaQuestion, useTrivia, calculateScore } from "@/hooks/useTrivia";

export type GamePhase = "home" | "matchmaking" | "preparing" | "vs-screen" | "playing" | "question-result" | "match-result";

export interface AnswerHistory {
  correct: boolean;
  points: number;
}

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
  userProgress: number;
  opponentProgress: number;
  userAnswerHistory: AnswerHistory[];
  opponentAnswerHistory: AnswerHistory[];
  lastOpponentCorrect: boolean | null;
  lastOpponentAnswer: string | null;
  lastUserAnswer: string | null;
  preparationProgress: number;
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
  userProgress: 0,
  opponentProgress: 0,
  userAnswerHistory: [],
  opponentAnswerHistory: [],
  lastOpponentCorrect: null,
  lastOpponentAnswer: null,
  lastUserAnswer: null,
  preparationProgress: 0,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const { fetchQuestions, loading, preparationProgress } = useTrivia();

  const startMatchmaking = useCallback(async () => {
    setState(prev => ({ ...prev, phase: "matchmaking" }));
    
    // Generate opponent while starting to fetch questions
    const opponent = generateFakeOpponent();
    
    // Short delay for matchmaking feel
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setState(prev => ({ 
      ...prev, 
      phase: "preparing",
      opponent,
    }));
    
    // Fetch questions and preload images
    const questions = await fetchQuestions(5);
    
    setState(prev => ({
      ...prev,
      phase: "vs-screen",
      questions,
      userProgress: 0,
      opponentProgress: 0,
      userAnswerHistory: [],
      opponentAnswerHistory: [],
    }));
  }, [fetchQuestions]);

  // Sync preparation progress
  React.useEffect(() => {
    if (state.phase === "preparing") {
      setState(prev => ({ ...prev, preparationProgress }));
    }
  }, [preparationProgress, state.phase]);

  const startMatch = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: "playing",
      currentQuestionIndex: 0,
      userScore: 0,
      opponentScore: 0,
      streak: 0,
      userProgress: 0,
      opponentProgress: 0,
      userAnswerHistory: [],
      opponentAnswerHistory: [],
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

      const opponentCorrect = Math.random() < 0.7;
      const opponentTime = prev.timePerQuestion * (0.3 + Math.random() * 0.5);
      const opponentPoints = calculateScore(
        opponentCorrect,
        opponentTime,
        prev.timePerQuestion,
        currentQuestion.difficulty,
        0
      );

      // Determine opponent's answer
      let opponentAnswer: string;
      if (opponentCorrect) {
        opponentAnswer = currentQuestion.correctAnswer;
      } else {
        // Pick a random wrong answer
        const wrongAnswers = currentQuestion.allAnswers.filter(a => a !== currentQuestion.correctAnswer);
        opponentAnswer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
      }

      const newUserAnswerHistory = [...prev.userAnswerHistory, { correct: isCorrect, points }];
      const newOpponentAnswerHistory = [...prev.opponentAnswerHistory, { correct: opponentCorrect, points: opponentPoints }];

      const newUserProgress = isCorrect ? prev.userProgress + 1 : prev.userProgress;
      const newOpponentProgress = opponentCorrect ? prev.opponentProgress + 1 : prev.opponentProgress;

      return {
        ...prev,
        phase: "question-result",
        userScore: prev.userScore + points,
        opponentScore: prev.opponentScore + opponentPoints,
        streak: isCorrect ? prev.streak + 1 : 0,
        lastAnswerCorrect: isCorrect,
        lastPointsEarned: points,
        lastOpponentCorrect: opponentCorrect,
        lastOpponentAnswer: opponentAnswer,
        lastUserAnswer: answer,
        userProgress: newUserProgress,
        opponentProgress: newOpponentProgress,
        userAnswerHistory: newUserAnswerHistory,
        opponentAnswerHistory: newOpponentAnswerHistory,
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
        lastOpponentCorrect: null,
        lastOpponentAnswer: null,
        lastUserAnswer: null,
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
