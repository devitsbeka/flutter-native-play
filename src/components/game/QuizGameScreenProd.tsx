import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGame, PowerUpType } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { QuizPlayerAvatar } from "@/components/ui/quiz-player-avatar";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizPowerUpBar } from "@/components/ui/quiz-power-up-bar";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { TimerBadge } from "@/components/game/TimerBadge";
import { PowerUpType as UIPowerUpType } from "@/components/ui/quiz-power-up-button";
import { useAIIcon } from "@/hooks/useAIIcon";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

// Bot avatars for opponent
import botAvatar1 from "@/assets/avatars/bot-avatar-1.png";
import botAvatar2 from "@/assets/avatars/bot-avatar-2.png";
import botAvatar3 from "@/assets/avatars/bot-avatar-3.png";
import botAvatar4 from "@/assets/avatars/bot-avatar-4.png";
import botAvatar5 from "@/assets/avatars/bot-avatar-5.png";

const botAvatars = [botAvatar1, botAvatar2, botAvatar3, botAvatar4, botAvatar5];

// Georgian answer labels
const ANSWER_LABELS = ["ა", "ბ", "გ", "დ"];

// Difficulty labels and colors
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "მარტივი",
  medium: "საშუალო",
  hard: "რთული",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-success",
  medium: "bg-warning",
  hard: "bg-destructive",
};

// Removed text truncation - show full question and answer text

