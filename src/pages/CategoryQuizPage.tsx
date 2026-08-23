import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, TrendingUp } from "lucide-react";
import { TimerBadge } from "@/components/game/TimerBadge";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { getCategoryById } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import newQuestionsPaper from "@/assets/new-questions-paper.png";
import { useCategoryPlayLimit } from "@/hooks/useCategoryPlayLimit";
import { useToast } from "@/hooks/use-toast";
import { showMissionCompleteToast } from "@/components/mission/MissionCompleteToast";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { RegisterPromptModal } from "@/components/home/RegisterPromptModal";
import { getGuestProgress } from "@/hooks/useGuestProgress";
import { useMissions } from "@/hooks/useMissions";
import { useCurrency } from "@/hooks/useCurrency";
import { REWARDS } from "@/config/rewardConfig";
import confetti from "canvas-confetti";
import { calculateLevel } from "@/utils/levelCalculation";
import { answerStateFor, type QuizAnswerRecord } from "@/utils/quizAnswerState";
import { getQuestions, QuestionResult } from "@/services/questionService";
import { ExhaustionIndicator } from "@/components/ui/exhaustion-indicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Import shared quiz UI components
import { QuizPlayerAvatar } from "@/components/ui/quiz-player-avatar";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizTrueFalseButton, type QuizTrueFalseState } from "@/components/ui/quiz-true-false-button";
import { QuizPowerUpBar } from "@/components/ui/quiz-power-up-bar";
import { PowerUpType as UIPowerUpType } from "@/components/ui/quiz-power-up-button";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { adService } from "@/services/adService";
import { PowerUpScreenEffect } from "@/components/game/ActivePowerUpIndicator";
import { preloadQuestionIcons } from "@/hooks/useAIIcon";
import { useAIIconSlug } from "@/hooks/useAIIconSlug";
import { useCategoryDisplayName } from "@/hooks/useCategoryDisplayName";
import { trackQuizStarted, trackQuizQuestionAnswered, trackQuizCompleted, trackQuizAbandoned, trackPowerUpUsed } from "@/lib/analytics";
import puzzleSphereIcon from "@/assets/icons/puzzle-sphere.png";


// Import reward icons
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

// Import workout icons for failed quiz results
import acroyogaIcon from "@/assets/workout/acroyoga.png";
import balanceBoardIcon from "@/assets/workout/balance-board.png";
import yogaWarriorIcon from "@/assets/workout/yoga-warrior-i-pose.png";
import workoutSquatIcon from "@/assets/workout/workout.png";
import plankIcon from "@/assets/workout/plank.png";
import flexibilityIcon from "@/assets/workout/flexibility.png";
import pullUpIcon from "@/assets/workout/calisthenics-pull-up.png";

// Import celebration icons for passed quiz results
import sparkleIcon from "@/assets/celebration/ai-sparkle.png";
import archeryIcon from "@/assets/celebration/archery.png";
import axeTargetIcon from "@/assets/celebration/axe-throwing-target.png";
import awardIcon from "@/assets/celebration/award.png";
import balloonArchIcon from "@/assets/celebration/balloon-arch.png";
import windSpinnerIcon from "@/assets/celebration/wind-spinner.png";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

const WORKOUT_ICONS = [
  acroyogaIcon,
  balanceBoardIcon,
  yogaWarriorIcon,
  workoutSquatIcon,
  plankIcon,
  flexibilityIcon,
  pullUpIcon,
];

const SUCCESS_ICONS = [
  sparkleIcon,
  archeryIcon,
  axeTargetIcon,
  awardIcon,
  balloonArchIcon,
  windSpinnerIcon,
];

// Perfect score icon from icon library (Starfish Wizard)
const PERFECT_SCORE_ICON = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/starfish-wizard.png";

// Display labels for the earn-power-up-via-ad dialog (mirrors quiz-power-up-button labels)
const POWER_UP_EARN_LABELS: Record<PowerUpType, string> = {
  "5050": "50/50",
  freeze: "Freeze",
  replace: "Replace",
  "time-drain": "Time+",
};



