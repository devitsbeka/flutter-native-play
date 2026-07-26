import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { ArrowLeft, ChevronUp, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizTrueFalseButton, QuizTrueFalseState } from "@/components/ui/quiz-true-false-button";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { MultiplayerObserverScreen } from "./MultiplayerObserverScreen";

export function MultiplayerGameScreenV2() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { playSound, vibrate, startBackgroundMusic, stopBackgroundMusic } = useSound();
  
  // Answer labels from translations
  const ANSWER_LABELS = useMemo(() => [
    t("game.labelA"),
    t("game.labelB"),
    t("game.labelC"),
    t("game.labelD"),
  ], [t]);
  const {
    questions,
    currentQuestionIndex,
    submitAnswer,
    nextQuestion,
    timePerQuestion,
    myScore,
    lastQuestionResult,
    currentOpponentAnswers,
    participants,
    exitRoom,
    currentRoom,
    hostIsObserver,
    isHost,
    applyMissedTime,
  } = useMultiplayerV2();

  // Start background music when game starts
  useEffect(() => {
    startBackgroundMusic();
    return () => stopBackgroundMusic();
  }, [startBackgroundMusic, stopBackgroundMusic]);

  // Preload every image of the round up front so image questions render
  // instantly when reached instead of downloading on-screen (a slow or dead
  // image otherwise leaves the player staring at an empty card)
  useEffect(() => {
    questions.forEach(q => {
      if (q.imageUrl) {
        const img = new Image();
        img.src = q.imageUrl;
      }
    });
  }, [questions]);

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Locked/backgrounded phone: the match keeps moving without the player.
  // JS timers freeze while the app is hidden, so on return we settle the
  // debt: every full question-length away skips one question (recorded as
  // unanswered); a shorter absence is deducted from the current timer.
  const hiddenAtRef = useRef<number | null>(null);
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      if (document.visibilityState !== "visible" || hiddenAtRef.current === null) return;

      const awaySeconds = (Date.now() - hiddenAtRef.current) / 1000;
      hiddenAtRef.current = null;
      if (isHost && hostIsObserver) return; // Observers don't answer

      if (awaySeconds >= timePerQuestion) {
        void applyMissedTime(awaySeconds).then(({ skipped, finished }) => {
          if (skipped > 0) {
            toast.info(
              finished
                ? `${skipped} კითხვა გამოტოვე — რაუნდი დასრულდა`
                : `${skipped} კითხვა გამოტოვე`,
              { duration: 4000 }
            );
          }
        });
      } else if (awaySeconds > 1 && !answerRevealed && selectedAnswer === null) {
        // Short absence: the missed seconds come off the current question's
        // clock (hitting zero auto-submits an empty answer via the timer)
        setTimeRemaining(prev => Math.max(0, prev - awaySeconds));
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [applyMissedTime, timePerQuestion, answerRevealed, selectedAnswer, isHost, hostIsObserver]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  
  // Get all other players (opponents)
  const opponents = participants.filter(p => p.user_id !== user?.id);
  
  // Sort participants by score for leaderboard
  const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Build progress results for dots
  const progressResults = useMemo(() => {
    const results: ("correct" | "wrong" | null)[] = [];
    for (let i = 0; i < questions.length; i++) {
      results.push(null);
    }
    return results;
  }, [questions.length]);

  // Reset on question change
  useEffect(() => {
    setAnswerRevealed(false);
    setSelectedAnswer(null);
    setTimeRemaining(timePerQuestion);
  }, [currentQuestionIndex, timePerQuestion]);

  // Handle answer result
  useEffect(() => {
    if (lastQuestionResult) {
      setAnswerRevealed(true);
      if (lastQuestionResult.correct) {
        playSound("correct-answer");
        vibrate(50);
      } else {
        playSound("wrong-answer");
        vibrate([50, 50, 50]);
      }
    }
  }, [lastQuestionResult, playSound, vibrate]);

  const handleAnswer = useCallback((answer: string) => {
    // selectedAnswer guard: the timer can still fire handleAnswer("") after a
    // tap, which would insert a duplicate player_answers row
    if (answerRevealed || selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    // Play tap sound for True/False selection
    playSound("button-click");
    vibrate(30);
    submitAnswer(answer, timeRemaining);
  }, [answerRevealed, selectedAnswer, submitAnswer, timeRemaining, playSound, vibrate]);

  const handleNext = useCallback(() => {
    nextQuestion();
  }, [nextQuestion]);

  const handleExit = () => {
    exitRoom();
    navigate("/team");
  };

  // Timer - skip for observers (they don't need to submit answers) and stop
  // once an answer is in-flight (selectedAnswer set, reveal pending)
  useEffect(() => {
    if (answerRevealed || selectedAnswer !== null || (isHost && hostIsObserver)) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          handleAnswer("");
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [answerRevealed, selectedAnswer, handleAnswer, isHost, hostIsObserver]);

  // Get answer button state
  const getAnswerState = useCallback(
    (answer: string): QuizAnswerState | QuizTrueFalseState => {
      if (!answerRevealed) {
        return "default";
      }

      const isCorrect = answer === currentQuestion?.correctAnswer;
      const isSelected = answer === selectedAnswer;

      if (isCorrect) return "correct";
      if (isSelected && !isCorrect) return "wrong";
      return "default";
    },
    [answerRevealed, currentQuestion, selectedAnswer]
  );
  
  // Check if this is a True/False question
  const isTrueFalseQuestion = useMemo(() => {
    if (!currentQuestion?.allAnswers) return false;
    if (currentQuestion.allAnswers.length !== 2) return false;
    
    const answers = currentQuestion.allAnswers.map(a => a.toLowerCase());
    return (
      (answers.includes("მართალია") && answers.includes("მცდარია")) ||
      (answers.includes("true") && answers.includes("false"))
    );
  }, [currentQuestion?.allAnswers]);


  // Show loading while questions are being fetched
  if (!currentQuestion) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-[#7E7BDC]">
        <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full mb-4" />
        <p className="text-white/80 text-lg">{t("game.gameLoading")}</p>
      </div>
    );
  }

  // Show observer screen for host when they're in observer mode
  if (isHost && hostIsObserver) {
    return (
      <MultiplayerObserverScreen 
        timeRemaining={timeRemaining} 
        onExit={handleExit}
      />
    );
  }

  const progressPercent = (timeRemaining / timePerQuestion) * 100;

  // Count how many opponents have answered the current question
  const answeredCount = Object.keys(currentOpponentAnswers).length;

  return (
    <div className="w-full h-[100dvh] bg-[#7E7BDC] overflow-hidden">
      <div className="w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto">
      {/* Safe area padding for notched phones */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={handleExit}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        {/* Question counter */}
        <div className="flex items-center gap-1 bg-white/10 px-4 py-2 rounded-full">
          <span className="text-white font-bold text-lg">{currentQuestionIndex + 1}</span>
          <span className="text-white/60 font-medium">/</span>
          <span className="text-white/60 font-bold text-lg">{questions.length}</span>
        </div>

        {/* Leaderboard toggle */}
        <motion.button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex -space-x-2">
            {opponents.slice(0, 3).map((opp, i) => (
              <Avatar key={opp.id} className="w-6 h-6 border border-white/30" style={{ zIndex: 3 - i }}>
                <ResolvedAvatarImage src={opp.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-500 text-white text-[10px]">
                  {opp.nickname?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {opponents.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] text-white border border-white/30">
                +{opponents.length - 3}
              </div>
            )}
          </div>
          {showLeaderboard ? (
            <ChevronUp className="w-4 h-4 text-white/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/60" />
          )}
        </motion.button>
      </div>

      {/* Leaderboard dropdown */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-2 space-y-1.5">
              {sortedParticipants.map((p, index) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg",
                    p.user_id === user?.id ? "bg-white/10" : ""
                  )}
                >
                  <span className="w-5 text-center text-white/60 text-sm font-bold">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </span>
                  <Avatar className="w-6 h-6">
                    <ResolvedAvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="bg-purple-500 text-white text-[10px]">
                      {p.nickname?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-white text-sm truncate">
                    {p.user_id === user?.id ? t("game.you") : p.nickname}
                  </span>
                  <span className="text-white font-bold text-sm">{Math.round(p.score || 0)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answered indicator - fixed height container to prevent layout shift */}
      <div className="px-4 h-8 flex items-center justify-center">
        <motion.div
          initial={false}
          animate={{ 
            opacity: answeredCount > 0 && !answerRevealed ? 1 : 0,
            scale: answeredCount > 0 && !answerRevealed ? 1 : 0.9
          }}
          transition={{ duration: 0.15 }}
          className="py-1.5 px-3 rounded-full bg-white/10"
        >
          <span className="text-white/80 text-xs">
            {answeredCount}/{opponents.length} {t("game.answered")}
          </span>
        </motion.div>
      </div>

      {/* Question Card */}
      <div className={cn(
        "px-4 flex-shrink-0 relative",
        // Only add top margin for icon when no media present
        !currentQuestion.imageUrl && !currentQuestion.videoUrl && !currentQuestion.audioUrl && "mt-12 [@media(max-height:700px)]:mt-8 [@media(max-height:600px)]:mt-6"
      )}>
        {/* Category Icon - only show when no media is present AND icon_slug exists */}
        {!currentQuestion.imageUrl && !currentQuestion.videoUrl && !currentQuestion.audioUrl && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-[41px] z-20 w-28 h-28">
            <DynamicIcon 
              slug={currentQuestion?.iconSlug || undefined}
              // Only use categoryId for fallback if we have an explicit iconSlug
              categoryId={currentQuestion?.iconSlug ? currentRoom?.category_id : undefined}
              questionId={currentQuestion?.id}
              // Use question text as seed to ensure same icon across all players
              seedText={currentQuestion?.question}
              size={112}
              className="drop-shadow-lg"
              hideIfEmpty={true}
            />
          </div>
        )}
        
        <QuizQuestionCard
          questionText={currentQuestion.question}
          imageUrl={currentQuestion.imageUrl}
          videoUrl={currentQuestion.videoUrl}
          audioUrl={currentQuestion.audioUrl}
          progressPercent={progressPercent}
          state="default"
          timerSeconds={Math.ceil(timeRemaining)}
          timerMaxSeconds={timePerQuestion}
          reserveTopSpace={!currentQuestion.imageUrl && !currentQuestion.videoUrl && !currentQuestion.audioUrl}
          hideQuestionText={!!currentQuestion.imageUrl}
        />
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center my-2 [@media(max-height:700px)]:my-1.5 flex-shrink-0">
        <QuizProgressDots
          total={questions.length}
          current={currentQuestionIndex}
          results={progressResults}
        />
      </div>

      {/* Answer Buttons */}
      {isTrueFalseQuestion ? (
        /* True/False Layout - side by side cards */
        <div className="px-4 flex gap-2 justify-center mt-3 flex-shrink-0">
          <AnimatePresence mode="wait">
            {currentQuestion.allAnswers.map((answer, index) => {
              const isTrue = answer.toLowerCase() === "მართალია" || answer.toLowerCase() === "true";
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
        /* Regular 4-answer layout */
        <div className="flex-1 px-4 flex flex-col gap-3 [@media(max-height:700px)]:gap-2 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {currentQuestion.allAnswers.map((answer, index) => {
              // Find opponents who chose this answer (only show when revealed)
              const opponentsWhoChoseThis = answerRevealed
                ? Object.entries(currentOpponentAnswers)
                    .filter(([_, ans]) => ans.answer === answer)
                    .map(([userId]) => participants.find(p => p.user_id === userId))
                    .filter(Boolean)
                : [];

              return (
                <motion.div
                  key={`${currentQuestionIndex}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex-shrink-0 relative w-full"
                >
                  <QuizAnswerButton
                    label={ANSWER_LABELS[index]}
                    text={answer}
                    state={getAnswerState(answer) as QuizAnswerState}
                    onClick={() => handleAnswer(answer)}
                    disabled={answerRevealed}
                    showLabel={true}
                  />
                  
                  {/* Opponent avatars overlay */}
                  {opponentsWhoChoseThis.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex -space-x-1.5">
                      {opponentsWhoChoseThis.slice(0, 4).map((opp, i) => (
                        <Avatar 
                          key={opp?.id || i} 
                          className={cn(
                            "w-7 h-7 border-2",
                            currentOpponentAnswers[opp?.user_id || ""]?.is_correct ? "border-green-500" : "border-red-500"
                          )}
                        >
                          <ResolvedAvatarImage src={opp?.avatar_url || undefined} />
                          <AvatarFallback className="bg-purple-500 text-white text-[10px]">
                            {opp?.nickname?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {opponentsWhoChoseThis.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center text-[10px] text-slate-600 border-2 border-slate-300">
                          +{opponentsWhoChoseThis.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom Area - Next Button */}
      <div className="px-4 pb-4 pt-4 mt-auto flex-shrink-0">
        <div className="pb-[env(safe-area-inset-bottom)]">
          <AnimatePresence mode="wait">
            {answerRevealed && (
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
                  {isLastQuestion ? t("game.viewResults") : t("game.nextQuestion")}
                </ChunkyButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </div>
  );
}
