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
  const { user } = useAuth();
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
            setError("Too many requests. Please wait a moment and try again.");
          } else {
            setError("Failed to load questions. Please try again.");
          }
          return;
        }

        if (data?.error) {
          setError(data.error);
          return;
        }

        if (!data?.questions || !Array.isArray(data.questions)) {
          setError("No questions received. Please try again.");
          return;
        }

        const processedQuestions = data.questions.map((q: TriviaQuestion) => ({
          ...q,
          allAnswers: shuffleArray([q.correct_answer, ...q.incorrect_answers]),
        }));

        setQuestions(processedQuestions);
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
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
        
        toast.success("🎉 Level Complete! Next level unlocked!", {
          description: `+${earned} points earned!`,
        });
      } else {
        toast.info("Keep trying to unlock the next level!");
      }
    } else if (user) {
      toast.error("Failed to save progress. Please try again.");
    } else {
      // Not logged in - remind them
      toast.info("Sign in to save your progress!", {
        action: {
          label: "Sign In",
          onClick: () => navigate("/auth"),
        },
      });
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-4"
          >
            {category?.icon || "🎯"}
          </motion.div>
          <p className="text-muted-foreground">Generating questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Oops!</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <ChunkyButton onClick={() => navigate(-1)}>Go Back</ChunkyButton>
        </div>
      </div>
    );
  }

  if (showResults) {
    const displayStars = isSaving ? stars : savedStars || stars;
    const passed = displayStars >= 1;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">
            {score === questions.length ? "🏆" : score >= questions.length / 2 ? "🎉" : "💪"}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {score === questions.length ? "Perfect!" : score >= questions.length / 2 ? "Great job!" : "Keep practicing!"}
          </h2>
          <p className="text-muted-foreground mb-2">
            You got {score} out of {questions.length} correct
          </p>
          
          {/* Points earned */}
          {pointsEarned > 0 && (
            <motion.p 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-lg font-bold text-primary mb-2"
            >
              +{pointsEarned} points!
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
                🔓 Next Level Unlocked!
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
            <p className="text-sm text-muted-foreground mb-4">Saving progress...</p>
          )}

          <div className="space-y-3">
            <ChunkyButton 
              onClick={() => navigate(`/category/${categoryId}`)}
              disabled={isSaving}
            >
              Continue
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
              Play Again
            </ChunkyButton>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-xl">{category?.icon}</span>
          <span className="font-semibold text-foreground">{category?.name}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={`font-bold ${timeRemaining <= 5 ? "text-destructive" : "text-foreground"}`}>
            {timeRemaining}s
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 mb-6">
        <div className="flex gap-1.5">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-colors ${
                index < currentQuestionIndex
                  ? "bg-success"
                  : index === currentQuestionIndex
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
      </div>

      {/* Question */}
      <div className="px-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div 
              className="rounded-3xl bg-card p-6 mb-6"
              style={{ boxShadow: "0 6px 0 0 hsl(var(--border))" }}
            >
              <h2 className="text-xl font-bold text-foreground text-center">
                {currentQuestion?.question}
              </h2>
            </div>

            {/* Answers */}
            <div className="space-y-3">
              {currentQuestion?.allAnswers?.map((answer, index) => {
                const isCorrect = answer === currentQuestion.correct_answer;
                const isSelected = answer === selectedAnswer;
                
                let buttonStyle = "bg-card";
                let shadow = "0 4px 0 0 hsl(var(--border))";
                
                if (isAnswered) {
                  if (isCorrect) {
                    buttonStyle = "bg-success text-success-foreground";
                    shadow = "0 4px 0 0 hsl(142 60% 35%)";
                  } else if (isSelected) {
                    buttonStyle = "bg-destructive text-destructive-foreground";
                    shadow = "0 4px 0 0 hsl(0 70% 45%)";
                  }
                }

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(answer)}
                    disabled={isAnswered}
                    className={`w-full rounded-2xl p-4 text-left font-medium transition-all ${buttonStyle}`}
                    style={{ boxShadow: shadow }}
                    whileHover={!isAnswered ? { scale: 1.02 } : undefined}
                    whileTap={!isAnswered ? { scale: 0.98 } : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span>{answer}</span>
                      {isAnswered && (
                        isCorrect ? (
                          <Check className="h-5 w-5" />
                        ) : isSelected ? (
                          <X className="h-5 w-5" />
                        ) : null
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Continue Button */}
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <ChunkyButton
              size="lg"
              className="w-full"
              onClick={handleNextQuestion}
            >
              {currentQuestionIndex < questions.length - 1 ? "Continue" : "See Results"}
            </ChunkyButton>
          </motion.div>
        )}
      </div>
    </div>
  );
}