export function QuizGameScreenProd() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    phase,
    questions,
    currentQuestionIndex,
    userScore,
    opponentScore,
    opponent,
    timePerQuestion,
    userAnswerHistory,
    lastAnswerCorrect,
    lastUserAnswer,
    lastOpponentAnswer,
    playerPowerUps,
    hiddenAnswers,
    playerTimerBonus,
    playerTimerFrozen,
    playerFreezeEndTime,
    answerQuestion,
    nextQuestion,
    usePowerUp,
  } = useGame();

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [opponentAvatarIndex] = useState(() => Math.floor(Math.random() * botAvatars.length));
  const [freezeTimeLeft, setFreezeTimeLeft] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Get AI-suggested icon for current question
  const { aiData } = useAIIcon({
    questionText: currentQuestion?.question,
    category: currentQuestion?.categoryId,
    enabled: !!currentQuestion,
  });

  // Reset state when question changes
  useEffect(() => {
    setTimeRemaining(timePerQuestion + playerTimerBonus);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
  }, [currentQuestionIndex, timePerQuestion, playerTimerBonus]);

  // Sync with phase changes
  useEffect(() => {
    if (phase === "question-result") {
      setAnswerRevealed(true);
    }
  }, [phase]);

  // Timer countdown - pauses when frozen
  useEffect(() => {
    if (phase !== "playing" || answerRevealed || !currentQuestion) return;

    const interval = setInterval(() => {
      // Check if timer is frozen
      if (playerTimerFrozen && playerFreezeEndTime) {
        const remaining = Math.max(0, Math.ceil((playerFreezeEndTime - Date.now()) / 1000));
        setFreezeTimeLeft(remaining);
        if (remaining <= 0) {
          // Freeze expired - timer will resume on next tick
          setFreezeTimeLeft(0);
        }
        return; // Don't decrement timer while frozen
      }
      
      setFreezeTimeLeft(0);
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAnswer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, answerRevealed, currentQuestion, currentQuestionIndex, playerTimerFrozen, playerFreezeEndTime]);

  const handleAnswer = useCallback(
    (answer: string | null) => {
      if (answerRevealed || !currentQuestion) return;
      
      const finalAnswer = answer || "";
      setSelectedAnswer(finalAnswer);
      setAnswerRevealed(true);
      answerQuestion(finalAnswer, timeRemaining);
    },
    [answerRevealed, currentQuestion, timeRemaining, answerQuestion]
  );

  const handleNext = useCallback(() => {
    nextQuestion();
  }, [nextQuestion]);

  const handleUsePowerUp = useCallback(
    (type: UIPowerUpType) => {
      const powerUpMap: Record<UIPowerUpType, PowerUpType> = {
        "5050": "fifty-fifty",
        freeze: "freeze",
        replace: "replace",
        hint: "time-drain",
      };
      usePowerUp(powerUpMap[type]);
    },
    [usePowerUp]
  );

  // Get answer button state
  const getAnswerState = useCallback(
    (answer: string): QuizAnswerState => {
      if (!answerRevealed) {
        if (hiddenAnswers.includes(answer)) return "disabled";
        return "default";
      }

      const isCorrect = answer === currentQuestion?.correctAnswer;
      const isSelected = answer === lastUserAnswer;

      if (isCorrect) return "correct";
      if (isSelected && !isCorrect) return "wrong";
      return "default";
    },
    [answerRevealed, hiddenAnswers, currentQuestion, lastUserAnswer]
  );

  // Build progress results for dots
  const progressResults = useMemo(() => {
    const results: ("correct" | "wrong" | null)[] = [];
    for (let i = 0; i < questions.length; i++) {
      if (i < userAnswerHistory.length) {
        results.push(userAnswerHistory[i].correct ? "correct" : "wrong");
      } else {
        results.push(null);
      }
    }
    return results;
  }, [questions.length, userAnswerHistory]);

  // Power-ups for UI
  const powerUpsForUI = useMemo(() => {
    const typeMap: Record<PowerUpType, UIPowerUpType> = {
      "fifty-fifty": "5050",
      freeze: "freeze",
      replace: "replace",
      "time-drain": "hint",
    };
    return playerPowerUps.map((p) => ({
      type: typeMap[p.type],
      count: p.available,
      state: p.usedThisQuestion ? ("disabled" as const) : ("default" as const),
    }));
  }, [playerPowerUps]);

  // Visible answers (filtered by 50/50)
  const visibleAnswers = useMemo(() => {
    if (!currentQuestion) return [];
    return currentQuestion.allAnswers.filter((a) => !hiddenAnswers.includes(a));
  }, [currentQuestion, hiddenAnswers]);

  // Get player avatar state
  const getPlayerState = useCallback(() => {
    if (!answerRevealed) return "active";
    return lastAnswerCorrect ? "correct" : "wrong";
  }, [answerRevealed, lastAnswerCorrect]);

  // Get opponent avatar state
  const getOpponentState = useCallback(() => {
    if (!answerRevealed) return "default";
    const isOpponentCorrect = lastOpponentAnswer === currentQuestion?.correctAnswer;
    return isOpponentCorrect ? "correct" : "wrong";
  }, [answerRevealed, lastOpponentAnswer, currentQuestion]);

  if (!currentQuestion) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#7E7ADB]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#7E7ADB] overflow-hidden">
      {/* Safe area padding for notched phones */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <HelpCircle className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Players Row - No VS */}
      <div className="flex items-start justify-between px-4 pt-2 flex-shrink-0 z-10">
        {/* Player (Left) - Use user's profile avatar */}
        <QuizPlayerAvatar
          avatarUrl={profile?.avatar_url}
          animatedAvatarUrl={profile?.animated_avatar_url}
          score={userScore}
          position="left"
          state={getPlayerState()}
          size="large"
        />

        {/* Opponent (Right) */}
        <QuizPlayerAvatar
          avatarUrl={botAvatars[opponentAvatarIndex]}
          score={opponentScore}
          position="right"
          state={getOpponentState()}
          size="large"
        />
      </div>

      {/* Question Card with 3D Icon Overlay */}
      <div className="px-4 flex-shrink-0 mt-3 relative">
        {/* 3D Icon - Absolute positioned on top of question card */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-24 z-20 w-32 h-32">
          <DynamicIcon 
            // Priority: question icon_slug > category icon_slug > category fallback (no placeholder)
            slug={currentQuestion.questionIconSlug || currentQuestion.categoryIconSlug}
            categoryId={currentQuestion.categoryId}
            size={128}
            className="drop-shadow-lg"
            hideIfEmpty={true}
          />
        </div>
        
        <QuizQuestionCard
          questionText={currentQuestion.question}
          progressPercent={(timeRemaining / (timePerQuestion + playerTimerBonus)) * 100}
          state={playerTimerFrozen ? "frozen" : "default"}
          difficultyLabel={DIFFICULTY_LABELS[currentQuestion.difficulty] || DIFFICULTY_LABELS.medium}
          difficultyColor={DIFFICULTY_COLORS[currentQuestion.difficulty] || DIFFICULTY_COLORS.medium}
          timerSeconds={timeRemaining}
          timerMaxSeconds={timePerQuestion + playerTimerBonus}
          freezeTimeLeft={freezeTimeLeft}
        />
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center my-2 flex-shrink-0">
        <QuizProgressDots
          total={questions.length}
          current={currentQuestionIndex}
          results={progressResults}
        />
      </div>

      {/* Answer Buttons - No Scroll */}
      <div className="flex-1 px-4 flex flex-col gap-1.5 overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isHidden = hiddenAnswers.includes(answer);
            if (isHidden) return null;

            return (
              <motion.div
                key={`${currentQuestionIndex}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex-shrink-0"
              >
                <QuizAnswerButton
                  label={ANSWER_LABELS[index]}
                  text={answer}
                  state={getAnswerState(answer)}
                  onClick={() => handleAnswer(answer)}
                  disabled={answerRevealed}
                  showLabel={true}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom Area - Power-ups OR Next Button */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="pb-[env(safe-area-inset-bottom)]">
          <AnimatePresence mode="wait">
            {answerRevealed ? (
              <motion.div
                key="next-button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ChunkyButton
                  variant="secondary"
                  size="xl"
                  onClick={handleNext}
                  className="w-full"
                >
                  {isLastQuestion ? "შედეგები" : "შემდეგი კითხვა"}
                </ChunkyButton>
              </motion.div>
            ) : (
              <motion.div
                key="power-ups"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <QuizPowerUpBar
                  powerUps={powerUpsForUI}
                  onPowerUpClick={handleUsePowerUp}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
