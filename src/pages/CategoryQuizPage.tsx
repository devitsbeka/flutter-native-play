import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HelpCircle, ChevronRight } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { getCategoryById } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { RegisterPromptModal } from "@/components/home/RegisterPromptModal";
import { LevelUpModal } from "@/components/home/LevelUpModal";
import { getGuestProgress } from "@/hooks/useGuestProgress";
import { useSessionQuestions } from "@/hooks/useSessionQuestions";
import confetti from "canvas-confetti";
import { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH } from "@/utils/questionValidation";
import { calculateLevel } from "@/utils/levelCalculation";

// Import shared quiz UI components
import { QuizPlayerAvatar } from "@/components/ui/quiz-player-avatar";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizPowerUpBar } from "@/components/ui/quiz-power-up-bar";
import { PowerUpType as UIPowerUpType } from "@/components/ui/quiz-power-up-button";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";

// Import bot avatars for opponent
import botAvatar1 from "@/assets/avatars/bot-avatar-1.png";
import botAvatar2 from "@/assets/avatars/bot-avatar-2.png";
import botAvatar3 from "@/assets/avatars/bot-avatar-3.png";

const BOT_AVATARS = [botAvatar1, botAvatar2, botAvatar3];

interface TriviaQuestion {
  id: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: "easy" | "medium" | "hard";
  allAnswers?: string[];
  icon_slug?: string | null;
}

