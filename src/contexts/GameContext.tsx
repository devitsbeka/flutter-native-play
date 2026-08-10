import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { FakeOpponent, generateFakeOpponent } from "@/data/opponents";
import { TriviaQuestion, useTrivia, calculateScore } from "@/hooks/useTrivia";
import { FIRST_ANSWER_BONUS } from "@/utils/scoring";
import { preloadQuestionIcons } from "@/hooks/useAIIcon";
import { missionTracker } from "@/services/missionTracker";
import posthog from "posthog-js";

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

/**
 * What the opponent is going to do on the current question, decided when the
 * question opens instead of when the player taps.
 *
 * The old code rolled all of this inside answerQuestion(), which meant the
 * opponent did not exist until the player had already finished: there was no
 * moment during the question at which they could be said to be playing, and
 * so nothing to show. Deciding it up front gives them a clock, and a clock is
 * what makes them feel like someone sitting across the table.
 */
export interface OpponentTurn {
  correct: boolean;
  answer: string;
  /** Seconds still on the clock at the moment they commit. */
  atRemaining: number;
}

/**
 * Bot strength, rolled once per match so games swing: a weak bot is
 * beatable by anyone, a strong one answers fast and accurately enough to
 * beat a decent player. Accuracy gets a small per-question jitter so two
 * games against the same tier don't play identically.
 */
export type BotSkill = "weak" | "average" | "strong";

const BOT_SKILL_PROFILES: Record<
  BotSkill,
  { accuracy: number; commitMin: number; commitMax: number }
> = {
  // commitMin/commitMax are fractions of the clock still remaining when the
  // bot locks in — higher fractions mean faster answers and bigger time bonus.
  weak: { accuracy: 0.45, commitMin: 0.1, commitMax: 0.45 },
  average: { accuracy: 0.65, commitMin: 0.25, commitMax: 0.6 },
  strong: { accuracy: 0.85, commitMin: 0.45, commitMax: 0.85 },
};

export function rollBotSkill(): BotSkill {
  const r = Math.random();
  return r < 1 / 3 ? "weak" : r < 2 / 3 ? "average" : "strong";
}

function planOpponentTurn(
  question: TriviaQuestion,
  timePerQuestion: number,
  skill: BotSkill = "average"
): OpponentTurn {
  const profile = BOT_SKILL_PROFILES[skill];
  const accuracy = Math.min(0.95, Math.max(0.2, profile.accuracy + (Math.random() * 0.1 - 0.05)));
  const correct = Math.random() < accuracy;
  let answer = question.correctAnswer;
  if (!correct) {
    const wrong = question.allAnswers.filter(a => a !== question.correctAnswer);
    answer = wrong[Math.floor(Math.random() * wrong.length)] ?? question.correctAnswer;
  }
  return {
    correct,
    answer,
    atRemaining:
      timePerQuestion * (profile.commitMin + Math.random() * (profile.commitMax - profile.commitMin)),
  };
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

  /** The opponent's plan for the question on screen. */
  opponentTurn: OpponentTurn | null;
  /** True once their clock has run down to it and they have locked in. */
  opponentAnswered: boolean;
  /** Bot strength for this match, rolled fresh each matchmaking. */
  opponentSkill: BotSkill;
  
  // Power-up state
  playerPowerUps: PowerUpState[];
  opponentPowerUps: PowerUpState[];
  activePowerUp: PowerUpType | null;
  opponentFrozen: boolean;
  opponentFreezeEndTime: number | null;
  playerTimerFrozen: boolean;
  playerFreezeEndTime: number | null;
  playerTimerBonus: number;
  hiddenAnswers: string[];
  replacedAnswer: { old: string; new: string } | null;
  /** True while the player is on a question they skipped to with "replace".
      The opponent is still answering the question the player walked away
      from, so their pick must not be revealed on this one. */
  questionReplaced: boolean;
}

interface GameContextType extends GameState {
  startMatchmaking: (categoryId?: string) => Promise<void>;
  beginPlaying: (categoryId: string, preloadedQuestions?: TriviaQuestion[]) => Promise<void>;
  answerQuestion: (answer: string, timeRemaining: number) => void;
  /** Called by the game screen when the opponent's clock runs down to their commit point. */
  opponentCommits: () => void;
  nextQuestion: () => void;
  finishMatch: () => void;
  resetGame: () => void;
  usePowerUp: (type: PowerUpType) => void;
  loading: boolean;
  selectedCategoryId: string | null;
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
  opponentTurn: null,
  opponentAnswered: false,
  opponentSkill: "average",

