import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";

import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizTrueFalseButton, QuizTrueFalseState } from "@/components/ui/quiz-true-false-button";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { MultiplayerObserverScreen } from "./MultiplayerObserverScreen";
import { questionImageSrc } from "@/utils/questionImage";
import { AnswerChoiceAvatars, type AnswerChooser } from "@/components/game/AnswerChoiceAvatars";
import { LiveRaceStrip } from "@/components/game/LiveRaceStrip";

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
        // Same rewritten URL the card will render, so this warms the right
        // cache (our edge) instead of burning a Wikimedia request per player.
        img.src = questionImageSrc(q.imageUrl)!;
      }
    });
  }, [questions]);

  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);

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
                ? t("extra.questionsSkippedRoundOver", { count: skipped })
                : t("extra.questionsSkipped", { count: skipped }),
              { duration: 4000 }
            );
          }
        });
      }
      // A short absence needs no correction any more. The clock is measured
      // from questionStartedAt, so time spent with the tab hidden is already
      // gone when it comes back; subtracting it again here would charge the
      // player twice for the same seconds.
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [applyMissedTime, timePerQuestion, answerRevealed, selectedAnswer, isHost, hostIsObserver]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  
  // Get all other players (opponents)
  const opponents = participants.filter(p => p.user_id !== user?.id);
  

  // Build progress results for dots
  const progressResults = useMemo(() => {
    const results: ("correct" | "wrong" | null)[] = [];
    for (let i = 0; i < questions.length; i++) {
      results.push(null);
    }
    return results;
  }, [questions.length]);

  /**
   * When the question opened on this device.
   *
   * The clock used to be counted in ticks — one setInterval every 100ms
   * subtracting a flat 0.1 — and setInterval is not a clock. Browsers fire it
   * late under load and throttle it hard on phones, and every late tick still
   * took only 0.1 off. A device whose ticks slipped therefore kept a HIGHER
   * timeRemaining for the same real-world speed, and points are
   * 100 + round(timeRemaining) x 10, so each second of drift was ten points
   * to whoever had the slower phone. That is backwards: the player who
   * answers sooner is supposed to score more.
   *
   * Real elapsed time is read from this instead, so the clock measures the
   * same seconds on every device.
   */
  const questionStartedAt = useRef<number>(Date.now());

  // Reset on question change
  useEffect(() => {
    setAnswerRevealed(false);
    setSelectedAnswer(null);
    questionStartedAt.current = Date.now();
    setTimeRemaining(timePerQuestion);
  }, [currentQuestionIndex, timePerQuestion]);

  // A result may only reveal the question it is the result of.
  //
  // This effect shipped without the index check and immediately started
  // revealing the *next* question: submitAnswer sets lastQuestionResult only
  // after four network round trips, and since the reveal became instant the
  // player can be on the following question by the time it lands. Then this
  // ran, set answerRevealed on a question nobody had answered, and the correct
  // option sat there green before it had been read.
  //
  // It could not happen before the reveal was made instant — the reveal *was*
  // this effect, so advancing before the result arrived was impossible. My
  // change created the race; the stamp closes it.
  useEffect(() => {
    if (lastQuestionResult?.questionIndex === currentQuestionIndex) {
      setAnswerRevealed(true);
    }
  }, [lastQuestionResult, currentQuestionIndex]);

  const handleAnswer = useCallback((answer: string) => {
    // selectedAnswer guard: the timer can still fire handleAnswer("") after a
    // tap, which would insert a duplicate player_answers row
    if (answerRevealed || selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    // Play tap sound for True/False selection
    playSound("button-click");
    vibrate(30);

    // Reveal now, from what this device already knows.
    //
    // The colours used to wait for lastQuestionResult, which submitAnswer sets
    // only after four sequential round trips: the first-correct claim, the
    // player_answers insert, the score RPC and the participant update. On a
    // phone that is most of a second of a button that looks unpressed, and it
    // is worst on a correct answer, which is the one that runs all four.
    //
    // Nothing is being trusted here that was not already: correctAnswer is in
    // the question this device is holding, and getAnswerState has always
    // compared against it. The writes still decide the score — this only stops
    // the player waiting on them to find out what they already picked.
    setAnswerRevealed(true);
    if (answer === currentQuestion?.correctAnswer) {
      playSound("correct-answer");
      vibrate(50);
    } else {
      playSound("wrong-answer");
      vibrate([50, 50, 50]);
    }

    submitAnswer(answer, timeRemaining);
  }, [answerRevealed, selectedAnswer, submitAnswer, timeRemaining, playSound, vibrate, currentQuestion]);

  // One advance per question, however many times the button is tapped.
  //
  // handleNext used to call straight through. The button stays mounted through
  // its exit animation, so a quick double-tap applied the "index + 1" update
  // twice and skipped a question outright; on the last question it started a
  // second finish. Recording the index we advanced from is enough — it stays
  // true no matter how long nextQuestion's writes take.
  const advancedFromRef = useRef<number | null>(null);

  const handleNext = useCallback(() => {
    if (advancedFromRef.current === currentQuestionIndex) return;
    advancedFromRef.current = currentQuestionIndex;
    void nextQuestion();
  }, [nextQuestion, currentQuestionIndex]);

  const handleExit = () => {
    exitRoom();
    navigate("/team");
  };

  // Timer - skip for observers (they don't need to submit answers) and stop
  // once an answer is in-flight (selectedAnswer set, reveal pending)
  useEffect(() => {
    if (answerRevealed || selectedAnswer !== null || (isHost && hostIsObserver)) return;

    // Reads the clock; decides nothing. Running out of time is handled by the
    // effect below, off the state this one writes — an updater must be pure,
    // and this one used to call handleAnswer(""), which submits an answer and
    // reveals it. React may run an updater more than once, and that guard
    // reads a captured selectedAnswer, so a repeat could submit twice.
    const timer = setInterval(() => {
      const elapsed = (Date.now() - questionStartedAt.current) / 1000;
      setTimeRemaining(Math.max(0, timePerQuestion - elapsed));
    }, 100);

    return () => clearInterval(timer);
  }, [answerRevealed, selectedAnswer, isHost, hostIsObserver, timePerQuestion]);

  // Out of time. Reads live state, so it can only fire for the question on
  // screen: moving on resets the clock and this stops being true.
  useEffect(() => {
    if (answerRevealed || selectedAnswer !== null || (isHost && hostIsObserver)) return;
    if (timeRemaining > 0) return;
    handleAnswer("");
  }, [timeRemaining, answerRevealed, selectedAnswer, handleAnswer, isHost, hostIsObserver]);

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

  // Everyone who picked this answer, for the avatar badge on the answer row.
  // Empty until the local player has committed, so it never leaks the answer.
  const choosersFor = useCallback(
    (answer: string): AnswerChooser[] => {
      if (!answerRevealed) return [];
      const out: AnswerChooser[] = [];
      for (const [userId, submitted] of Object.entries(currentOpponentAnswers)) {
        if (submitted.answer !== answer) continue;
        const participant = participants.find(p => p.user_id === userId);
        if (!participant) continue;
        out.push({
          id: participant.id || userId,
          nickname: participant.nickname,
          avatarUrl: participant.avatar_url,
          isCorrect: submitted.is_correct,
        });
      }
      return out;
    },
    [answerRevealed, currentOpponentAnswers, participants]
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
      <div
        className="w-full h-[100dvh] flex flex-col items-center justify-center bg-[#7E7BDC]"
        style={{ marginTop: "calc(-1 * var(--safe-top))", paddingTop: "var(--safe-top)" }}
      >
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
    <div className="w-full h-[100dvh] bg-[#7E7BDC] overflow-hidden" style={{ marginTop: "calc(-1 * var(--safe-top))", paddingTop: "var(--safe-top)" }}>
      <div className="w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto">

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

        {/* The answered count, in the slot that balances the back button so
            the counter stays centred. It had a fixed-height row of its own
            below the standings, which cost 32px of the question's space for
            a pill that is blank most of the time. */}
        <div className="w-10 flex items-center justify-end">
          <motion.div
            initial={false}
            animate={{
              opacity: answeredCount > 0 && !answerRevealed ? 1 : 0,
              scale: answeredCount > 0 && !answerRevealed ? 1 : 0.9,
            }}
            transition={{ duration: 0.15 }}
            className="rounded-full bg-white/10 px-2 py-1"
          >
            <span className="text-[11px] font-semibold text-white/80">
              {answeredCount}/{opponents.length}
            </span>
          </motion.div>
        </div>
      </div>

      {/* The race, while it is still being run. */}
      <LiveRaceStrip
        players={participants}
        currentUserId={user?.id}
        className="flex-shrink-0 mb-1"
      />

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
          // The room's category, which is every question's category here.
          // Solo play already treated logos and flags specially; a room ran
          // the same picture banks through the default treatment.
          imageInset={currentRoom?.category_id === "guess_logo"}
          imageFramed={currentRoom?.category_id === "guess_flag"}
          imageReveal={currentRoom?.category_id === "guess_logo"}
          // Both players uncover the same tiles at the same moment -- the
          // mask seeds off the picture's URL, not off anything local.
          imageRevealAll={answerRevealed || selectedAnswer !== null}
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
                  className="flex-1 relative"
                >
                  <QuizTrueFalseButton
                    variant={isTrue ? "true" : "false"}
                    state={getAnswerState(answer) as QuizTrueFalseState}
                    onClick={() => handleAnswer(answer)}
                    disabled={answerRevealed}
                  />
                  <AnswerChoiceAvatars choosers={choosersFor(answer)} placement="corner" />
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

                  <AnswerChoiceAvatars choosers={choosersFor(answer)} />
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
