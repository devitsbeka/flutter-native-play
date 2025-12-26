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

  // Fetch questions
  useEffect(() => {
    if (hasFetched.current) return;
    if (!categoryId || !category) return;

    hasFetched.current = true;
    setLoading(true);
    setError(null);

    const fetchQuestions = async () => {
      try {
        const { data, error: fetchError } = await supabase.functions.invoke("generate-category-trivia", {
          body: {
            category: category.name,
            categoryId: categoryId,
            level: parseInt(levelId || "1"),
            count: 5,
          },
        });

        if (fetchError) {
          const errorMessage = fetchError.message || "";
          if (errorMessage.includes("429") || errorMessage.includes("Rate limit")) {
            setError("ძალიან ბევრი მოთხოვნა. გთხოვთ მოიცადოთ და სცადოთ თავიდან.");
          } else {
            setError("კითხვების ჩატვირთვა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.");
          }
          return;
        }

        if (data?.error) {
          setError(data.error);
          return;
        }

        if (!data?.questions || !Array.isArray(data.questions)) {
          setError("კითხვები ვერ მიიღო. გთხოვთ სცადოთ თავიდან.");
          return;
        }

        const processedQuestions = data.questions.map((q: TriviaQuestion) => ({
          ...q,
          allAnswers: shuffleArray([q.correct_answer, ...q.incorrect_answers]),
        }));

        setQuestions(processedQuestions);
      } catch (err) {
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

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, hsl(168 45% 55%) 0%, hsl(168 40% 45%) 100%)"
      }}
    >
      {/* Header with Players */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-center gap-6">
          {/* Player (You) */}
          <div className="text-center">
            <div 
              className="w-20 h-20 rounded-full border-4 border-sky-400 overflow-hidden bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center text-3xl"
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="You" className="w-full h-full object-cover" />
              ) : (
                "👤"
              )}
            </div>
            <p className="mt-2 font-bold text-white text-sm drop-shadow-md">
              {profile?.nickname || "მოთამაშე"}
            </p>
          </div>

          {/* VS */}
          <span className="text-white/80 font-semibold text-lg">vs</span>

          {/* Opponent (AI) */}
          <div className="text-center">
            <div 
              className="w-20 h-20 rounded-full border-4 border-sky-400 overflow-hidden bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center text-3xl"
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
            >
              🤖
            </div>
            <p className="mt-2 font-bold text-white text-sm drop-shadow-md">
              AI ოპონენტი
            </p>
          </div>
        </div>

        {/* Timer badge - small, positioned below */}
        <div className="flex justify-center mt-3">
          <div 
            className={`rounded-full px-4 py-1 text-sm font-bold ${
              timeRemaining <= 5 
                ? "bg-red-500 text-white animate-pulse" 
                : "bg-white/20 text-white"
            }`}
          >
            {timeRemaining}წმ
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 px-5 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full flex flex-col"
          >
            {/* Question Number Badge + Card */}
            <div className="relative mb-6">
              {/* Question Number */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <div 
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-lg text-teal-600 border-4 border-teal-300"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                >
                  {currentQuestionIndex + 1}
                </div>
              </div>

              {/* Question Card */}
              <div 
                className="rounded-3xl bg-white/95 p-6 pt-8 border-4 border-teal-300/50"
                style={{ boxShadow: "0 8px 0 0 hsl(168 40% 35%)" }}
              >
                <h2 className="text-lg font-bold text-teal-700 text-center leading-relaxed">
                  {currentQuestion?.question}
                </h2>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
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
            <div className="space-y-3 flex-1">
              {currentQuestion?.allAnswers?.map((answer, index) => {
                const isCorrect = answer === currentQuestion.correct_answer;
                const isSelected = answer === selectedAnswer;
                
                let bgColor = "bg-white";
                let borderColor = "border-sky-400";
                let textColor = "text-sky-600";
                let shadowColor = "hsl(200 80% 50%)";
                
                if (isAnswered) {
                  if (isCorrect) {
                    bgColor = "bg-emerald-100";
                    borderColor = "border-emerald-500";
                    textColor = "text-emerald-700";
                    shadowColor = "hsl(152 70% 35%)";
                  } else if (isSelected) {
                    bgColor = "bg-red-100";
                    borderColor = "border-red-500";
                    textColor = "text-red-700";
                    shadowColor = "hsl(0 70% 45%)";
                  }
                }

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(answer)}
                    disabled={isAnswered}
                    className={`w-full rounded-full py-4 px-5 text-left font-semibold transition-all ${bgColor} border-4 ${borderColor}`}
                    style={{ boxShadow: `0 4px 0 0 ${shadowColor}` }}
                    whileHover={!isAnswered ? { scale: 1.02, y: -2 } : undefined}
                    whileTap={!isAnswered ? { scale: 0.98, y: 2 } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${textColor}`}>
                        {answerLabels[index]}:
                      </span>
                      <span className={textColor}>{answer}</span>
                      {isAnswered && isCorrect && (
                        <Check className="h-5 w-5 ml-auto text-emerald-600" />
                      )}
                      {isAnswered && isSelected && !isCorrect && (
                        <X className="h-5 w-5 ml-auto text-red-600" />
                      )}
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
                className="mt-6 w-full rounded-full py-4 px-6 bg-white border-4 border-sky-400 font-bold text-sky-600 text-lg uppercase tracking-wide"
                style={{ boxShadow: "0 4px 0 0 hsl(200 80% 50%)" }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98, y: 2 }}
              >
                {currentQuestionIndex < questions.length - 1 ? "შემდეგი" : "შედეგები"}
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
