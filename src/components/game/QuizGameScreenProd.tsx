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
import { PowerUpType as UIPowerUpType } from "@/components/ui/quiz-power-up-button";
import categoryPlaceholder from "@/assets/placeholders/category-placeholder.webp";

// Bot avatars for opponent
import botAvatar1 from "@/assets/avatars/bot-avatar-1.png";
import botAvatar2 from "@/assets/avatars/bot-avatar-2.png";
import botAvatar3 from "@/assets/avatars/bot-avatar-3.png";
import botAvatar4 from "@/assets/avatars/bot-avatar-4.png";
import botAvatar5 from "@/assets/avatars/bot-avatar-5.png";

const botAvatars = [botAvatar1, botAvatar2, botAvatar3, botAvatar4, botAvatar5];

// Georgian answer labels
const ANSWER_LABELS = ["ა", "ბ", "გ", "დ"];

// Difficulty mappings
const DIFFICULTY_MAP: Record<string, "easy" | "medium" | "hard"> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

// Max character limits
const MAX_QUESTION_CHARS = 150;
const MAX_ANSWER_CHARS = 60;

// Truncate text helper
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

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
      <div className="flex items-center justify-between px-4 py-3">
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

      {/* Players Row with Category Icon */}
      <div className="flex items-start justify-between px-4 mb-4">
        {/* Player (Left) */}
        <QuizPlayerAvatar
          avatarUrl={opponent?.avatarUrl}
          score={userScore}
          position="left"
          state={getPlayerState()}
        />

        {/* Category Icon (Center) */}
        <div className="flex-1 flex justify-center -mt-2">
          <QuizCategoryIcon
            imageUrl={categoryPlaceholder}
            size={140}
            state="default"
          />
        </div>

        {/* Opponent (Right) */}
        <QuizPlayerAvatar
          avatarUrl={botAvatars[opponentAvatarIndex]}
          score={opponentScore}
          position="right"
          state={getOpponentState()}
        />
      </div>

      {/* Question Card */}
      <div className="px-4 mb-4">
        <QuizQuestionCard
          questionText={truncateText(currentQuestion.question, MAX_QUESTION_CHARS)}
          timeRemaining={timeRemaining}
          difficulty={DIFFICULTY_MAP[currentQuestion.difficulty] || "medium"}
          state="default"
        />
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center mb-4">
        <QuizProgressDots
          total={questions.length}
          current={currentQuestionIndex}
          results={progressResults}
        />
      </div>

      {/* Answer Buttons */}
      <div className="flex-1 px-4 space-y-3 overflow-y-auto pb-2">
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
              >
                <QuizAnswerButton
                  label={ANSWER_LABELS[index]}
                  text={truncateText(answer, MAX_ANSWER_CHARS)}
                  state={getAnswerState(answer)}
                  onClick={() => handleAnswer(answer)}
                  disabled={answerRevealed}
                  showLabel={true}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Next/Results Button */}
        <AnimatePresence>
          {answerRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.3 }}
            >
              <QuizAnswerButton
                text={isLastQuestion ? "შედეგები" : "შემდეგი კითხვა"}
                state="next"
                onClick={handleNext}
                showLabel={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Power-up Bar */}
      <div className="px-4 pb-4 pt-2">
        <div className="pb-[env(safe-area-inset-bottom)]">
          <QuizPowerUpBar
            powerUps={powerUpsForUI}
            onPowerUpClick={handleUsePowerUp}
          />
        </div>
      </div>
    </div>
  );
}