export default function CategoryQuizPage() {
  const { categoryId, levelId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { updateLevelProgress } = useCategoryProgress();
  
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedStars, setSavedStars] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState<number | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newProfileLevel, setNewProfileLevel] = useState(0);
  const [previousProfileLevel, setPreviousProfileLevel] = useState(0);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  
  // Power-up state
  const { powerUps, usePowerUp: consumePowerUp } = useUserPowerUps();
  const [hiddenAnswers, setHiddenAnswers] = useState<string[]>([]);
  const [usedPowerUpsThisQuestion, setUsedPowerUpsThisQuestion] = useState<Set<PowerUpType>>(new Set());
  const [timerBonus, setTimerBonus] = useState(0);
  
  const hasFetched = useRef(false);
  const hasSaved = useRef(false);

  // Store database category with icon_slug
  const [dbCategory, setDbCategory] = useState<{ id: string; name: string; icon_slug: string | null } | null>(null);
  const category = getCategoryById(categoryId || "");
  
  // Session question tracking to prevent repetition
  const { getAskedQuestionIds, markQuestionsAsAsked, clearAskedQuestions, shouldResetPool } = useSessionQuestions(categoryId || "");
  
  // Mock opponent data
  const opponent = useMemo(() => ({
    name: "QuizBot",
    avatar: BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)],
    score: 0,
  }), []);
  
  const [opponentScore, setOpponentScore] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  
  // Simulate opponent answering
  useEffect(() => {
    if (isAnswered && !showResults) {
      // Simulate opponent getting answer right ~60% of the time
      const opponentCorrect = Math.random() > 0.4;
      if (opponentCorrect) {
        setOpponentScore(prev => prev + Math.floor(Math.random() * 30) + 20);
      }
    }
  }, [isAnswered, currentQuestionIndex]);
  
  // Update player score when they answer correctly
  useEffect(() => {
    if (isAnswered && selectedAnswer === questions[currentQuestionIndex]?.correct_answer) {
      setPlayerScore(prev => prev + Math.floor(Math.random() * 30) + 25);
    }
  }, [isAnswered]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch questions from database ONLY
  useEffect(() => {
    if (hasFetched.current) return;
    if (!categoryId || !category) return;

    hasFetched.current = true;
    setLoading(true);
    setError(null);

    const fetchQuestions = async () => {
      try {
        const levelNumber = parseInt(levelId || "1");
        
        // First, get the category UUID and icon_slug from the category_id string
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id, name, icon_slug')
          .eq('category_id', categoryId)
          .maybeSingle();

        if (categoryError) {
          console.error("Category fetch error:", categoryError);
          setError("კატეგორია ვერ მოიძებნა.");
          return;
        }

        if (!categoryData) {
          setError("კატეგორია ვერ მოიძებნა.");
          return;
        }

        // Store the database category for icon rendering
        setDbCategory(categoryData);

        // Get previously asked question IDs to exclude
        let askedIds = getAskedQuestionIds();
        
        // First, check total available questions for this level range
        const { count: totalCount } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('category_id', categoryData.id)
          .gte('level_number', levelNumber)
          .lte('level_number', levelNumber + 2);
        
        // Reset pool if we've used most questions
        if (totalCount && shouldResetPool(totalCount)) {
          clearAskedQuestions();
          askedIds = [];
        }

        // Build query excluding asked questions
        let query = supabase
          .from('questions')
          .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug')
          .eq('is_active', true)
          .eq('category_id', categoryData.id)
          .gte('level_number', levelNumber)
          .lte('level_number', levelNumber + 2);
        
        // Exclude previously asked questions if any
        if (askedIds.length > 0) {
          query = query.not('id', 'in', `(${askedIds.join(',')})`);
        }
        
        const { data: dbQuestions, error: dbError } = await query.limit(15);

        if (dbError) {
          console.error("Questions fetch error:", dbError);
          setError("კითხვების ჩატვირთვა ვერ მოხერხდა.");
          return;
        }

        // If no new questions available, reset and try again
        if (!dbQuestions || dbQuestions.length === 0) {
          if (askedIds.length > 0) {
            clearAskedQuestions();
            // Retry without exclusions
            const { data: retryQuestions } = await supabase
              .from('questions')
              .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug')
              .eq('is_active', true)
              .eq('category_id', categoryData.id)
              .gte('level_number', levelNumber)
              .lte('level_number', levelNumber + 2)
              .limit(15);
            
            if (!retryQuestions || retryQuestions.length === 0) {
              setError("ამ კატეგორიაში კითხვები არ მოიძებნა. გთხოვთ დაამატოთ კითხვები ადმინ პანელიდან.");
              return;
            }
            // Use retry questions
            processAndSetQuestions(retryQuestions, categoryData);
            return;
          }
          setError("ამ კატეგორიაში კითხვები არ მოიძებნა. გთხოვთ დაამატოთ კითხვები ადმინ პანელიდან.");
          return;
        }
        
        processAndSetQuestions(dbQuestions, categoryData);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("მოულოდნელი შეცდომა მოხდა. გთხოვთ სცადოთ თავიდან.");
      } finally {
        setLoading(false);
      }
    };
    
    const processAndSetQuestions = (dbQuestions: any[], categoryData: any) => {
      // Store the database category for icon rendering
      setDbCategory(categoryData);
      
      // Filter and process questions
      const processedQuestions = dbQuestions
        .map((q: any) => {
          const incorrectAnswers = Array.isArray(q.incorrect_answers) 
            ? q.incorrect_answers 
            : JSON.parse(q.incorrect_answers || '[]');
          
          return {
            id: q.id,
            question: q.question_text,
            correct_answer: q.correct_answer,
            incorrect_answers: incorrectAnswers,
            difficulty: q.difficulty as "easy" | "medium" | "hard",
            allAnswers: shuffleArray([q.correct_answer, ...incorrectAnswers]),
            icon_slug: q.icon_slug,
          };
        })
        // Filter out questions/answers that are too long for viewport
        .filter((q) => {
          if (q.question.length > QUESTION_MAX_LENGTH) return false;
          if (q.correct_answer.length > ANSWER_MAX_LENGTH) return false;
          if (q.incorrect_answers.some((a: string) => a.length > ANSWER_MAX_LENGTH)) return false;
          return true;
        });

      // Shuffle and take 5 questions
      const shuffledDbQuestions = shuffleArray(processedQuestions).slice(0, 5);
      
      // Store question IDs to mark as asked after quiz
      setQuestionIds(shuffledDbQuestions.map(q => q.id));
      setQuestions(shuffledDbQuestions);
      setLoading(false);
    };

    fetchQuestions();
  }, [categoryId, category, levelId]);

  // Timer
  useEffect(() => {
    if (loading || isAnswered || showResults || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isAnswered, showResults, currentQuestionIndex, questions.length]);

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
    
    // Mark questions as asked to prevent repetition
    if (questionIds.length > 0) {
      markQuestionsAsAsked(questionIds);
    }
    
    // Store previous profile level to detect level-ups
    const previousLevel = profile?.total_points ? calculateLevel(profile.total_points).level : 1;
    setPreviousProfileLevel(previousLevel);
    
    const result = await updateLevelProgress(categoryId, levelNumber, score, questions.length);
    
    if (result.success) {
      setSavedStars(result.stars);
      const earned = score * 10 + result.stars * 20;
      setPointsEarned(earned);
      
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
      if (user && profile) {
        const newTotalPoints = (profile.total_points || 0) + earned;
        const newLevel = calculateLevel(newTotalPoints).level;
        if (newLevel > previousLevel) {
          setNewProfileLevel(newLevel);
          // Show level-up modal after a short delay
          setTimeout(() => setShowLevelUpModal(true), 1000);
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
          score === questions.length ? "🏆 იდეალური შედეგი!" : "🎉 დონე გავლილია!", 
          { description: `+${earned} ქულა მიღებულია!` }
        );
      } else {
        toast.info("სცადე თავიდან შემდეგი დონის გასახსნელად!");
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
    } else if (user) {
      toast.error("პროგრესის შენახვა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.");
    }
    
    setIsSaving(false);
  };

  const handleTimeUp = useCallback(() => {
    if (!isAnswered) {
      setIsAnswered(true);
      setSelectedAnswer(null);
    }
  }, [isAnswered]);

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);

    const currentQuestion = questions[currentQuestionIndex];
    if (answer === currentQuestion?.correct_answer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeRemaining(15 + timerBonus);
      // Reset power-up states for new question
      setHiddenAnswers([]);
      setUsedPowerUpsThisQuestion(new Set());
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

    // Check if user has any left
    if (powerUps[type] <= 0) return;

    // Consume power-up from database
    const success = await consumePowerUp(type);
    if (!success) return;

    // Mark as used this question
    setUsedPowerUpsThisQuestion(prev => new Set(prev).add(type));

    // Apply power-up effect
    switch (type) {
      case "5050": {
        // Hide 2 wrong answers
        const wrongAnswers = (currentQ.allAnswers || [])
          .filter(a => a !== currentQ.correct_answer)
          .filter(a => !hiddenAnswers.includes(a));
        const toHide = wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 2);
        setHiddenAnswers(prev => [...prev, ...toHide]);
        break;
      }
      case "freeze": {
        // Freeze opponent (in this simple version, just reduce their score chance)
        // Effect is visual - opponent won't gain score this round
        toast.success("❄️ მოწინააღმდეგე გაყინულია!");
        break;
      }
      case "replace": {
        // Replace one wrong answer (similar to 50/50 but just one)
        const wrongAnswers = (currentQ.allAnswers || [])
          .filter(a => a !== currentQ.correct_answer)
          .filter(a => !hiddenAnswers.includes(a));
        if (wrongAnswers.length > 0) {
          setHiddenAnswers(prev => [...prev, wrongAnswers[0]]);
        }
        break;
      }
      case "time-drain": {
        // Add 5 seconds to timer
        setTimerBonus(prev => prev + 5);
        setTimeRemaining(prev => prev + 5);
        toast.success("⏱️ +5 წამი დამატებულია!");
        break;
      }
    }
  }, [questions, currentQuestionIndex, isAnswered, usedPowerUpsThisQuestion, powerUps, consumePowerUp, hiddenAnswers]);

  // Build power-ups for UI bar
  const powerUpsForUI = useMemo(() => {
    const typeMap: Record<PowerUpType, UIPowerUpType> = {
      "5050": "5050",
      freeze: "freeze",
      replace: "replace",
      "time-drain": "hint",
    };
    return (Object.entries(powerUps) as [PowerUpType, number][]).map(([type, count]) => ({
      type: typeMap[type],
      count,
      state: usedPowerUpsThisQuestion.has(type) ? ("disabled" as const) : ("default" as const),
    }));
  }, [powerUps, usedPowerUpsThisQuestion]);

  const currentQuestion = questions[currentQuestionIndex];
  const stars = Math.min(3, Math.floor((score / Math.max(questions.length, 1)) * 4));

  // Georgian answer labels
  const ANSWER_LABELS = ["ა", "ბ", "გ", "დ"];
  
  // Difficulty labels and colors (same as QuizGameScreenProd)
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

  // Build progress results for dots (same as QuizGameScreenProd) - MUST be before early returns
  const progressResults = useMemo(() => {
    const results: ("correct" | "wrong" | null)[] = [];
    for (let i = 0; i < questions.length; i++) {
      if (i < currentQuestionIndex) {
        results.push(i < score ? "correct" : "wrong");
      } else if (i === currentQuestionIndex && isAnswered) {
        results.push(selectedAnswer === currentQuestion?.correct_answer ? "correct" : "wrong");
      } else {
        results.push(null);
      }
    }
    return results;
  }, [questions.length, currentQuestionIndex, isAnswered, selectedAnswer, currentQuestion, score]);

  // Get player avatar state - MUST be before early returns
  const getPlayerState = useCallback(() => {
    if (!isAnswered) return "active";
    return selectedAnswer === currentQuestion?.correct_answer ? "correct" : "wrong";
  }, [isAnswered, selectedAnswer, currentQuestion]);

  // Get opponent avatar state (simulated) - MUST be before early returns
  const getOpponentState = useCallback(() => {
    if (!isAnswered) return "default";
    return Math.random() > 0.4 ? "correct" : "wrong";
  }, [isAnswered, currentQuestionIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 p-2.5 rounded-full bg-foreground/10 backdrop-blur-sm hover:bg-foreground/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-4"
          >
            {category?.icon || "🎯"}
          </motion.div>
          <p className="text-muted-foreground">კითხვების გენერირება...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-foreground mb-2">უპს!</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <ChunkyButton onClick={() => navigate(-1)}>უკან დაბრუნება</ChunkyButton>
        </div>
      </div>
    );
  }

  if (showResults) {
    const displayStars = isSaving ? stars : savedStars || stars;
    const passed = displayStars >= 1;
    const isPerfect = score === questions.length;
    
    return (
      <>
        <RegisterPromptModal
          isOpen={showRegisterPrompt}
          onClose={() => setShowRegisterPrompt(false)}
          onRegister={() => {
            setShowRegisterPrompt(false);
            navigate("/auth");
          }}
        />
        <LevelUpModal
          isOpen={showLevelUpModal}
          onClose={() => setShowLevelUpModal(false)}
          newLevel={newProfileLevel}
          previousLevel={previousProfileLevel}
        />
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
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
          className="text-center max-w-sm w-full"
        >
          {/* Result emoji with animation */}
          <motion.div 
            className="text-7xl mb-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            {isPerfect ? "🏆" : passed ? "🎉" : "💪"}
          </motion.div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isPerfect ? "იდეალური!" : passed ? "შესანიშნავია!" : "გააგრძელე ვარჯიში!"}
          </h2>
          <p className="text-muted-foreground mb-2">
            სწორი პასუხი: {score} / {questions.length}
          </p>
          
          {/* Points earned with animation */}
          {pointsEarned > 0 && (
            <motion.p 
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="text-xl font-bold text-primary mb-3"
            >
              +{pointsEarned} ქულა!
            </motion.p>
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

          {isSaving && (
            <p className="text-sm text-muted-foreground mb-4">პროგრესის შენახვა...</p>
          )}

          <div className="space-y-3 relative z-10">
            {/* Primary action: Continue to next level if passed */}
            {passed && unlockedLevel && !isSaving && (
              <ChunkyButton 
                variant="primary"
                onClick={() => navigate(`/play/${categoryId}/${unlockedLevel}`)}
                icon={<ChevronRight className="w-5 h-5" />}
                className="w-full"
              >
                შემდეგი დონე: {unlockedLevel}
              </ChunkyButton>
            )}
            
            {/* Secondary action: Go to category map */}
            <ChunkyButton 
              variant={passed && unlockedLevel ? "secondary" : "primary"}
              onClick={() => navigate(`/category/${categoryId}`)}
              disabled={isSaving}
              className="w-full"
            >
              {passed && unlockedLevel ? "რუკაზე დაბრუნება" : "გაგრძელება"}
            </ChunkyButton>
            
            {/* Retry option */}
            <ChunkyButton 
              variant="ghost" 
              disabled={isSaving}
              className="w-full"
              onClick={() => {
                hasFetched.current = false;
                hasSaved.current = false;
                setQuestions([]);
                setCurrentQuestionIndex(0);
                setScore(0);
                setShowResults(false);
                setLoading(true);
                setSavedStars(0);
                setPointsEarned(0);
                setUnlockedLevel(null);
                setQuestionIds([]);
              }}
            >
              თავიდან თამაში
            </ChunkyButton>
          </div>
        </motion.div>
      </div>
      </>
    );
  }
  return (
    <div className="w-full h-screen flex flex-col bg-[#7E7ADB] overflow-hidden">
      {/* Safe area padding for notched phones */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* Header - same as QuizGameScreenProd */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <HelpCircle className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Players Row - same layout as QuizGameScreenProd */}
      <div className="flex items-start justify-between px-4 pt-2 flex-shrink-0 z-10">
        {/* Player (Left) */}
        <QuizPlayerAvatar
          avatarUrl={profile?.avatar_url}
          score={playerScore}
          position="left"
          state={getPlayerState()}
          size="large"
        />

        {/* Category Icon - Between Players - prioritize question icon over category */}
        <div className="flex-1 flex justify-center items-start pt-4">
          <DynamicIcon 
            slug={currentQuestion?.icon_slug || dbCategory?.icon_slug || undefined}
            categoryId={categoryId}
            size={80}
            className="drop-shadow-lg"
          />
        </div>

        {/* Opponent (Right) */}
        <QuizPlayerAvatar
          avatarUrl={opponent.avatar}
          score={opponentScore}
          position="right"
          state={getOpponentState()}
          size="large"
        />
      </div>

      {/* Question Card - same component as QuizGameScreenProd */}
      <div className="px-4 flex-shrink-0 mt-4">
        <QuizQuestionCard
          questionText={currentQuestion?.question || ""}
          progressPercent={(timeRemaining / (15 + timerBonus)) * 100}
          state="default"
          difficultyLabel={DIFFICULTY_LABELS[difficultyKey]}
          difficultyColor={DIFFICULTY_COLORS[difficultyKey]}
          timerSeconds={timeRemaining}
          timerMaxSeconds={15 + timerBonus}
        />
      </div>

      {/* Progress Dots - same component as QuizGameScreenProd */}
      <div className="flex justify-center my-3 flex-shrink-0">
        <QuizProgressDots
          total={questions.length}
          current={currentQuestionIndex}
          results={progressResults}
        />
      </div>

      {/* Answer Buttons - same component as QuizGameScreenProd */}
      <div className="flex-1 px-4 flex flex-col gap-2 overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {currentQuestion?.allAnswers?.map((answer, index) => {
            // Skip hidden answers (from 50/50 power-up)
            if (hiddenAnswers.includes(answer)) return null;
            
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
                  onClick={() => handleAnswerSelect(answer)}
                  disabled={isAnswered || hiddenAnswers.includes(answer)}
                  showLabel={true}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

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
                  variant="white"
                  size="xl"
                  onClick={handleNextQuestion}
                  className="w-full"
                >
                  {currentQuestionIndex < questions.length - 1 ? "შემდეგი კითხვა" : "შედეგები"}
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