interface TriviaQuestion {
  id: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: "easy" | "medium" | "hard";
  allAnswers?: string[];
  icon_slug?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

// Which cube in the bar a power belongs to, and what it calls itself there.
// Kept beside the page rather than inside it: they are constants, and the
// badge builder below reads them on every render.
const POWER_UP_UI_KEY: Record<PowerUpType, UIPowerUpType> = {
  "5050": "5050",
  freeze: "freeze",
  replace: "replace",
  "time-drain": "hint",
};

const POWER_UP_SHORT_NAME: Record<PowerUpType, (t: (k: string) => string) => string> = {
  "5050": () => "50/50",
  freeze: (t) => t("extra.powerUpFreezeShort"),
  replace: (t) => t("extra.powerUpReplaceShort"),
  "time-drain": (t) => t("extra.powerUpTimeDrainLabel"),
};

export default function CategoryQuizPage() {
  const { categoryId, levelId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { updateLevelProgress } = useCategoryProgress();
  const { canPlayLevel, loading: limitLoading } = useCategoryPlayLimit();
  
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  /**
   * The answer given, and the question it was given to.
   *
   * These used to be two independent pieces of state — an `isAnswered`
   * boolean and a `selectedAnswer` string — which every path that moves to
   * another question had to remember to clear. resetQuiz, the Try again and
   * Replay buttons, forgot: it clears eighteen other things and not these
   * two, and because a replay keeps the same levelId, the effect that does
   * reset them never runs. So the first question of a replay opened already
   * answered, the previous question's choice still green, before the player
   * had read it.
   *
   * Storing the question index alongside the answer makes that unrepresentable
   * rather than merely fixed. An answer to question 3 is not an answer to
   * question 4, so moving on un-answers by construction, no reset needed and
   * none to forget — and a late write from a timer or a network call that
   * names an older question simply does not apply.
   */
  const [answerRecord, setAnswerRecord] = useState<QuizAnswerRecord | null>(null);

  // Derived, never stored: an answer counts only for the question it was
  // given to. This is what makes a stale record harmless.
  const { isAnswered, selectedAnswer } = answerStateFor(answerRecord, currentQuestionIndex);
  const [score, setScore] = useState(0);
  // Per-question outcome, indexed by question position — what the progress
  // dots render. The dots used to be derived from the score alone
  // ("first `score` dots green, rest red"), so a wrong answer on question 3
  // painted dot 1 red instead of dot 3.
  const [answerResults, setAnswerResults] = useState<("correct" | "wrong" | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outOfQuestions, setOutOfQuestions] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedStars, setSavedStars] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState<number | null>(null);
  const [newProfileLevel, setNewProfileLevel] = useState(0);
  const [previousProfileLevel, setPreviousProfileLevel] = useState(0);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [levelUpRewardsCredited, setLevelUpRewardsCredited] = useState(false);
  const [exhaustionInfo, setExhaustionInfo] = useState<QuestionResult['exhaustionInfo'] | null>(null);
  
  // Random workout icon for failed results (stable per mount)
  const [workoutIcon] = useState(() => 
    WORKOUT_ICONS[Math.floor(Math.random() * WORKOUT_ICONS.length)]
  );
  
  // Random celebration icon for passed results (stable per mount)
  const [successIcon] = useState(() => 
    SUCCESS_ICONS[Math.floor(Math.random() * SUCCESS_ICONS.length)]
  );
  
  // Currency hook for level-up rewards
  const { addCurrency } = useCurrency();
  
  // Mission tracking
  const { trackMissionEvent } = useMissions();
  const { toast: showToast } = useToast();
  
  // Power-up state
  const { powerUps, usePowerUp: consumePowerUp, addPowerUp } = useUserPowerUps();
  const [earnPowerUpType, setEarnPowerUpType] = useState<PowerUpType | null>(null);
  const [hiddenAnswers, setHiddenAnswers] = useState<string[]>([]);
  const [usedPowerUpsThisQuestion, setUsedPowerUpsThisQuestion] = useState<Set<PowerUpType>>(new Set());
  const [timerBonus, setTimerBonus] = useState(0);
  const [timerFrozen, setTimerFrozen] = useState(false);
  const [freezeEndTime, setFreezeEndTime] = useState<number | null>(null);
  const [freezeTimeRemaining, setFreezeTimeRemaining] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [activePowerUpEffect, setActivePowerUpEffect] = useState<PowerUpType | null>(null);
  const [activeScreenEffect, setActiveScreenEffect] = useState<PowerUpType | null>(null);
  // Momentary "+5წ" pill over the time power button after using it.
  const [showTimeDrainBadge, setShowTimeDrainBadge] = useState(false);
  
  const hasFetched = useRef(false);
  const hasSaved = useRef(false);
  const previousLevelId = useRef(levelId);
  // Bumped by resetQuiz so the fetch effect re-runs on a same-level replay.
  // Its deps are [categoryId, levelId], which a replay does not change —
  // resetQuiz cleared hasFetched and set loading, and then nothing fetched:
  // the endless "generating questions" spinner after the results screen.
  const [fetchNonce, setFetchNonce] = useState(0);

  // Reset state when levelId changes (navigating to next level)
  useEffect(() => {
    if (previousLevelId.current !== levelId) {
      previousLevelId.current = levelId;
      hasFetched.current = false;
      hasSaved.current = false;
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setAnswerRecord(null);
      setAnswerResults([]);
      setScore(0);
      setLoading(true);
      setError(null);
      setTimeRemaining(15);
      setShowResults(false);
      setIsSaving(false);
      setSavedStars(0);
      setPointsEarned(0);
      setUnlockedLevel(null);
      setQuestionIds([]);
      setNewProfileLevel(0);
      setPreviousProfileLevel(0);
      setLevelUpRewardsCredited(false);
      setHiddenAnswers([]);
      setUsedPowerUpsThisQuestion(new Set());
      setTimerBonus(0);
      setTimerFrozen(false);
      setFreezeEndTime(null);
    }
  }, [levelId]);

  // Category play limit guard — redirect if user exceeded limits (prevents URL bypass)
  useEffect(() => {
    if (limitLoading || !categoryId) return;
    const levelNumber = parseInt(levelId || "1");
    if (!canPlayLevel(categoryId, levelNumber)) {
      toast.error(t("extra.quizProUpgrade"));
      navigate(`/category/${categoryId}`, { replace: true });
    }
  }, [limitLoading, categoryId, levelId, canPlayLevel, navigate]);

  // Store database category with icon_slug
  const [dbCategory, setDbCategory] = useState<{ id: string; name: string; icon_slug: string | null; total_levels: number } | null>(null);
  const category = getCategoryById(categoryId || "");
  

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch questions using unified questionService
  useEffect(() => {
    if (hasFetched.current) return;
    // Only require categoryId - category may be undefined for DB-only categories like image_trivia
    if (!categoryId) return;

    hasFetched.current = true;
    setLoading(true);
    setError(null);
    setOutOfQuestions(false);

    const fetchQuestionsFromService = async () => {
      try {
        const levelNumber = parseInt(levelId || "1");
        
        // Reuse cached dbCategory if available (same category, different level)
        // Only fetch from DB on first load
        let categoryData = dbCategory;
        if (!categoryData) {
          const { data } = await supabase
            .from('categories')
            .select('id, name, icon_slug, total_levels')
            .eq('category_id', categoryId)
            .maybeSingle();
          
          if (data) {
            categoryData = data;
            setDbCategory(data);
          }
        }
        
        // Use unified questionService - pass pre-resolved category data to skip redundant DB lookups
        const result = await getQuestions({
          mode: 'category',
          categorySlug: categoryId,
          categoryUuid: categoryData?.id,
          categoryName: categoryData?.name,
          levelNumber,
          // Picture-guess levels are authored ten-to-a-level; classic
          // categories keep the shorter five-question session.
          count: (POPULAR_IMAGE_CATEGORY_IDS as readonly string[]).includes(categoryId || "") ? 10 : 5,
          excludeIds: questionIds,
        });
        
        if (result.questions.length === 0) {
          // The category has nothing left to ask. That is the player's
          // achievement, not a failure — celebrate it instead of showing
          // the generic something-went-wrong screen.
          setOutOfQuestions(true);
          setLoading(false);
          return;
        }
        
        // Store exhaustion info for UI display
        if (result.exhaustionInfo) {
          setExhaustionInfo(result.exhaustionInfo);
        }
        
        // Map to local format
        const mapped = result.questions.map(q => ({
          id: q.id,
          question: q.question,
          correct_answer: q.correctAnswer,
          incorrect_answers: q.incorrectAnswers,
          difficulty: q.difficulty,
          allAnswers: q.allAnswers,
          icon_slug: q.iconSlug,
          image_url: q.imageUrl,
          video_url: q.videoUrl,
          audio_url: q.audioUrl,
        }));
        
        setQuestionIds(mapped.map(q => q.id));
        setQuestions(mapped);

        trackQuizStarted(categoryId!, parseInt(levelId || "1"), mapped.length);

        // Trigger background AI icon analysis
        preloadQuestionIcons(
          mapped.map(q => ({
            question: q.question,
            category: categoryData?.name || categoryId
          }))
        );
      } catch (err) {
        console.error("Unexpected error:", err);
        setError(t("extra.quizUnexpectedError"));
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionsFromService();
  }, [categoryId, levelId, fetchNonce]);

  // Timer - pauses when frozen
  useEffect(() => {
    if (loading || isAnswered || showResults || questions.length === 0) return;

    const timer = setInterval(() => {
      // Check if timer is frozen
      if (timerFrozen && freezeEndTime) {
        const remaining = Math.max(0, Math.ceil((freezeEndTime - Date.now()) / 1000));
        setFreezeTimeRemaining(remaining);
        if (remaining <= 0) {
          // Freeze expired
          setTimerFrozen(false);
          setFreezeEndTime(null);
          setFreezeTimeRemaining(0);
          setActiveScreenEffect(null);
        }
        return; // Don't decrement while frozen
      }
      
      // Counts down and nothing else. Running out of time is handled by the
      // effect below, off the clock that observed it.
      //
      // handleTimeUp() used to be called from inside this updater, which is
      // how a brand-new question could open with its answer already revealed:
      // an updater is not allowed to have side effects — React may run it more
      // than once, and the setIsAnswered(true) it queued could land after the
      // player had already moved on, marking the NEXT question answered by
      // nobody. The tell was the clock: a genuine timeout shows 0, and those
      // questions were showing whatever the new question had counted down to.
      setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isAnswered, showResults, currentQuestionIndex, questions.length, timerFrozen, freezeEndTime]);

  // Save results when quiz ends
  useEffect(() => {
    if (showResults && !hasSaved.current && questions.length > 0) {
      hasSaved.current = true;
      saveResults();
    }
  }, [showResults]);

  const saveResults = async () => {
    if (!categoryId || !levelId) return;

    setIsSaving(true);
    const levelNumber = parseInt(levelId);
    // Store previous profile level to detect level-ups
    const previousLevel = profile?.total_points ? calculateLevel(profile.total_points).level : 1;
    setPreviousProfileLevel(previousLevel);
    
    const result = await updateLevelProgress(categoryId, levelNumber, score, questions.length, dbCategory?.total_levels || 20);
    
    if (result.success) {
      setSavedStars(result.stars);
      const earned = score * 10 + result.stars * 20;
      setPointsEarned(earned);

      trackQuizCompleted({
        categoryId: categoryId!,
        levelNumber: parseInt(levelId || "1"),
        score,
        totalQuestions: questions.length,
        stars: result.stars,
        pointsEarned: earned,
        unlockedNextLevel: !!result.unlockedLevel,
      });

      // Store unlock info for animation on category page
      if (result.unlockedLevel) {
        setUnlockedLevel(result.unlockedLevel);
        sessionStorage.setItem(
          `level_unlocked_${categoryId}`,
          JSON.stringify({
            unlockedLevel: result.unlockedLevel,
            timestamp: Date.now(),
          })
        );
      }
      
      // Check for profile level-up (XP-based overall level)
      // Simplified: 150 coins + 1 random power-up
      if (user && profile) {
        const newTotalPoints = (profile.total_points || 0) + earned;
        const newLevel = calculateLevel(newTotalPoints).level;
        if (newLevel > previousLevel) {
          setNewProfileLevel(newLevel);
          
          // Credit simplified level-up rewards
          const levelUpCoins = REWARDS.LEVEL_UP_COINS;
          const powerUpTypes = REWARDS.LEVEL_UP_POWER_UP_TYPES;
          const randomPowerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
          
          // Add coins — await and retry once so a transient network blip at
          // the level-up moment doesn't silently swallow the reward the
          // celebration screen is about to show
          const coinsCredited = await addCurrency(levelUpCoins, 0, "level_up", `level ${newLevel}`);
          if (!coinsCredited) {
            await addCurrency(levelUpCoins, 0, "level_up", `level ${newLevel}`);
          }
          
          // Credit the random power-up to database
          const { data: existingPowerUp } = await supabase
            .from("user_power_ups")
            .select("quantity")
            .eq("user_id", user.id)
            .eq("power_up_type", randomPowerUp)
            .maybeSingle();
          
          await supabase.from("user_power_ups").upsert({
            user_id: user.id,
            power_up_type: randomPowerUp,
            quantity: (existingPowerUp?.quantity || 0) + 1,
          });
          
          setLevelUpRewardsCredited(true);
        }
      }
      
      // Big confetti burst for passing (unlocks next level)
      if (result.stars >= 1) {
        // Extra confetti for perfect score
        const particleCount = score === questions.length ? 200 : 150;
        
        // First burst
        confetti({
          particleCount,
          spread: 100,
          origin: { y: 0.5, x: 0.5 },
        });
        
        // Second delayed burst for extra celebration
        setTimeout(() => {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6, x: 0.3 },
          });
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6, x: 0.7 },
          });
        }, 250);
        
        // Extra burst for perfect score
        if (score === questions.length) {
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 120,
              origin: { y: 0.4, x: 0.5 },
              colors: ['#FFD700', '#FFA500', '#FF6347'],
            });
          }, 500);
        }
        
        toast.success(
          score === questions.length ? t("discover.perfectScore") : t("discover.levelCompleted"), 
          { description: t("discover.pointsEarnedToast", { points: earned }) }
        );
      } else {
        toast.info(t("discover.tryAgainForNextLevel"));
      }
      
      // Show registration prompt for guests after completing a few levels
      if (!user && result.stars >= 1) {
        const guestProgress = getGuestProgress();
        const totalLevels = Object.values(guestProgress).reduce(
          (sum, cat) => sum + cat.completedLevels.length,
          0
        );
        
        // Show prompt after 2, 5, and 10 levels
        const promptThresholds = [2, 5, 10];
        const lastPromptShown = parseInt(localStorage.getItem("last_register_prompt") || "0");
        
        for (const threshold of promptThresholds) {
          if (totalLevels >= threshold && lastPromptShown < threshold) {
            localStorage.setItem("last_register_prompt", threshold.toString());
            // Delay to let confetti play first
            setTimeout(() => setShowRegisterPrompt(true), 1500);
            break;
          }
        }
      }
      
      // Update mission progress for correct answers and category played
      if (user) {
        // Helper to show toast if mission completed
        const handleMissionResult = (result: { 
          completed: boolean; 
          missionTitle?: string;
          rewardCoins?: number;
          rewardGems?: number;
          rewardXp?: number;
          rewardPowerUp?: string | null;
          rewardPowerUpCount?: number;
        }) => {
          if (result.completed && result.missionTitle) {
            setTimeout(() => {
              showMissionCompleteToast(showToast, {
                title: result.missionTitle!,
                coins: result.rewardCoins || 0,
                gems: result.rewardGems || 0,
                xp: result.rewardXp || 0,
                powerUp: result.rewardPowerUp,
                powerUpCount: result.rewardPowerUpCount,
              });
            }, 1500);
          }
        };

        // Events advance both the daily and weekly mission variants
        (await trackMissionEvent("game_played", 1)).forEach(handleMissionResult);

        if (score > 0) {
          (await trackMissionEvent("correct_answers", score)).forEach(handleMissionResult);
        }

        // The slug rides along so a mission that names one category (cinema,
        // music, ...) can tell this game apart from any other.
        (await trackMissionEvent("categories_played", 1, categoryId)).forEach(handleMissionResult);

        if (result.stars >= 1) {
          (await trackMissionEvent("game_won", 1)).forEach(handleMissionResult);

          // Perfect run: every question in the level answered correctly
          if (questions.length > 0 && score === questions.length) {
            (await trackMissionEvent("perfect_win", 1)).forEach(handleMissionResult);
          }
        }
      }
    } else if (user) {
      toast.error(t("extra.quizSaveError"));
    }
    
    setIsSaving(false);
  };

  const handleTimeUp = useCallback(() => {
    if (!isAnswered) {
      setAnswerRecord({ questionIndex: currentQuestionIndex, choice: null });
      // Running out of time is a miss: the dot goes red like a wrong answer.
      setAnswerResults((prev) => {
        const next = [...prev];
        next[currentQuestionIndex] = "wrong";
        return next;
      });

      trackQuizQuestionAnswered({
        categoryId: categoryId!,
        levelNumber: parseInt(levelId || "1"),
        questionIndex: currentQuestionIndex,
        isCorrect: false,
        timeRemaining: 0,
        difficulty: questions[currentQuestionIndex]?.difficulty || "easy",
        usedPowerUp: usedPowerUpsThisQuestion.size > 0,
        powerUpType: null,
      });
    }
  }, [isAnswered, categoryId, levelId, currentQuestionIndex, questions, usedPowerUpsThisQuestion]);

  // Out of time. Reads the live state rather than whatever the interval closed
  // over, so it can only ever fire for the question actually on screen: moving
  // on sets the clock back to full, and this stops being true.
  useEffect(() => {
    if (loading || showResults || isAnswered || questions.length === 0) return;
    if (timeRemaining > 0) return;
    handleTimeUp();
  }, [timeRemaining, loading, showResults, isAnswered, questions.length, handleTimeUp]);

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;

    setAnswerRecord({ questionIndex: currentQuestionIndex, choice: answer });

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion?.correct_answer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    setAnswerResults((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = isCorrect ? "correct" : "wrong";
      return next;
    });

    trackQuizQuestionAnswered({
      categoryId: categoryId!,
      levelNumber: parseInt(levelId || "1"),
      questionIndex: currentQuestionIndex,
      isCorrect,
      timeRemaining,
      difficulty: currentQuestion?.difficulty || "easy",
      usedPowerUp: usedPowerUpsThisQuestion.size > 0,
      powerUpType: usedPowerUpsThisQuestion.size > 0 ? Array.from(usedPowerUpsThisQuestion)[0] : null,
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // No answer reset here: moving the index is the reset.
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeRemaining(15 + timerBonus);
      // Reset power-up states for new question
      setHiddenAnswers([]);
      setUsedPowerUpsThisQuestion(new Set());
      setTimerFrozen(false);
      setFreezeEndTime(null);
    } else {
      setShowResults(true);
    }
  };

  // Power-up handler
  const handleUsePowerUp = useCallback(async (uiType: UIPowerUpType) => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ || isAnswered) return;

    // Map UI type to hook type
    const typeMap: Record<UIPowerUpType, PowerUpType> = {
      "5050": "5050",
      freeze: "freeze",
      replace: "replace",
      hint: "time-drain",
    };
    const type = typeMap[uiType];

    // Check if already used this question
    if (usedPowerUpsThisQuestion.has(type)) return;

    // Out of stock: offer to earn one by watching a rewarded ad
    if (powerUps[type] <= 0) {
      if (user) setEarnPowerUpType(type);
      return;
    }

    // Consume power-up from database
    const success = await consumePowerUp(type);
    if (!success) return;

    // Haptic feedback for satisfying mobile experience
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available (web browser)
    }

    // Mark as used this question
    setUsedPowerUpsThisQuestion(prev => new Set(prev).add(type));

    trackPowerUpUsed(type, "quiz", categoryId!);

    // Top-center icon+name flash: only for 50/50 and replace. Freeze and
    // time-drain announce themselves as badges over their own buttons in
    // the power bar instead — the top flash collided with the question
    // header ("the label covers the difficulty pill" bug).
    if (type === "5050" || type === "replace") {
      setActivePowerUpEffect(type);
    }

    // Show screen effect for visual feedback
    setActiveScreenEffect(type);
    // Clear screen effect after animation (except freeze which persists)
    if (type !== "freeze") {
      setTimeout(() => setActiveScreenEffect(null), 1500);
    }

    // Apply power-up effect
    switch (type) {
      case "5050": {
        // Hide 2 wrong answers
        const wrongAnswers = (currentQ.allAnswers || [])
          .filter(a => a !== currentQ.correct_answer)
          .filter(a => !hiddenAnswers.includes(a));
        const toHide = wrongAnswers.sort(() => Math.random() - 0.5).slice(0, Math.min(2, wrongAnswers.length - 1));
        setHiddenAnswers(prev => [...prev, ...toHide]);
        break;
      }
      case "freeze": {
        // Freeze timer for 10 seconds
        setTimerFrozen(true);
        setFreezeEndTime(Date.now() + 10000);
        // Seed the countdown so the badge doesn't show a stale 0 until the
        // first timer tick.
        setFreezeTimeRemaining(10);
        break;
      }
      case "replace": {
        // Skip to a different question - move to next question immediately
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setTimeRemaining(15 + timerBonus);
          setHiddenAnswers([]);
          setUsedPowerUpsThisQuestion(new Set());
          setTimerFrozen(false);
          setFreezeEndTime(null);
          setActiveScreenEffect(null);
        }
        break;
      }
      case "time-drain": {
        // Add 5 seconds to timer
        setTimerBonus(prev => prev + 5);
        setTimeRemaining(prev => prev + 5);
        setShowTimeDrainBadge(true);
        setTimeout(() => setShowTimeDrainBadge(false), 1500);
        break;
      }
    }
  }, [questions, currentQuestionIndex, isAnswered, usedPowerUpsThisQuestion, powerUps, consumePowerUp, hiddenAnswers, user]);

  // Watch a rewarded ad to earn the missing power-up. addPowerUp persists to
  // user_power_ups, so grant only when the ad actually rewarded — never fail open.
  const handleWatchAdForPowerUp = useCallback(async () => {
    const type = earnPowerUpType;
    setEarnPowerUpType(null);
    if (!type) return;
    const adSuccess = await adService.showRewardedAdWithPreload();
    if (!adSuccess) {
      toast.error(t("modals.adFailed"));
      return;
    }
    const ok = await addPowerUp(type, 1);
    if (ok) {
      toast.success(`+1 ${POWER_UP_EARN_LABELS[type]}`);
    }
  }, [earnPowerUpType, addPowerUp, t]);

  // Build power-ups for UI bar
  const powerUpsForUI = useMemo(() => {
    const typeMap: Record<PowerUpType, UIPowerUpType> = {
      "5050": "5050",
      freeze: "freeze",
      replace: "replace",
      "time-drain": "hint",
    };
    const currentQ = questions[currentQuestionIndex];
    const isTF = currentQ?.allAnswers?.length === 2;
    return (Object.entries(powerUps) as [PowerUpType, number][]).map(([type, count]) => ({
      type: typeMap[type],
      count,
      state: usedPowerUpsThisQuestion.has(type) || (type === "5050" && isTF) ? ("disabled" as const) : ("default" as const),
    }));
  }, [powerUps, usedPowerUpsThisQuestion, questions, currentQuestionIndex]);

  // The badge clears itself. This timer lived inside PowerUpEffectOverlay,
  // which is no longer rendered; without it activePowerUpEffect would stay
  // set and the name would sit over the cube for the rest of the question.
  useEffect(() => {
    if (!activePowerUpEffect) return;
    const timer = setTimeout(() => setActivePowerUpEffect(null), 1400);
    return () => clearTimeout(timer);
  }, [activePowerUpEffect]);

  // Status pills shown above their own power buttons (see QuizPowerUpBar):
  // the frozen-timer countdown lives over the freeze cube, the "+5წ"
  // confirmation over the time cube, and the name of whatever was just used
  // over the cube it came from.
  //
  // Nothing power-related renders at the top of the screen. Using a power
  // put its icon and name at top-24, over the question card — 50/50 and
  // Ersetzen landed across the question the player was in the middle of
  // reading, at the moment the answers changed under them. The bar is where
  // the player just tapped and where the cube they tapped lives, so a
  // confirmation belongs there, next to the count that just went down.
  const powerBarBadges = useMemo(() => {
    const badges: Partial<Record<UIPowerUpType, string>> = {};
    if (timerFrozen) {
      badges.freeze =
        freezeTimeRemaining > 0
          ? `${t("extra.timerFrozen")} · ${t("extra.secondsShort", { time: freezeTimeRemaining })}`
          : t("extra.timerFrozen");
    }
    if (showTimeDrainBadge) {
      badges.hint = `+${t("extra.secondsShort", { time: 5 })}`;
    }
    // The just-used power names itself over its own cube. Freeze and
    // time-drain already say something more useful there — a countdown and
    // the seconds gained — so they keep it rather than being overwritten.
    if (activePowerUpEffect) {
      const uiKey = POWER_UP_UI_KEY[activePowerUpEffect];
      if (!badges[uiKey]) {
        badges[uiKey] = POWER_UP_SHORT_NAME[activePowerUpEffect](t);
      }
    }
    return badges;
  }, [timerFrozen, freezeTimeRemaining, showTimeDrainBadge, activePowerUpEffect, t]);

  const currentQuestion = questions[currentQuestionIndex];
  const starPercentage = (score / Math.max(questions.length, 1)) * 100;
  const stars = starPercentage >= 80 ? 3 : starPercentage >= 60 ? 2 : starPercentage >= 40 ? 1 : 0;
  
  // Get AI-analyzed icon slug for current question (highest priority)
  const aiIconSlug = useAIIconSlug(currentQuestion?.question, dbCategory?.name);

  // The heading in the player's language. categories.name is Georgian for
  // everyone; the translations Discover already shows live in
  // category_translations.
  const categoryTitle = useCategoryDisplayName(
    dbCategory?.id,
    dbCategory?.name || category?.name,
  );

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

  // Georgian answer labels
  const ANSWER_LABELS = [t("extra.answerLabelA"), t("extra.answerLabelB"), t("extra.answerLabelC"), t("extra.answerLabelD")];
  
  const DIFFICULTY_LABELS: Record<string, string> = {
    easy: t("extra.difficultyEasy"),
    medium: t("extra.difficultyMedium"),
    hard: t("extra.difficultyHard"),
  };

  const DIFFICULTY_COLORS: Record<string, string> = {
    easy: "bg-success",
    medium: "bg-warning",
    hard: "bg-destructive",
  };
  
  const difficultyKey = currentQuestion?.difficulty || "easy";

  // Get answer button state (same logic as QuizGameScreenProd) - MUST be before early returns
  const getAnswerState = useCallback(
    (answer: string): QuizAnswerState => {
      if (!isAnswered) {
        // Check if answer is hidden by 50/50
        if (hiddenAnswers.includes(answer)) return "disabled";
        return "default";
      }

      const isCorrect = answer === currentQuestion?.correct_answer;
      const isSelected = answer === selectedAnswer;

      if (isCorrect) return "correct";
      if (isSelected && !isCorrect) return "wrong";
      return "default";
    },
    [isAnswered, currentQuestion, selectedAnswer, hiddenAnswers]
  );

  // Build progress results for dots (same as QuizGameScreenProd) - MUST be
  // before early returns. Straight from the per-question record: dot N shows
  // what happened on question N, not a score-count approximation.
  const progressResults = useMemo(
    () => questions.map((_, i) => answerResults[i] ?? null),
    [questions, answerResults],
  );
  // Shared reset function for replay
  const resetQuiz = useCallback(() => {
    setFetchNonce((n) => n + 1);
    hasFetched.current = false;
    hasSaved.current = false;
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswerRecord(null);
    setAnswerResults([]);
    setTimeRemaining(15);
    setScore(0);
    setShowResults(false);
    setLoading(true);
    setSavedStars(0);
    setPointsEarned(0);
    setUnlockedLevel(null);
    setQuestionIds([]);
    setNewProfileLevel(0);
    setPreviousProfileLevel(0);
    setLevelUpRewardsCredited(false);
    setHiddenAnswers([]);
    setUsedPowerUpsThisQuestion(new Set());
    setTimerBonus(0);
    setTimerFrozen(false);
    setFreezeEndTime(null);
    setFreezeTimeRemaining(0);
  }, []);


  if (loading) {
    return (
      <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] bg-background flex items-center justify-center relative">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 p-2.5 rounded-full bg-foreground/10 backdrop-blur-sm hover:bg-foreground/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        
        <div className="text-center">
          <motion.img
            src={puzzleSphereIcon}
            alt="Loading"
            className="w-16 h-16 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-muted-foreground">{t("extra.generatingQuestions")}</p>
        </div>
      </div>
    );
  }

  // Fixed height + own scroller, not min-h-screen: the native shell kills
  // document scrolling (AGENTS.md 4b), and m-auto centers while staying
  // reachable when content is taller than a small phone.
  if (outOfQuestions) {
    return (
      <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background flex p-6 relative">
        <button
          onClick={() => navigate(`/category/${categoryId}`)}
          className="fixed left-4 z-30 w-11 h-11 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-black/5 flex items-center justify-center"
          style={{ top: "calc(var(--safe-top) + 16px)" }}
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="m-auto text-center max-w-sm"
        >
          <motion.img
            src={newQuestionsPaper}
            alt=""
            className="w-32 h-32 mx-auto mb-5 object-contain"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <p className="text-lg font-medium text-foreground mb-8">
            {t("extra.quizOutOfQuestionsDesc")}
          </p>
          <div className="space-y-3">
            <ChunkyButton
              variant="primary"
              className="w-full"
              onClick={() => navigate(`/category/${categoryId}`)}
            >
              {t("extra.chooseDifferentLevel")}
            </ChunkyButton>
            <ChunkyButton
              variant="secondary"
              className="w-full"
              onClick={() => navigate("/discover")}
            >
              {t("extra.quizExploreOtherCategories")}
            </ChunkyButton>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background flex p-6">
        <div className="m-auto text-center max-w-sm">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t("extra.oopsTitle")}</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-3">
            <ChunkyButton 
              variant="primary"
              className="w-full"
              onClick={() => {
                // Clear tracking and retry
                hasFetched.current = false;
                setError(null);
                setLoading(true);
              }}
            >
              {t("extra.tryAgain")}
            </ChunkyButton>
            <ChunkyButton 
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/category/${categoryId}`)}
            >
              {t("extra.chooseDifferentLevel")}
            </ChunkyButton>
            <ChunkyButton 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              {t("extra.goToHome")}
            </ChunkyButton>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    // Use savedStars after saving is complete, fallback to local stars only while saving
    // Important: savedStars can be 0, so we check hasSaved.current instead of truthiness
    const displayStars = isSaving ? stars : (hasSaved.current ? savedStars : stars);
    const passed = displayStars >= 1;
    const isPerfect = score === questions.length;
    const didLevelUp = newProfileLevel > previousProfileLevel;
    
    // Calculate level-up rewards for display
    const levelUpCoins = didLevelUp ? REWARDS.LEVEL_UP_COINS : 0;
    
    return (
      <>
        {showRegisterPrompt && (
          <RegisterPromptModal
            isOpen={showRegisterPrompt}
            onClose={() => setShowRegisterPrompt(false)}
            onRegister={() => {
              setShowRegisterPrompt(false);
              navigate("/auth");
            }}
          />
        )}
        <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background flex p-6 relative">
          {/* Back button */}
          <button
            onClick={() => navigate(`/category/${categoryId}`)}
            className="absolute top-4 left-4 z-20 p-2.5 rounded-full bg-foreground/10 backdrop-blur-sm hover:bg-foreground/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="m-auto text-center max-w-sm w-full"
          >
            {/* Result emoji with animation */}
            <motion.div 
              className="mb-4 flex justify-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              {isPerfect ? (
                <img 
                  src={PERFECT_SCORE_ICON}
                  alt="Perfect"
                  className="w-24 h-24 object-contain drop-shadow-lg"
                />
              ) : passed ? (
                <img 
                  src={successIcon} 
                  alt="Excellent" 
                  className="w-24 h-24 object-contain drop-shadow-lg"
                />
              ) : (
                <img 
                  src={workoutIcon} 
                  alt="Keep practicing" 
                  className="w-24 h-24 object-contain drop-shadow-lg"
                />
              )}
            </motion.div>
            
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isPerfect ? t("extra.quizPerfect") : passed ? t("extra.quizExcellent") : t("extra.quizKeepPracticing")}
            </h2>
            <p className="text-muted-foreground mb-2">
              {t("extra.quizCorrectAnswers", { score, total: questions.length })}
            </p>
            
            {/* Points earned with animation */}
            {pointsEarned > 0 && (
              <motion.p 
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-xl font-bold text-primary mb-3"
              >
                {t("extra.quizPointsEarned", { points: pointsEarned })}
              </motion.p>
            )}
            
            {/* Inline Level-Up Banner */}
            {didLevelUp && !isSaving && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="mb-4 p-3 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-bold text-foreground">{t("extra.quizLevelUp")}</span>
                </div>
                <p className="text-lg font-bold text-primary">
                  {previousProfileLevel} → {newProfileLevel}
                </p>
                <div className="flex items-center justify-center gap-3 mt-2 text-sm text-muted-foreground">
                  {levelUpCoins > 0 && (
                    <span className="flex items-center gap-1">
                      +{levelUpCoins} <img src={coinIcon} alt="" className="w-4 h-4 inline" />
                    </span>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Stars with enhanced animation */}
            <div className="flex justify-center gap-3 mb-6">
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4 + i * 0.15, type: "spring", stiffness: 300 }}
                  className={`text-5xl ${i < displayStars ? "drop-shadow-lg" : "opacity-30 grayscale"}`}
                >
                  ⭐
                </motion.span>
              ))}
            </div>
            
            {/* Exhaustion indicator (show when 70%+ used) */}
            {exhaustionInfo && exhaustionInfo.totalAvailable > 0 && 
             Math.round((exhaustionInfo.totalSeen / exhaustionInfo.totalAvailable) * 100) >= 70 && (
              <div className="mb-4">
                <ExhaustionIndicator
                  percentUsed={Math.round((exhaustionInfo.totalSeen / exhaustionInfo.totalAvailable) * 100)}
                  totalAvailable={exhaustionInfo.totalAvailable}
                  totalSeen={exhaustionInfo.totalSeen}
                  wasReset={exhaustionInfo.wasReset}
                  usedFallback={exhaustionInfo.usedFallback}
                  compact
                />
              </div>
            )}

            {isSaving && (
              <p className="text-sm text-muted-foreground mb-4">{t("extra.quizSavingProgress")}</p>
            )}

            <div className="space-y-3 relative z-10">
              {/* Primary action: Continue to next level if passed and unlocked */}
              {passed && unlockedLevel && !isSaving && (
                <ChunkyButton 
                  variant="primary"
                  onClick={() => navigate(`/play/${categoryId}/${unlockedLevel}`)}
                  icon={<ChevronRight className="w-5 h-5" />}
                  className="w-full"
                >
                  {t("extra.quizNextLevel", { level: unlockedLevel })}
                </ChunkyButton>
              )}
              
              {/* If not passed or no next level: Primary is replay */}
              {(!passed || !unlockedLevel) && !isSaving && (
                <ChunkyButton 
                  variant="primary"
                  className="w-full"
                  onClick={resetQuiz}
                >
              {t("extra.tryAgain")}
              </ChunkyButton>
            )}
              
              {/* Replay option when next level is available */}
              {passed && unlockedLevel && !isSaving && (
                <ChunkyButton 
                  variant="secondary" 
                  className="w-full"
                  onClick={resetQuiz}
                >
                  {t("extra.quizReplay")}
                </ChunkyButton>
              )}
            </div>
          </motion.div>
        </div>
      </>
    );
  }
  return (
    // Full-width purple background on desktop/tablet (prevents white gutters)
    <div className="w-full h-[100dvh] bg-[#7E7ADB] overflow-hidden" style={{ marginTop: "calc(-1 * var(--safe-top))", paddingTop: "var(--safe-top)" }}>
      {/* Content wrapper with max-width for desktop/tablet, centered */}
      <div className="w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto">

      {/* Header - Solo mode with category name and timer */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0 [@media(max-height:700px)]:py-1 [@media(max-height:600px)]:pt-1 [@media(max-height:600px)]:pb-0.5">
        <button
          onClick={() => setShowExitDialog(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        {/* Center - Category name */}
        <span className="text-white font-bold text-base truncate max-w-[160px] text-center">
          {categoryTitle || "Quiz"}
        </span>
        
        {/* Right - Compact Timer */}
        <TimerBadge 
          seconds={timeRemaining} 
          maxSeconds={15 + timerBonus}
          compact
        />
      </div>

      {/* Question Card with Overlapping Icon - Solo mode optimized */}
      <div className="px-4 flex-shrink-0 mt-10 mb-2 [@media(max-height:700px)]:mt-6 [@media(max-height:600px)]:mt-4 [@media(max-height:700px)]:mb-1 relative">
        {/* Category Icon - hide for media questions (image/video/audio) */}
        {!currentQuestion?.image_url && !currentQuestion?.video_url && !currentQuestion?.audio_url && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-20">
            <DynamicIcon 
              slug={currentQuestion?.icon_slug || aiIconSlug || dbCategory?.icon_slug || undefined}
              categoryId={(currentQuestion?.icon_slug || aiIconSlug) ? undefined : categoryId}
              size={100}
              className="drop-shadow-2xl"
            />
          </div>
        )}
        {/* Media questions carry no difficulty pill — it sat on the very
            picture being guessed. Logo marks also get breathing room via
            imageInset: full-bleed bars touched the band's edges. */}
        <QuizQuestionCard
          questionText={currentQuestion?.question || ""}
          imageUrl={currentQuestion?.image_url}
          videoUrl={currentQuestion?.video_url}
          audioUrl={currentQuestion?.audio_url}
          progressPercent={(timeRemaining / (15 + timerBonus)) * 100}
          state={timerFrozen ? "frozen" : "default"}
          difficultyLabel={
            currentQuestion?.image_url || currentQuestion?.video_url || currentQuestion?.audio_url
              ? undefined
              : DIFFICULTY_LABELS[difficultyKey]
          }
          imageInset={categoryId === "guess_logo"}
          imageFramed={categoryId === "guess_flag"}
          imageReveal={categoryId === "guess_logo"}
          imageRevealAll={isAnswered}
          difficultyColor={DIFFICULTY_COLORS[difficultyKey]}
          freezeTimeLeft={freezeTimeRemaining}
          reserveTopSpace={!currentQuestion?.image_url && !currentQuestion?.video_url && !currentQuestion?.audio_url}
          hideQuestionText={!!currentQuestion?.image_url}
        />
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center py-2 flex-shrink-0">
        <QuizProgressDots
          total={questions.length}
          current={currentQuestionIndex}
          results={progressResults}
        />
      </div>

      {/* Answer Buttons */}
      {isTrueFalseQuestion ? (
        <div className="flex-1 min-h-0 px-4 pt-2 flex gap-3 items-center justify-center">
          {/* popLayout, or the question change stalls: in the default mode an
              exiting element keeps its layout slot until its exit animation
              ends, so the OLD answers held their places — with a staggered
              exit delay on top — while the NEW ones mounted underneath and
              then jumped up. That was the "answers show after some delay":
              they were on screen, below the leavers. popLayout lifts leavers
              out of the flow immediately. Quick game never had this because
              its answers do not animate out. */}
          <AnimatePresence mode="popLayout">
            {currentQuestion?.allAnswers?.map((answer, index) => {
              const isTrue = answer.toLowerCase() === "მართალია" || answer.toLowerCase() === "true";
              if (hiddenAnswers.includes(answer)) return null;

              return (
                <motion.div
                  key={`${currentQuestionIndex}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: { delay: index * 0.05 } }}
                  // Exit fast and without the stagger — the transition prop
                  // applied to both directions, so the last leaver used to
                  // wait 150ms before even starting to go.
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="flex-1"
                >
                  <QuizTrueFalseButton
                    variant={isTrue ? "true" : "false"}
                    state={getAnswerState(answer) as QuizTrueFalseState}
                    onClick={() => handleAnswerSelect(answer)}
                    disabled={isAnswered || hiddenAnswers.includes(answer)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 px-4 pt-2 flex flex-col gap-2 overflow-y-auto min-h-0">
          {/* popLayout — see the true/false block above. */}
          <AnimatePresence mode="popLayout">
            {currentQuestion?.allAnswers?.map((answer, index) => {
              // Skip hidden answers (from 50/50 power-up)
              if (hiddenAnswers.includes(answer)) return null;

              return (
                <motion.div
                  key={`${currentQuestionIndex}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="flex-shrink-0"
                >
                  <QuizAnswerButton
                    label={ANSWER_LABELS[index]}
                    text={answer}
                    state={getAnswerState(answer)}
                    onClick={() => handleAnswerSelect(answer)}
                    disabled={isAnswered || hiddenAnswers.includes(answer)}
                    showLabel={true}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom Area - Power-ups OR Next Button (same as QuizGameScreenProd) */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="pb-[env(safe-area-inset-bottom)]">
          <AnimatePresence mode="wait">
            {isAnswered ? (
              <motion.div
                key="next-button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ChunkyButton
                  variant="secondary"
                  size="xl"
                  onClick={handleNextQuestion}
                  className="w-full"
                >
                  {currentQuestionIndex < questions.length - 1 ? t("extra.quizNextQuestion") : t("extra.quizResults")}
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
                  allowZeroClick
                  powerUps={powerUpsForUI}
                  onPowerUpClick={handleUsePowerUp}
                  badges={powerBarBadges}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-white rounded-2xl border-0 max-w-[90%] sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl text-slate-800">
              {t("extra.quizExitTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-slate-500">
              {t("extra.quizExitDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
            <AlertDialogCancel className="flex-1 m-0 bg-slate-100 border-0 text-slate-700 hover:bg-slate-200">
              {t("extra.quizContinue")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                trackQuizAbandoned(categoryId!, parseInt(levelId || "1"), currentQuestionIndex, questions.length);
                setShowExitDialog(false);
                navigate(`/category/${categoryId}`);
              }}
              className="flex-1 m-0 bg-red-500 hover:bg-red-600 text-white"
            >
              {t("extra.quizExit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Watch-ad-to-earn-power-up Dialog */}
      <AlertDialog open={!!earnPowerUpType} onOpenChange={(open) => !open && setEarnPowerUpType(null)}>
        <AlertDialogContent className="bg-white rounded-2xl border-0 max-w-[90%] sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl text-slate-800">
              {t("modals.watchAd")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-slate-500">
              {t("modals.watchAdGetPlays")}{" "}
              <span className="font-bold text-slate-700">
                +1 {earnPowerUpType ? POWER_UP_EARN_LABELS[earnPowerUpType] : ""}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
            <AlertDialogCancel className="flex-1 m-0 bg-slate-100 border-0 text-slate-700 hover:bg-slate-200">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWatchAdForPowerUp}
              className="flex-1 m-0 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {t("modals.watchAd")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* No power-up overlay here any more. What was used is named above the
          cube it was used from, in QuizPowerUpBar, so the question card stays
          readable at the moment the answers change. The clearing timer that
          the overlay used to own now runs below. */}

      {/* Screen-wide power-up effects */}
      <PowerUpScreenEffect type={activeScreenEffect} isActive={activeScreenEffect !== null || timerFrozen} />
      </div>
    </div>
  );
}
