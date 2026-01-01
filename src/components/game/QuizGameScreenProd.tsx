import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGame, PowerUpType } from "@/contexts/GameContext";
import { QuizPlayerAvatar } from "@/components/ui/quiz-player-avatar";
import { QuizCategoryIcon } from "@/components/ui/quiz-category-icon";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizPowerUpBar } from "@/components/ui/quiz-power-up-bar";
import { QuizNextButton } from "@/components/ui/quiz-next-button";
import { PowerUpType as UIPowerUpType } from "@/components/ui/quiz-power-up-button";

// Bot avatars for opponent
import botAvatar1 from "@/assets/avatars/bot-avatar-1.png";
import botAvatar2 from "@/assets/avatars/bot-avatar-2.png";
import botAvatar3 from "@/assets/avatars/bot-avatar-3.png";
import botAvatar4 from "@/assets/avatars/bot-avatar-4.png";
import botAvatar5 from "@/assets/avatars/bot-avatar-5.png";

// Popcorn icon for category
import popcornIcon from "@/assets/icons/icon-compass.png";

const botAvatars = [botAvatar1, botAvatar2, botAvatar3, botAvatar4, botAvatar5];

// Georgian answer labels
const ANSWER_LABELS = ["ა", "ბ", "გ", "დ"];

// Difficulty mappings
const DIFFICULTY_MAP: Record<string, "easy" | "medium" | "hard"> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

// Removed text truncation - show full question and answer text

export function QuizGameScreenProd() {
  const navigate = useNavigate();
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
    answerQuestion,
    nextQuestion,
    usePowerUp,
  } = useGame();

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [opponentAvatarIndex] = useState(() => Math.floor(Math.random() * botAvatars.length));

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

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

  // Timer countdown
  useEffect(() => {
    if (phase !== "playing" || answerRevealed || !currentQuestion) return;

    const interval = setInterval(() => {
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
  }, [phase, answerRevealed, currentQuestion, currentQuestionIndex]);

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

      {/* Players Row */}
      <div className="flex items-start justify-between px-4 flex-shrink-0">
        {/* Player (Left) */}
        <QuizPlayerAvatar
          avatarUrl={opponent?.avatarUrl}
          score={userScore}
          position="left"
          state={getPlayerState()}
        />

        {/* Spacer for centered icon */}
        <div className="flex-1" />

        {/* Opponent (Right) */}
        <QuizPlayerAvatar
          avatarUrl={botAvatars[opponentAvatarIndex]}
          score={opponentScore}
          position="right"
          state={getOpponentState()}
        />
      </div>

      {/* Question Card with Floating Category Icon */}
      <div className="relative px-4 flex-shrink-0" style={{ marginTop: "-52px" }}>
        {/* Floating Category Icon - 50% overlap */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{ top: "-48px" }}
        >
          <QuizCategoryIcon
            categoryId={currentQuestion.categoryId || currentQuestion.category}
            size={96}
            state="default"
          />
        </div>

        <QuizQuestionCard
          questionText={currentQuestion.question}
          progressPercent={(timeRemaining / (timePerQuestion + playerTimerBonus)) * 100}
          state="default"
          className="pt-12"
        />
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center my-3 flex-shrink-0">
        <QuizProgressDots
          total={questions.length}
          current={currentQuestionIndex}
          results={progressResults}
        />
      </div>

      {/* Answer Buttons - No Scroll */}
      <div className="flex-1 px-4 flex flex-col gap-2 overflow-hidden min-h-0">
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
                <QuizNextButton
                  text={isLastQuestion ? "შედეგები" : "შემდეგი კითხვა"}
                  duration={3000}
                  onClick={handleNext}
                  autoClickEnabled={true}
                />
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
