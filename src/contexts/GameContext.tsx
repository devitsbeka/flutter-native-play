import React, { createContext, useContext, useState, useCallback } from "react";
import { FakeOpponent, generateFakeOpponent } from "@/data/opponents";
import { TriviaQuestion, useTrivia, calculateScore } from "@/hooks/useTrivia";
import { preloadQuestionIcons } from "@/hooks/useAIIcon";

export type GamePhase = "home" | "matchmaking" | "preparing" | "vs-screen" | "playing" | "question-result" | "match-result";
export type PowerUpType = "fifty-fifty" | "freeze" | "replace" | "time-drain";

export interface AnswerHistory {
  correct: boolean;
  points: number;
}

export interface PowerUpState {
  type: PowerUpType;
  available: number;
  usedThisQuestion: boolean;
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
  
  // Power-up state
  playerPowerUps: PowerUpState[];
  opponentPowerUps: PowerUpState[];
  activePowerUp: PowerUpType | null;
  opponentFrozen: boolean;
  opponentFreezeEndTime: number | null;
  playerTimerBonus: number;
  hiddenAnswers: string[];
  replacedAnswer: { old: string; new: string } | null;
}

interface GameContextType extends GameState {
  startMatchmaking: () => Promise<void>;
  startMatch: () => void;
  answerQuestion: (answer: string, timeRemaining: number) => void;
  nextQuestion: () => void;
  finishMatch: () => void;
  resetGame: () => void;
  usePowerUp: (type: PowerUpType) => void;
  loading: boolean;
}

const defaultPowerUps: PowerUpState[] = [
  { type: "fifty-fifty", available: 2, usedThisQuestion: false },
  { type: "freeze", available: 1, usedThisQuestion: false },
  { type: "replace", available: 1, usedThisQuestion: false },
  { type: "time-drain", available: 1, usedThisQuestion: false },
];

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
  
  // Power-up initial state
  playerPowerUps: defaultPowerUps.map(p => ({ ...p })),
  opponentPowerUps: defaultPowerUps.map(p => ({ ...p })),
  activePowerUp: null,
  opponentFrozen: false,
  opponentFreezeEndTime: null,
  playerTimerBonus: 0,
  hiddenAnswers: [],
  replacedAnswer: null,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const { fetchQuestions, loading, preparationProgress, resetAskedQuestions } = useTrivia();

  const startMatchmaking = useCallback(async () => {
    setState(prev => ({ ...prev, phase: "matchmaking" }));
    
    // Generate opponent while starting to fetch questions
    const opponent = generateFakeOpponent();
    
    // Start fetching 6 questions (one from each random category) for VS mode
    const questionsPromise = fetchQuestions(6, undefined, 1, [], true);
    
    // Matchmaking screen lasts ~2 seconds for the interactive experience
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setState(prev => ({ 
      ...prev, 
      phase: "preparing",
      opponent,
    }));
    
    // Wait for questions to finish loading
    const questions = await questionsPromise;
    
    // Start background icon preloading immediately - don't await
    // Icons will be cached by the time user clicks "Start"
    preloadQuestionIcons(
      questions.map(q => ({ question: q.question, category: q.category }))
    );
    
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
      // Reset power-ups for new match
      playerPowerUps: defaultPowerUps.map(p => ({ ...p })),
      opponentPowerUps: defaultPowerUps.map(p => ({ ...p })),
      activePowerUp: null,
      opponentFrozen: false,
      opponentFreezeEndTime: null,
      playerTimerBonus: 0,
      hiddenAnswers: [],
      replacedAnswer: null,
    }));
  }, []);

  const usePowerUp = useCallback((type: PowerUpType) => {
    setState(prev => {
      const currentQuestion = prev.questions[prev.currentQuestionIndex];
      if (!currentQuestion) return prev;

      const powerUpIndex = prev.playerPowerUps.findIndex(p => p.type === type);
      if (powerUpIndex === -1) return prev;
      
      const powerUp = prev.playerPowerUps[powerUpIndex];
      if (powerUp.available <= 0 || powerUp.usedThisQuestion) return prev;

      // Clone power-ups array
      const newPowerUps = prev.playerPowerUps.map((p, i) => 
        i === powerUpIndex 
          ? { ...p, available: p.available - 1, usedThisQuestion: true }
          : p
      );

      let updates: Partial<GameState> = {
        playerPowerUps: newPowerUps,
        activePowerUp: type,
      };

      // Apply power-up effect
      switch (type) {
        case "fifty-fifty": {
          const wrongAnswers = currentQuestion.allAnswers
            .filter(a => a !== currentQuestion.correctAnswer);
          const shuffled = wrongAnswers.sort(() => Math.random() - 0.5);
          updates.hiddenAnswers = shuffled.slice(0, 2);
          break;
        }
        case "freeze": {
          updates.opponentFrozen = true;
          updates.opponentFreezeEndTime = Date.now() + 5000;
          break;
        }
        case "replace": {
          const wrongAnswers = currentQuestion.allAnswers
            .filter(a => a !== currentQuestion.correctAnswer)
            .filter(a => !prev.hiddenAnswers.includes(a));
          if (wrongAnswers.length > 0) {
            updates.replacedAnswer = { old: wrongAnswers[0], new: "---" };
          }
          break;
        }
        case "time-drain": {
          updates.playerTimerBonus = prev.playerTimerBonus + 3;
          break;
        }
      }

      return { ...prev, ...updates };
    });
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

      const opponentCorrect = prev.opponentFrozen ? false : Math.random() < 0.7;
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
        // Reset per-question power-up state
        playerPowerUps: prev.playerPowerUps.map(p => ({ ...p, usedThisQuestion: false })),
        activePowerUp: null,
        opponentFrozen: false,
        opponentFreezeEndTime: null,
        playerTimerBonus: 0,
        hiddenAnswers: [],
        replacedAnswer: null,
      };
    });
  }, []);

  const finishMatch = useCallback(() => {
    setState(prev => ({ ...prev, phase: "match-result" }));
  }, []);

  const resetGame = useCallback(() => {
    setState(initialState);
    resetAskedQuestions(); // Clear tracked questions on game reset
  }, [resetAskedQuestions]);

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
        usePowerUp,
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
