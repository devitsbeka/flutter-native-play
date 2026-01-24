import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGame, PowerUpType } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { QuizPlayerAvatar } from "@/components/ui/quiz-player-avatar";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizTrueFalseButton, type QuizTrueFalseState } from "@/components/ui/quiz-true-false-button";
import { QuizPowerUpBar } from "@/components/ui/quiz-power-up-bar";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { TimerBadge } from "@/components/game/TimerBadge";
import { PowerUpType as UIPowerUpType } from "@/components/ui/quiz-power-up-button";
import { useAIIcon } from "@/hooks/useAIIcon";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useUserPowerUps, PowerUpType as DBPowerUpType } from "@/hooks/useUserPowerUps";
import { ActivePowerUpIndicator, PowerUpScreenEffect } from "@/components/game/ActivePowerUpIndicator";
import { useAdminRole } from "@/hooks/useAdminRole";
import { EditQuestionDialog } from "@/components/social/EditQuestionDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Bot avatars for opponent
import botAvatar1 from "@/assets/avatars/bot-avatar-1.png";
import botAvatar2 from "@/assets/avatars/bot-avatar-2.png";
import botAvatar3 from "@/assets/avatars/bot-avatar-3.png";
import botAvatar4 from "@/assets/avatars/bot-avatar-4.png";
import botAvatar5 from "@/assets/avatars/bot-avatar-5.png";

const botAvatars = [botAvatar1, botAvatar2, botAvatar3, botAvatar4, botAvatar5];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-success",
  medium: "bg-amber-500",
  hard: "bg-destructive",
};

// Removed text truncation - show full question and answer text