  // Power-up initial state
  playerPowerUps: defaultPowerUps.map(p => ({ ...p })),
  opponentPowerUps: defaultPowerUps.map(p => ({ ...p })),
  activePowerUp: null,
  opponentFrozen: false,
  opponentFreezeEndTime: null,
  playerTimerFrozen: false,
  playerFreezeEndTime: null,
  playerTimerBonus: 0,
  hiddenAnswers: [],
  replacedAnswer: null,
  questionReplaced: false,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

const SESSION_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { fetchQuestions, loading, preparationProgress, resetAskedQuestions } = useTrivia();
  const sessionStartTimeRef = useRef<number | null>(null);

  // Track session start and check for 3-hour timeout
  useEffect(() => {
    const activePhases: GamePhase[] = ["matchmaking", "preparing", "vs-screen", "playing", "question-result"];
    
    if (activePhases.includes(state.phase)) {
      // Start tracking if not already
      if (sessionStartTimeRef.current === null) {
        sessionStartTimeRef.current = Date.now();
      }
      
      // Check timeout every minute
      const checkTimeout = () => {
        if (sessionStartTimeRef.current && Date.now() - sessionStartTimeRef.current >= SESSION_TIMEOUT_MS) {
          console.log("Game session expired after 3 hours, resetting to lobby");
          sessionStartTimeRef.current = null;
          setState(initialState);
          resetAskedQuestions();
        }
      };
      
      const intervalId = setInterval(checkTimeout, 60000); // Check every minute
      checkTimeout(); // Also check immediately
      
      return () => clearInterval(intervalId);
    } else {
      // Reset timer when not in active game phases
      sessionStartTimeRef.current = null;
    }
  }, [state.phase, resetAskedQuestions]);

