import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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
import { PowerUpScreenEffect } from "@/components/game/ActivePowerUpIndicator";
import { AnswerChoiceAvatars, type AnswerChooser } from "@/components/game/AnswerChoiceAvatars";

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
    lastOpponentCorrect,
    questionReplaced,
    opponentTurn,
    opponentAnswered,
    opponentCommits,
    playerPowerUps,
    hiddenAnswers,
    replacedAnswer,
    playerTimerBonus,
    playerTimerFrozen,
    playerFreezeEndTime,
    answerQuestion,
    nextQuestion,
    usePowerUp,
    selectedCategoryId,
  } = useGame();
  
  // Database power-ups for persistent inventory
  const { powerUps: dbPowerUps, usePowerUp: consumeFromDB } = useUserPowerUps();

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [freezeTimeLeft, setFreezeTimeLeft] = useState(0);
  // Momentary "+10წ" pill over the time power button after using it.
  const [showTimeDrainBadge, setShowTimeDrainBadge] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Detect true/false questions
  const isTrueFalseQuestion = useMemo(() => {
    if (!currentQuestion?.allAnswers) return false;
    if (currentQuestion.allAnswers.length !== 2) return false;
    
    const answers = currentQuestion.allAnswers.map(a => a.toLowerCase());
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
      // Check if timer is frozen and freeze hasn't expired
      if (playerTimerFrozen && playerFreezeEndTime) {
        const remaining = Math.max(0, Math.ceil((playerFreezeEndTime - Date.now()) / 1000));
        if (remaining > 0) {
          setFreezeTimeLeft(remaining);
          return; // Don't decrement timer while frozen
        }
        // Freeze expired - fall through to resume normal timer
        setFreezeTimeLeft(0);
      }

      setFreezeTimeLeft(0);
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Schedule outside state update to avoid setState-during-render warning
          setTimeout(() => handleAnswer(null), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, answerRevealed, currentQuestion, currentQuestionIndex, playerTimerFrozen, playerFreezeEndTime]);

  // Watch the opponent's clock. When it reaches the second they were always
  // going to answer on, they lock in - visibly, while the question is still
  // live. Their choice stays hidden until the reveal; showing it here would
  // be a 70%-accurate hint.
  useEffect(() => {
    if (!opponent || answerRevealed || opponentAnswered || !opponentTurn) return;
    if (timeRemaining <= opponentTurn.atRemaining) opponentCommits();
  }, [opponent, answerRevealed, opponentAnswered, opponentTurn, timeRemaining, opponentCommits]);

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

      if (type === "hint") {
        setShowTimeDrainBadge(true);
        setTimeout(() => setShowTimeDrainBadge(false), 1500);
      }
    },
    [dbPowerUps, consumeFromDB, usePowerUp]
  );

  // Status pills above their own power buttons (see QuizPowerUpBar.badges) —
  // never at the top of the screen, where they covered the question header.
  const powerBarBadges = useMemo(() => {
    const badges: Partial<Record<UIPowerUpType, string>> = {};
    if (playerTimerFrozen && freezeTimeLeft > 0) {
      badges.freeze = `${t("extra.timerFrozen")} · ${t("extra.secondsShort", { time: freezeTimeLeft })}`;
    }
    if (showTimeDrainBadge) {
      badges.hint = `+${t("extra.secondsShort", { time: 10 })}`;
    }
    return badges;
  }, [playerTimerFrozen, freezeTimeLeft, showTimeDrainBadge, t]);

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
    if (!answerRevealed) return opponentAnswered ? "active" : "default";
    const isOpponentCorrect = lastOpponentAnswer === currentQuestion?.correctAnswer;
    return isOpponentCorrect ? "correct" : "wrong";
  }, [answerRevealed, opponentAnswered, lastOpponentAnswer, currentQuestion]);

  // The opponent's face, to be drawn on whichever answer they picked. Seeing
  // that they were wrong says nothing about what they went for instead, and
  // that is the part worth watching. Empty until the reveal, so it can never
  // work as a hint.
  const opponentChoosersFor = useCallback(
    (answer: string): AnswerChooser[] => {
      // A question reached via "replace" is one the player swapped into —
      // the opponent is still on the question that was skipped, so showing
      // their pick here would be answering a different question.
      if (questionReplaced) return [];
      if (!opponent || !answerRevealed || lastOpponentAnswer !== answer) return [];
      return [{
        id: "opponent",
        nickname: opponent.name,
        avatarUrl: opponent.avatarUrl,
        isCorrect: lastOpponentCorrect,
      }];
    },
    [opponent, answerRevealed, lastOpponentAnswer, lastOpponentCorrect, questionReplaced]
  );

  if (!currentQuestion) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#7E7ADB]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#7E7ADB] overflow-hidden">
      {/* Content wrapper with max-width for desktop/tablet, centered */}
      <div className="w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto">

      {/* Header - Different layout for solo vs challenge mode */}
      <div className="flex items-center justify-between px-4 pt-3 py-1 mb-2 [@media(max-height:700px)]:py-0.5 [@media(max-height:700px)]:mb-1 [@media(max-height:600px)]:pt-1 [@media(max-height:600px)]:py-0 [@media(max-height:600px)]:mb-0.5 flex-shrink-0">
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
        <div className="flex items-center justify-between px-6 mt-1 mb-3 [@media(max-height:700px)]:mb-2 [@media(max-height:600px)]:mb-1 [@media(max-height:600px)]:mt-0 flex-shrink-0 z-10">
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
          <div className="relative">
            <QuizPlayerAvatar
              avatarUrl={opponent.avatarUrl}
              score={opponentScore}
              position="right"
              state={getOpponentState()}
              size="default"
            />
            {/* They just locked in and you have not - the whole point of
                giving them a clock is that you can feel this happen. */}
            <AnimatePresence>
              {opponentAnswered && !answerRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  className="absolute -top-2 right-0 whitespace-nowrap rounded-full bg-[#83F7DA] px-2 py-0.5 text-[10px] font-bold text-[#1E6A58] shadow-md"
                >
                  {t("game.answered")}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Question Card with Overlapping Icon */}
      <div className="px-4 flex-shrink-0 -mt-1 mb-0 [@media(max-height:700px)]:-mt-2 [@media(max-height:700px)]:mb-0 [@media(max-height:600px)]:-mt-3 relative">
        {/* Category Icon - overlaps card by 50% (hide if media question) */}
        {!currentQuestion.imageUrl && !currentQuestion.videoUrl && !currentQuestion.audioUrl && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-[33px] z-20">
            <DynamicIcon 
              slug={currentQuestion.questionIconSlug || aiData?.slugs?.[0] || currentQuestion.categoryIconSlug}
              // For mixed category: don't use category fallback - only show icon if question has explicit icon
              // For regular category: use category fallback only if we have an explicit icon slug
              categoryId={
                selectedCategoryId === "__mixed__" 
                  ? undefined // Never use category fallback for mixed mode
                  : (currentQuestion.questionIconSlug || aiData?.slugs?.[0]) ? currentQuestion.categoryId : undefined
              }
              questionId={currentQuestion.id}
              size={opponent ? 80 : 64}
              className="drop-shadow-lg"
              hideIfEmpty={true}
            />
          </div>
        )}

        {(() => {
          const hasMedia = currentQuestion.imageUrl || currentQuestion.videoUrl || currentQuestion.audioUrl;
          return (
            <QuizQuestionCard
              questionText={currentQuestion.question}
              imageUrl={currentQuestion.imageUrl}
              imageInset={currentQuestion.categorySlug === "guess_logo"}
              videoUrl={currentQuestion.videoUrl}
              audioUrl={currentQuestion.audioUrl}
              progressPercent={(timeRemaining / (timePerQuestion + playerTimerBonus)) * 100}
              state={playerTimerFrozen && freezeTimeLeft > 0 ? "frozen" : "default"}
              difficultyLabel={!opponent && !hasMedia ? getDifficultyLabel(currentQuestion.difficulty) : undefined}
              difficultyColor={!opponent && !hasMedia ? DIFFICULTY_COLORS[currentQuestion.difficulty] || DIFFICULTY_COLORS.medium : undefined}
              timerSeconds={!opponent ? timeRemaining : undefined}
              timerMaxSeconds={timePerQuestion + playerTimerBonus}
              freezeTimeLeft={!opponent ? freezeTimeLeft : undefined}
              reserveTopSpace={!hasMedia}
              hideQuestionText={!!currentQuestion.imageUrl}
            />
          );
        })()}
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center py-2 [@media(max-height:700px)]:py-1.5 [@media(max-height:600px)]:py-1 flex-shrink-0">
        <QuizProgressDots
          total={questions.length}
          current={currentQuestionIndex}
          results={progressResults}
        />
      </div>

      {/* Answer Buttons */}
      {isTrueFalseQuestion ? (
        <div className="flex-1 min-h-0 w-full px-4 mt-0 flex gap-3 [@media(max-height:600px)]:gap-2 pb-2 items-center">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isTrue = answer.toLowerCase() === "მართალია" || answer.toLowerCase() === "true";
            if (hiddenAnswers.includes(answer)) return null;

            return (
              <div
                key={`${currentQuestionIndex}-${index}`}
                className="flex-1 relative"
              >
                <QuizTrueFalseButton
                  variant={isTrue ? "true" : "false"}
                  state={getAnswerState(answer) as QuizTrueFalseState}
                  onClick={() => handleAnswer(answer)}
                  disabled={answerRevealed}
                />
                <AnswerChoiceAvatars choosers={opponentChoosersFor(answer)} placement="corner" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 px-4 mt-0 flex flex-col gap-3 [@media(max-height:700px)]:gap-2 [@media(max-height:600px)]:gap-1.5 overflow-y-auto min-h-0 pb-2">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isHidden = hiddenAnswers.includes(answer);
            if (isHidden) return null;

            return (
              <div
                key={`${currentQuestionIndex}-${index}`}
                className="flex-shrink-0 w-full relative"
              >
                <QuizAnswerButton
                  label={ANSWER_LABELS[index]}
                  text={answer}
                  state={getAnswerState(answer)}
                  onClick={() => handleAnswer(answer)}
                  disabled={answerRevealed}
                  showLabel={true}
                />
                <AnswerChoiceAvatars choosers={opponentChoosersFor(answer)} />
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Area - Power-ups OR Next Button */}
      <div className="px-4 pb-2 [@media(max-height:700px)]:pb-1 [@media(max-height:600px)]:pb-0.5 flex-shrink-0">
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
                  badges={powerBarBadges}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Screen-wide freeze effect */}
      <PowerUpScreenEffect type="freeze" isActive={playerTimerFrozen && freezeTimeLeft > 0} />
      </div>
    </div>
  );
}
