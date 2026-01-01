import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Check, X } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { getCategoryById } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { RegisterPromptModal } from "@/components/home/RegisterPromptModal";
import { getGuestProgress } from "@/hooks/useGuestProgress";
import confetti from "canvas-confetti";

interface TriviaQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: "easy" | "medium" | "hard";
  allAnswers?: string[];
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
  
  const hasFetched = useRef(false);
  const hasSaved = useRef(false);

  const category = getCategoryById(categoryId || "");

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
        
        // First, get the category UUID from the category_id string
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id, name')
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

        // Fetch questions from database
        const { data: dbQuestions, error: dbError } = await supabase
          .from('questions')
          .select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number')
          .eq('is_active', true)
          .eq('category_id', categoryData.id)
          .gte('level_number', levelNumber)
          .lte('level_number', levelNumber + 2)
          .limit(10);

        if (dbError) {
          console.error("Questions fetch error:", dbError);
          setError("კითხვების ჩატვირთვა ვერ მოხერხდა.");
          return;
        }

        if (!dbQuestions || dbQuestions.length === 0) {
          setError("ამ კატეგორიაში კითხვები არ მოიძებნა. გთხოვთ დაამატოთ კითხვები ადმინ პანელიდან.");
          return;
        }

        // Shuffle and take 5 questions
        const shuffledDbQuestions = shuffleArray(dbQuestions).slice(0, 5);

        const processedQuestions = shuffledDbQuestions.map((q: any) => {
          const incorrectAnswers = Array.isArray(q.incorrect_answers) 
            ? q.incorrect_answers 
            : JSON.parse(q.incorrect_answers || '[]');
          
          return {
            question: q.question_text,
            correct_answer: q.correct_answer,
            incorrect_answers: incorrectAnswers,
            difficulty: q.difficulty as "easy" | "medium" | "hard",
            allAnswers: shuffleArray([q.correct_answer, ...incorrectAnswers]),
          };
        });

        setQuestions(processedQuestions);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("მოულოდნელი შეცდომა მოხდა. გთხოვთ სცადოთ თავიდან.");
      } finally {
        setLoading(false);
      }
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
    
    const result = await updateLevelProgress(categoryId, levelNumber, score, questions.length);
    
    if (result.success) {
      setSavedStars(result.stars);
      const earned = score * 10 + result.stars * 20;
      setPointsEarned(earned);
      
      // Store unlock info for animation on category page
      if (result.unlockedLevel) {
        sessionStorage.setItem(
          `level_unlocked_${categoryId}`,
          JSON.stringify({
            unlockedLevel: result.unlockedLevel,
            timestamp: Date.now(),
          })
        );
      }
      
      // Big confetti burst for passing (unlocks next level)
      if (result.stars >= 1) {
        // First burst
        confetti({
          particleCount: 150,
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
        
        toast.success("🎉 დონე გავლილია! შემდეგი დონე გახსნილია!", {
          description: `+${earned} ქულა მიღებულია!`,
        });
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
      setTimeRemaining(15);
    } else {
      setShowResults(true);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const stars = Math.min(3, Math.floor((score / questions.length) * 4));

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
          className="text-center"
        >
          <div className="text-6xl mb-4">
            {score === questions.length ? "🏆" : score >= questions.length / 2 ? "🎉" : "💪"}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {score === questions.length ? "იდეალური!" : score >= questions.length / 2 ? "შესანიშნავია!" : "გააგრძელე ვარჯიში!"}
          </h2>
          <p className="text-muted-foreground mb-2">
            სწორი პასუხი: {score} / {questions.length}
          </p>
          
          {/* Points earned */}
          {pointsEarned > 0 && (
            <motion.p 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-lg font-bold text-primary mb-2"
            >
              +{pointsEarned} ქულა!
            </motion.p>
          )}
          
          {/* Level unlocked message */}
          {passed && !isSaving && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-4"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-success/20 text-success px-4 py-2 font-semibold">
                🔓 შემდეგი დონე გახსნილია!
              </span>
            </motion.div>
          )}
          
          {/* Stars */}
          <div className="flex justify-center gap-2 mb-6">
            {[...Array(3)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.2 }}
                className={`text-4xl ${i < displayStars ? "" : "opacity-30"}`}
              >
                ⭐
              </motion.span>
            ))}
          </div>

          {isSaving && (
            <p className="text-sm text-muted-foreground mb-4">პროგრესის შენახვა...</p>
          )}

          <div className="space-y-3">
            <ChunkyButton 
              onClick={() => navigate(`/category/${categoryId}`)}
              disabled={isSaving}
            >
              გაგრძელება
            </ChunkyButton>
            <ChunkyButton 
              variant="ghost" 
              disabled={isSaving}
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

  // Answer letter labels
  const answerLabels = ["A", "B", "C", "D"];
  const progressPercent = ((currentQuestionIndex + (isAnswered ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-[#7E7BDC]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-1 bg-white/10 px-4 py-2 rounded-full">
          <span className="text-white font-bold text-lg">{currentQuestionIndex + 1}</span>
          <span className="text-white/60 font-medium">/</span>
          <span className="text-white/60 font-bold text-lg">{questions.length}</span>
        </div>

        <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full">
          <Clock className={`w-4 h-4 ${timeRemaining <= 5 ? "text-red-400" : "text-white"}`} />
          <span className={`font-bold ${timeRemaining <= 5 ? "text-red-400" : "text-white"}`}>
            {timeRemaining}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-6 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col"
          >
            {/* Question Card */}
            <div 
              className="rounded-3xl overflow-hidden mb-4"
              style={{
                backgroundColor: "#6B5FA8",
                boxShadow: "0 6px 0 #4A4080",
              }}
            >
              {/* Progress bar */}
              <div className="h-2 bg-white/20 w-full">
                <motion.div
                  className="h-full rounded-r-full"
                  style={{
                    background: "linear-gradient(90deg, #F5A623 0%, #F7C948 100%)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              <div className="px-5 py-5">
                <p className="text-center font-semibold leading-relaxed text-white text-lg">
                  {currentQuestion?.question}
                </p>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-4">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index < currentQuestionIndex
                      ? "bg-white"
                      : index === currentQuestionIndex
                      ? "bg-white scale-125"
                      : "bg-white/40"
                  }`}
                />
              ))}
            </div>

            {/* Answer Buttons */}
            <div className="space-y-2 flex-1">
              {currentQuestion?.allAnswers?.map((answer, index) => {
                const isCorrect = answer === currentQuestion.correct_answer;
                const isSelected = answer === selectedAnswer;
                
                let bgColor = "#FFFFFF";
                let depthColor = "#CBD5E1";
                let textColor = "#2A2550";
                let labelBg = "#7DD3FC";
                let labelText = "#FFFFFF";
                
                if (isAnswered) {
                  if (isCorrect) {
                    bgColor = "#4ADE80";
                    depthColor = "#22C55E";
                    textColor = "#FFFFFF";
                    labelBg = "#FFFFFF";
                    labelText = "#22C55E";
                  } else if (isSelected) {
                    bgColor = "#EF4444";
                    depthColor = "#DC2626";
                    textColor = "#FFFFFF";
                    labelBg = "#FFFFFF";
                    labelText = "#EF4444";
                  }
                }

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(answer)}
                    disabled={isAnswered}
                    className="w-full rounded-2xl text-left font-bold text-lg disabled:cursor-not-allowed relative"
                    style={{ marginBottom: 4 }}
                    whileHover={!isAnswered ? { scale: 1.01 } : undefined}
                    whileTap={!isAnswered ? { scale: 0.99 } : undefined}
                  >
                    {/* Depth layer */}
                    <div
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: depthColor, transform: "translateY(4px)" }}
                    />
                    
                    {/* Main face */}
                    <div
                      className="relative flex items-center min-h-[56px] py-3 rounded-2xl"
                      style={{ background: bgColor }}
                    >
                      <div
                        className="flex items-center justify-center w-9 h-9 ml-3 rounded-xl font-bold text-base"
                        style={{ background: labelBg, color: labelText }}
                      >
                        {isAnswered && isCorrect ? (
                          <Check className="w-5 h-5" />
                        ) : isAnswered && isSelected && !isCorrect ? (
                          <X className="w-5 h-5" />
                        ) : (
                          answerLabels[index]
                        )}
                      </div>
                      <span className="flex-1 px-3" style={{ color: textColor }}>
                        {answer}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Next Button */}
            {isAnswered && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleNextQuestion}
                className="mt-4 w-full rounded-2xl font-bold text-lg relative"
                style={{ marginBottom: 4 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: "#22C55E", transform: "translateY(4px)" }}
                />
                <div
                  className="relative flex items-center justify-center min-h-[56px] py-3 rounded-2xl text-white"
                  style={{ background: "#4ADE80" }}
                >
                  {currentQuestionIndex < questions.length - 1 ? "შემდეგი" : "შედეგები"}
                </div>
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Safe area bottom padding */}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