  const startMatchmaking = useCallback(async (categoryId?: string) => {
    setState(prev => ({ ...prev, phase: "matchmaking" }));
    setSelectedCategoryId(categoryId || null);
    
    // Reset mission tracker for new game session
    missionTracker.resetSession();
    
    // Generate opponent immediately, with a freshly rolled strength so some
    // matches are easy wins and others are genuinely losable
    const opponent = generateFakeOpponent();
    const opponentSkill = rollBotSkill();

    // Short delay for slot animation to start (0.8s instead of 2s)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setState(prev => ({ 
      ...prev, 
      phase: "vs-screen",
      opponent,
      opponentSkill,
      userProgress: 0,
      opponentProgress: 0,
      userAnswerHistory: [],
      opponentAnswerHistory: [],
    }));
  }, []);

  // Sync preparation progress
  React.useEffect(() => {
    if (state.phase === "preparing") {
      setState(prev => ({ ...prev, preparationProgress }));
    }
  }, [preparationProgress, state.phase]);

  // startMatch is no longer needed - VSScreen handles category selection directly

  const isStartingRef = useRef(false);
  
  const beginPlaying = useCallback(async (categoryId: string, preloadedQuestions?: TriviaQuestion[]) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    
    try {
      // Use preloaded questions if available, otherwise fetch
      let questions: TriviaQuestion[] | undefined;
      
      if (preloadedQuestions && preloadedQuestions.length > 0) {
        questions = preloadedQuestions;
      } else {
        // Try to fetch questions for the selected category
        questions = await fetchQuestions(6, categoryId, 1, [], false);
      }
      
      // If no questions for this category, try fetching from all categories
      if (!questions || questions.length === 0) {
        console.warn("No questions for category, falling back to all categories:", categoryId);
        questions = await fetchQuestions(6, undefined, 1, [], false);
      }
      
      // P2-4: Handle no questions with user-facing error
      if (!questions || questions.length === 0) {
        console.error("No questions available at all");
        // Show toast with localized message and return to home
        const { toast } = await import("sonner");
        const stored = localStorage.getItem('preferredLanguage') || 'ka';
        const msg = stored === 'ka' ? 'კითხვები ვერ მოიძებნა ამ ენაზე' : 'No questions available in this language yet';
        toast.error(msg);
        setState(prev => ({ ...prev, phase: "home" }));
        return;
      }
      
      // Preload icons for new questions
      preloadQuestionIcons(
        questions.map(q => ({ question: q.question, category: q.categoryId || q.category }))
      );
      
      setSelectedCategoryId(categoryId);
      
      setState(prev => ({
        ...prev,
        phase: "playing",
        questions,
        currentQuestionIndex: 0,
        userScore: 0,
        opponentScore: 0,
        streak: 0,
        userProgress: 0,
        opponentProgress: 0,
        userAnswerHistory: [],
        opponentAnswerHistory: [],
        // Explicitly reset all answer state to prevent "already answered" bug
        lastAnswerCorrect: null,
        lastPointsEarned: 0,
        lastOpponentCorrect: null,
        lastOpponentAnswer: null,
        lastUserAnswer: null,
        opponentTurn: planOpponentTurn(questions[0], prev.timePerQuestion, prev.opponentSkill),
        opponentAnswered: false,
        // Reset power-ups for new match
        playerPowerUps: defaultPowerUps.map(p => ({ ...p })),
        opponentPowerUps: defaultPowerUps.map(p => ({ ...p })),
        activePowerUp: null,
        opponentFrozen: false,
        opponentFreezeEndTime: null,
        playerTimerFrozen: false,
        playerFreezeEndTime: null,
        playerTimerBonus: 0,
        hiddenAnswers: [],
        replacedAnswer: null,
  questionReplaced: false,
      }));

      posthog.capture("pvp_game_started", {
        category_id: categoryId,
        question_count: questions.length,
        opponent_name: state.opponent?.name || "unknown",
      });
    } catch (error) {
      console.error("Error fetching questions:", error);
      setState(prev => ({ ...prev, phase: "home" }));
    } finally {
      isStartingRef.current = false;
    }
  }, [fetchQuestions]);

  const usePowerUp = useCallback((type: PowerUpType) => {
    setState(prev => {
      const currentQuestion = prev.questions[prev.currentQuestionIndex];
      if (!currentQuestion) return prev;

      const powerUpIndex = prev.playerPowerUps.findIndex(p => p.type === type);
      if (powerUpIndex === -1) return prev;

      const powerUp = prev.playerPowerUps[powerUpIndex];
      // Only block if already used this question - inventory is handled by the caller
      if (powerUp.usedThisQuestion) return prev;

      // Clone power-ups array (decrement available for VS mode tracking)
      const newPowerUps = prev.playerPowerUps.map((p, i) =>
        i === powerUpIndex
          ? { ...p, available: Math.max(0, p.available - 1), usedThisQuestion: true }
          : p
      );

      // PostHog: track power-up used in PvP
      posthog.capture("power_up_used", {
        power_up_type: type,
        context: "pvp",
      });

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
          updates.hiddenAnswers = shuffled.slice(0, Math.min(2, shuffled.length - 1));
          break;
        }
        case "freeze": {
          // Freeze player's timer for 10 seconds
          updates.playerTimerFrozen = true;
          updates.playerFreezeEndTime = Date.now() + 10000;
          // Also freeze opponent (optional bonus effect)
          updates.opponentFrozen = true;
          updates.opponentFreezeEndTime = Date.now() + 10000;
          // Push their commit ten seconds later and spoil the answer. This
          // used to be applied at scoring time, where it was invisible; now
          // that they answer on a clock the player gets to watch the freeze
          // land. An opponent who has ALREADY locked in is left alone -
          // rewriting a commit the player just watched happen would read as
          // a glitch rather than a power-up.
          if (!prev.opponentAnswered && prev.opponentTurn) {
            const wrong = currentQuestion.allAnswers.filter(a => a !== currentQuestion.correctAnswer);
            updates.opponentTurn = {
              correct: false,
              // Move them off the right answer as well, or the reveal would
              // show them sitting on it while scored wrong.
              answer: prev.opponentTurn.correct
                ? (wrong[Math.floor(Math.random() * wrong.length)] ?? prev.opponentTurn.answer)
                : prev.opponentTurn.answer,
              atRemaining: Math.max(0, prev.opponentTurn.atRemaining - 10),
            };
          }
          break;
        }
        case "replace": {
          // Skip to the next question
          if (prev.currentQuestionIndex < prev.questions.length - 1) {
            const skipTo = prev.currentQuestionIndex + 1;
            updates.currentQuestionIndex = skipTo;
            updates.hiddenAnswers = [];
            updates.replacedAnswer = null;
            updates.questionReplaced = true;
            // A new question means a new turn for the opponent too - the old
            // plan names an answer that does not exist on this one.
            updates.opponentTurn = planOpponentTurn(prev.questions[skipTo], prev.timePerQuestion, prev.opponentSkill);
            updates.opponentAnswered = false;
            // Reset power-up usage for new question
            updates.playerPowerUps = prev.playerPowerUps.map(p => ({ ...p, usedThisQuestion: false }));
            updates.opponentPowerUps = prev.opponentPowerUps.map(p => ({ ...p, usedThisQuestion: false }));
            updates.activePowerUp = null;
            updates.playerTimerBonus = 0;
            updates.playerTimerFrozen = false;
            updates.playerFreezeEndTime = null;
          }
          break;
        }
        case "time-drain": {
          // Add 10 seconds to timer
          updates.playerTimerBonus = prev.playerTimerBonus + 10;
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

      // Track mission progress
      missionTracker.recordAnswer();
      if (isCorrect) {
        missionTracker.recordCorrectAnswer();
      }
      // Track category played
      const categoryId = currentQuestion.categoryId || currentQuestion.category;
      missionTracker.recordCategoryPlayed(categoryId);

      // The opponent's plan was fixed when the question opened, so "who was
      // first" compares the player's tap against the bot's committed moment:
      // more clock remaining = answered earlier. First correct gets the
      // flat bonus on top of the unified formula.
      const plannedTurn =
        prev.opponentTurn ?? planOpponentTurn(currentQuestion, prev.timePerQuestion, prev.opponentSkill);
      const playerWasFirstCorrect =
        isCorrect && (!plannedTurn.correct || timeRemaining > plannedTurn.atRemaining);
      const botWasFirstCorrect =
        plannedTurn.correct && (!isCorrect || plannedTurn.atRemaining >= timeRemaining);

      const points =
        calculateScore(isCorrect, timeRemaining) +
        (playerWasFirstCorrect ? FIRST_ANSWER_BONUS : 0);

      // PostHog: track question answered
      posthog.capture("pvp_question_answered", {
        category_id: categoryId,
        question_number: prev.currentQuestionIndex + 1,
        is_correct: isCorrect,
        points,
        streak: isCorrect ? prev.streak + 1 : 0,
        time_remaining: timeRemaining,
        difficulty: currentQuestion.difficulty,
      });

      // The opponent's turn was decided when this question opened, so their
      // answer and their timing are the same ones the player has been
      // watching - not a fresh roll made at the instant of this tap.
      const turn = plannedTurn;
      const opponentCorrect = turn.correct;
      const opponentAnswer = turn.answer;
      const opponentPoints =
        calculateScore(opponentCorrect, turn.atRemaining) +
        (botWasFirstCorrect ? FIRST_ANSWER_BONUS : 0);

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
        opponentAnswered: true,
      };
    });
  }, []);

  /**
   * The opponent locks in. Only flips the flag the UI watches - the points
   * are still priced in answerQuestion off the same plan, so a player who
   * taps first and a player who waits get the same opponent either way.
   */
  const opponentCommits = useCallback(() => {
    setState(prev => (prev.opponentAnswered ? prev : { ...prev, opponentAnswered: true }));
  }, []);

  const nextQuestion = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentQuestionIndex + 1;
      
      if (nextIndex >= prev.questions.length) {
        // PostHog: track PvP game finished
        const correctCount = prev.userAnswerHistory.filter(a => a.correct).length;
        posthog.capture("pvp_game_finished", {
          user_score: prev.userScore,
          opponent_score: prev.opponentScore,
          total_questions: prev.questions.length,
          correct_answers: correctCount,
          result: prev.userScore > prev.opponentScore ? "win" : prev.userScore === prev.opponentScore ? "tie" : "loss",
        });
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
        opponentTurn: planOpponentTurn(prev.questions[nextIndex], prev.timePerQuestion, prev.opponentSkill),
        opponentAnswered: false,
        // Reset per-question power-up state
        playerPowerUps: prev.playerPowerUps.map(p => ({ ...p, usedThisQuestion: false })),
        activePowerUp: null,
        opponentFrozen: false,
        opponentFreezeEndTime: null,
        playerTimerFrozen: false,
        playerFreezeEndTime: null,
        playerTimerBonus: 0,
        hiddenAnswers: [],
        replacedAnswer: null,
  questionReplaced: false,
      };
    });
  }, []);

  const finishMatch = useCallback(() => {
    setState(prev => {
      // PostHog: track PvP game finished (when finishMatch called directly)
      const correctCount = prev.userAnswerHistory.filter(a => a.correct).length;
      posthog.capture("pvp_game_finished", {
        user_score: prev.userScore,
        opponent_score: prev.opponentScore,
        total_questions: prev.questions.length,
        correct_answers: correctCount,
        result: prev.userScore > prev.opponentScore ? "win" : prev.userScore === prev.opponentScore ? "tie" : "loss",
      });
      return { ...prev, phase: "match-result" };
    });
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
        beginPlaying,
        answerQuestion,
        opponentCommits,
        nextQuestion,
        finishMatch,
        resetGame,
        usePowerUp,
        loading,
        selectedCategoryId,
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