export function QuizGameScreenProd() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { isAdmin } = useAdminRole();
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
    replacedAnswer,
    playerTimerBonus,
    playerTimerFrozen,
    playerFreezeEndTime,
    answerQuestion,
    nextQuestion,
    usePowerUp,
  } = useGame();
  
  // Database power-ups for persistent inventory
  const { powerUps: dbPowerUps, usePowerUp: consumeFromDB } = useUserPowerUps();

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [opponentAvatarIndex] = useState(() => Math.floor(Math.random() * botAvatars.length));
  const [freezeTimeLeft, setFreezeTimeLeft] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [localEdits, setLocalEdits] = useState<
    Record<
      string,
      {
        questionText: string;
        correctAnswer: string;
        incorrectAnswers: string[];
        iconSlug: string | null;
      }
    >
  >({});

  const baseQuestion = questions[currentQuestionIndex];
  const editOverride = baseQuestion?.id ? localEdits[baseQuestion.id] : undefined;
  const currentQuestion = useMemo(() => {
    if (!baseQuestion) return baseQuestion;
    if (!editOverride) return baseQuestion;

    const allAnswers = [
      editOverride.correctAnswer,
      ...editOverride.incorrectAnswers,
    ].filter((a) => !!a && a.trim().length > 0);

    return {
      ...baseQuestion,
      question: editOverride.questionText,
      correctAnswer: editOverride.correctAnswer,
      allAnswers,
      questionIconSlug: editOverride.iconSlug,
    };
  }, [baseQuestion, editOverride]);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Detect true/false questions (based on currently displayed answers)
  const isTrueFalseQuestion = useMemo(() => {
    if (!currentQuestion?.allAnswers) return false;
    if (currentQuestion.allAnswers.length !== 2) return false;

    const answers = currentQuestion.allAnswers.map((a) => a.toLowerCase());
    return (
      (answers.includes("მართალია") && answers.includes("მცდარია")) ||
      (answers.includes("true") && answers.includes("false"))
    );
  }, [currentQuestion?.allAnswers]);

  // Translated labels
  const ANSWER_LABELS = useMemo(() => [
    t("game.labelA"),
    t("game.labelB"), 
    t("game.labelC"),
    t("game.labelD")
  ], [t]);
  
  const getDifficultyLabel = useCallback((difficulty: string) => {
    return t(`game.difficulty.${difficulty}`) || difficulty;
  }, [t]);

  // Get AI-suggested icon for current question - only if no hand-picked icon exists
  const { aiData } = useAIIcon({
    questionText: currentQuestion?.question,
    category: currentQuestion?.categoryId,
    enabled: !!currentQuestion && !currentQuestion.questionIconSlug,
  });

  const handleSaveEdit = useCallback(
    async (updated: {
      question_text: string;
      correct_answer: string;
      incorrect_answers?: string[];
      icon_slug?: string | null;
    }) => {
      if (!baseQuestion?.id) return;

      const incorrectAnswers = (updated.incorrect_answers || [])
        .map((a) => a?.trim?.() ?? "")
        .filter((a) => a.length > 0);

      // For 4-answer questions we expect 3 incorrect answers.
      if (!isTrueFalseQuestion && incorrectAnswers.length < 3) {
        toast.error("შეავსეთ 3 არასწორი პასუხი");
        return;
      }

      setIsSavingEdit(true);
      try {
        const { error } = await supabase
          .from("questions")
          .update({
            question_text: updated.question_text.trim(),
            correct_answer: updated.correct_answer.trim(),
            incorrect_answers: incorrectAnswers,
            icon_slug: updated.icon_slug ?? null,
          })
          .eq("id", baseQuestion.id);

        if (error) throw error;

        // Reflect immediately in UI even if game questions are preloaded.
        setLocalEdits((prev) => ({
          ...prev,
          [baseQuestion.id]: {
            questionText: updated.question_text.trim(),
            correctAnswer: updated.correct_answer.trim(),
            incorrectAnswers: isTrueFalseQuestion
              ? // Keep the other option as the only incorrect answer
                [
                  ...new Set(
                    baseQuestion.allAnswers
                      .filter((a) => a !== updated.correct_answer)
                      .concat(incorrectAnswers)
                  ),
                ].slice(0, 1)
              : incorrectAnswers.slice(0, 3),
            iconSlug: updated.icon_slug ?? null,
          },
        }));

        toast.success("კითხვა განახლდა");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error";
        toast.error("ვერ შევინახე ცვლილება", { description: message });
      } finally {
        setIsSavingEdit(false);
      }
    },
    [baseQuestion, isTrueFalseQuestion]
  );

  // Reset state when question changes
  useEffect(() => {
    setTimeRemaining(timePerQuestion + playerTimerBonus);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setFreezeTimeLeft(0);
  }, [currentQuestionIndex, timePerQuestion, playerTimerBonus]);

  // Reset all local state when phase transitions to "playing" (fresh game start)
  useEffect(() => {
    if (phase === "playing" && currentQuestionIndex === 0) {
      // Small delay to ensure all context state is propagated
      const timeout = setTimeout(() => {
        setTimeRemaining(timePerQuestion + playerTimerBonus);
        setSelectedAnswer(null);
        setAnswerRevealed(false);
        setFreezeTimeLeft(0);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [phase, currentQuestionIndex, timePerQuestion, playerTimerBonus]);

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
    async (type: UIPowerUpType) => {
      // Map UI type to database type
      const dbTypeMap: Record<UIPowerUpType, DBPowerUpType> = {
        "5050": "5050",
        freeze: "freeze",
        replace: "replace",
        hint: "time-drain",
      };
      const dbType = dbTypeMap[type];
      
      // Check database count
      if (dbPowerUps[dbType] <= 0) return;
      
      // Consume from database
      const success = await consumeFromDB(dbType);
      if (!success) return;
      
      // Apply effect via context
      const contextTypeMap: Record<UIPowerUpType, PowerUpType> = {
        "5050": "fifty-fifty",
        freeze: "freeze",
        replace: "replace",
        hint: "time-drain",
      };
      usePowerUp(contextTypeMap[type]);
    },
    [dbPowerUps, consumeFromDB, usePowerUp]
  );

  // Get answer button state
  const getAnswerState = useCallback(
    (answer: string): QuizAnswerState => {
      if (!answerRevealed) {
        if (hiddenAnswers.includes(answer)) return "disabled";
        if (replacedAnswer?.old === answer) return "disabled";
        return "default";
      }

      const isCorrect = answer === currentQuestion?.correctAnswer;
      const isSelected = answer === lastUserAnswer;

      if (isCorrect) return "correct";
      if (isSelected && !isCorrect) return "wrong";
      return "default";
    },
    [answerRevealed, hiddenAnswers, replacedAnswer, currentQuestion, lastUserAnswer]
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

  // Power-ups for UI - use database counts for persistent inventory
  const powerUpsForUI = useMemo(() => {
    const order: DBPowerUpType[] = ["5050", "freeze", "replace", "time-drain"];
    const typeMap: Record<DBPowerUpType, UIPowerUpType> = {
      "5050": "5050",
      freeze: "freeze",
      replace: "replace",
      "time-drain": "hint",
    };
    const contextTypeMap: Record<DBPowerUpType, PowerUpType> = {
      "5050": "fifty-fifty",
      freeze: "freeze",
      replace: "replace",
      "time-drain": "time-drain",
    };
    return order.map((dbType) => {
      const contextPowerUp = playerPowerUps.find(p => p.type === contextTypeMap[dbType]);
      return {
        type: typeMap[dbType],
        count: dbPowerUps[dbType],
        state: contextPowerUp?.usedThisQuestion ? ("disabled" as const) : ("default" as const),
      };
    });
  }, [dbPowerUps, playerPowerUps]);

  // Visible answers (filtered by 50/50 and replace)
  const visibleAnswers = useMemo(() => {
    if (!currentQuestion) return [];
    return currentQuestion.allAnswers.filter((a) => {
      if (hiddenAnswers.includes(a)) return false;
      if (replacedAnswer?.old === a) return false;
      return true;
    });
  }, [currentQuestion, hiddenAnswers, replacedAnswer]);

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

  const dialogQuestion = (() => {
    const incorrect = isTrueFalseQuestion
      ? baseQuestion.allAnswers.filter((a) => a !== baseQuestion.correctAnswer).slice(0, 1)
      : baseQuestion.allAnswers.filter((a) => a !== baseQuestion.correctAnswer).slice(0, 3);

    return {
      question_text: currentQuestion.question,
      correct_answer: currentQuestion.correctAnswer,
      incorrect_answers: isTrueFalseQuestion ? incorrect : incorrect,
      icon_slug: currentQuestion.questionIconSlug ?? null,
    };
  })();

  return (
    <div className="w-full h-full bg-[#7E7ADB] overflow-hidden">
      {/* Content wrapper with max-width for desktop/tablet, centered */}
      <div className="w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto">
      {/* Safe area padding for notched phones */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* Header - Different layout for solo vs challenge mode */}
      <div className="flex items-center justify-between px-4 pt-3 py-1 mb-2 [@media(max-height:700px)]:py-0.5 [@media(max-height:700px)]:mb-1 flex-shrink-0">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 [@media(max-height:700px)]:w-8 [@media(max-height:700px)]:h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 [@media(max-height:700px)]:w-4 [@media(max-height:700px)]:h-4 text-white" />
        </button>
        
        {/* Center - Category name in solo mode, Difficulty badge in challenge mode */}
        {opponent ? (
          <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${DIFFICULTY_COLORS[currentQuestion.difficulty] || DIFFICULTY_COLORS.medium}`}>
            {getDifficultyLabel(currentQuestion.difficulty)}
          </span>
        ) : (
          <span className="text-white font-bold text-base [@media(max-height:700px)]:text-sm truncate max-w-[160px] text-center">
            {currentQuestion.category}
          </span>
        )}
        
        {/* Right - Timer for both modes */}
        <TimerBadge 
          seconds={timeRemaining} 
          maxSeconds={timePerQuestion + playerTimerBonus}
          compact
        />
      </div>

      {/* Players Row - Only show avatars in vs/challenge mode (no icon) */}
      {opponent && (
        <div className="flex items-center justify-between px-6 mt-1 mb-3 [@media(max-height:700px)]:mb-2 flex-shrink-0 z-10">
          {/* Player (Left) */}
          <QuizPlayerAvatar
            avatarUrl={profile?.avatar_url}
            animatedAvatarUrl={profile?.animated_avatar_url}
            score={userScore}
            position="left"
            state={getPlayerState()}
            size="default"
          />

          {/* Opponent (Right) */}
          <QuizPlayerAvatar
            avatarUrl={botAvatars[opponentAvatarIndex]}
            score={opponentScore}
            position="right"
            state={getOpponentState()}
            size="default"
          />
        </div>
      )}

      {/* Question Card with Overlapping Icon */}
      <div className="px-4 flex-shrink-0 mt-5 mb-2 [@media(max-height:700px)]:mt-4 [@media(max-height:700px)]:mb-1 relative">
        {/* Category Icon - overlaps card by 50% */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-20">
          <DynamicIcon 
            slug={currentQuestion.questionIconSlug || aiData?.slugs?.[0] || currentQuestion.categoryIconSlug}
            categoryId={(currentQuestion.questionIconSlug || aiData?.slugs?.[0]) ? undefined : currentQuestion.categoryId}
            questionId={currentQuestion.id}
            size={opponent ? 80 : 64}
            className="drop-shadow-lg"
            hideIfEmpty={true}
          />
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="absolute right-6 top-4 z-30 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            <Pencil className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">Edit</span>
          </button>
        )}

        <QuizQuestionCard
          questionText={currentQuestion.question}
          progressPercent={(timeRemaining / (timePerQuestion + playerTimerBonus)) * 100}
          state={playerTimerFrozen ? "frozen" : "default"}
          difficultyLabel={!opponent ? getDifficultyLabel(currentQuestion.difficulty) : undefined}
          difficultyColor={!opponent ? DIFFICULTY_COLORS[currentQuestion.difficulty] || DIFFICULTY_COLORS.medium : undefined}
          timerSeconds={!opponent ? timeRemaining : undefined}
          timerMaxSeconds={timePerQuestion + playerTimerBonus}
          freezeTimeLeft={!opponent ? freezeTimeLeft : undefined}
          reserveTopSpace
        />

        {/* Admin: show answers inline */}
        {isAdmin && (
          <div className="mt-2 rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
            <div className="text-white/70 text-xs font-bold mb-2">ANSWERS</div>
            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-emerald-200 text-xs font-bold">✓</span>
                <span className="text-white text-sm font-medium break-words">{currentQuestion.correctAnswer}</span>
              </div>
              {currentQuestion.allAnswers
                .filter((a) => a !== currentQuestion.correctAnswer)
                .map((a, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-red-200 text-xs font-bold">✗</span>
                    <span className="text-white/90 text-sm break-words">{a}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center py-3 [@media(max-height:700px)]:py-1 flex-shrink-0">
        <QuizProgressDots
          total={questions.length}
          current={currentQuestionIndex}
          results={progressResults}
        />
      </div>

      {/* Answer Buttons */}
      {isTrueFalseQuestion ? (
        <div className="w-full px-4 -mt-5 flex gap-2">
          <AnimatePresence mode="wait">
            {currentQuestion.allAnswers.map((answer, index) => {
              const isTrue = answer.toLowerCase() === "მართალია" || answer.toLowerCase() === "true";
              if (hiddenAnswers.includes(answer)) return null;
              
              return (
                <motion.div
                  key={`${currentQuestionIndex}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex-1"
                >
                  <QuizTrueFalseButton
                    variant={isTrue ? "true" : "false"}
                    state={getAnswerState(answer) as QuizTrueFalseState}
                    onClick={() => handleAnswer(answer)}
                    disabled={answerRevealed}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 px-4 -mt-5 flex flex-col gap-2 [@media(max-height:700px)]:gap-1.5 overflow-hidden min-h-0">
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
                  className="flex-shrink-0 w-full"
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
      )}

      {/* Bottom Area - Power-ups OR Next Button */}
      <div className="px-4 pb-2 [@media(max-height:700px)]:pb-1 flex-shrink-0">
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
                  {isLastQuestion ? t("game.results") : t("game.nextQuestion")}
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

      {/* Persistent freeze indicator */}
      <ActivePowerUpIndicator
        type="freeze"
        isVisible={playerTimerFrozen}
        remainingTime={freezeTimeLeft}
      />

      {/* Screen-wide freeze effect */}
      <PowerUpScreenEffect type="freeze" isActive={playerTimerFrozen} />

      {/* Admin edit dialog */}
      {isAdmin && (
        <EditQuestionDialog
          open={isEditOpen}
          onOpenChange={(open) => {
            // prevent closing while saving
            if (!open && isSavingEdit) return;
            setIsEditOpen(open);
          }}
          question={dialogQuestion}
          answerFormat={isTrueFalseQuestion ? "true_false" : "4_answers"}
          onSave={handleSaveEdit}
        />
      )}
      </div>
    </div>
  );
}
