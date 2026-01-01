import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Check, X } from "lucide-react";
import { getCountryByCode, getCategoryById } from "@/data/worldData";
import { useWorldProgress } from "@/hooks/useWorldProgress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import confetti from "canvas-confetti";

interface TriviaQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
  allAnswers?: string[];
}

export default function CountryQuizPage() {
  const { countryCode, categoryId } = useParams<{ countryCode: string; categoryId: string }>();
  const navigate = useNavigate();
  const { updateCategoryProgress, isCategoryCompleted } = useWorldProgress();

  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [showResults, setShowResults] = useState(false);
  
  // Prevent duplicate fetches
  const hasFetched = useRef(false);

  const countryData = getCountryByCode(countryCode || "");
  const category = getCategoryById(categoryId || "");

  // Shuffle answers helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch questions - only run once
  useEffect(() => {
    if (hasFetched.current) return;
    if (!countryCode || !categoryId) return;
    
    const countryInfo = getCountryByCode(countryCode);
    const categoryInfo = getCategoryById(categoryId);
    if (!countryInfo || !categoryInfo) return;

    hasFetched.current = true;
    setLoading(true);
    setError(null);

    const fetchQuestions = async () => {
      try {
        const { data, error: fetchError } = await supabase.functions.invoke("generate-country-trivia", {
          body: {
            countryName: countryInfo.country.name,
            countryCode: countryCode,
            category: categoryId,
            categoryName: categoryInfo.name,
            count: 5,
          },
        });

        if (fetchError) {
          // Check for rate limit or payment errors in the response
          if (fetchError.message?.includes("429") || fetchError.message?.includes("Rate limit")) {
            throw new Error("Too many requests. Please wait a moment and try again.");
          }
          if (fetchError.message?.includes("402") || fetchError.message?.includes("Payment")) {
            throw new Error("Service temporarily unavailable. Please try again later.");
          }
          throw fetchError;
        }

        // Handle error responses from edge function
        if (data?.error) {
          if (data.error.includes("Rate limit")) {
            throw new Error("Too many requests. Please wait a moment and try again.");
          }
          throw new Error(data.error);
        }

        if (data?.questions) {
          // Shuffle answers for each question
          const processedQuestions = data.questions.map((q: TriviaQuestion) => ({
            ...q,
            allAnswers: shuffleArray([q.correct_answer, ...q.incorrect_answers]),
          }));
          setQuestions(processedQuestions);
        } else {
          throw new Error("No questions returned");
        }
      } catch (err: any) {
        console.error("Error fetching questions:", err);
        setError(err?.message || "Failed to load questions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [countryCode, categoryId]);

  // Timer
  useEffect(() => {
    if (loading || showResults || selectedAnswer !== null) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto-submit wrong answer
          handleAnswer("");
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, showResults, selectedAnswer, currentIndex]);

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer !== null) return;

    const currentQuestion = questions[currentIndex];
    const correct = answer === currentQuestion.correct_answer;

    setSelectedAnswer(answer);
    setIsCorrect(correct);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
      setScore((prev) => prev + Math.round(100 * (timeRemaining / 15)));
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  }, [selectedAnswer, questions, currentIndex, timeRemaining]);

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setTimeRemaining(15);
    } else {
      // Quiz complete
      setShowResults(true);

      // Update progress
      const passed = correctCount >= 3; // Need 3/5 to pass
      await updateCategoryProgress(
        countryCode || "",
        categoryId || "",
        questions.length,
        correctCount + (isCorrect ? 1 : 0),
        passed
      );

      if (passed) {
        confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.5 },
        });
      }
    }
  };

  if (!countryData || !category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Quiz not found</p>
      </div>
    );
  }

  const { country } = countryData;
  const currentQuestion = questions[currentIndex];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-6xl animate-bounce">{category.emoji}</div>
        <p className="text-lg font-medium text-foreground">
          Generating {category.name} questions...
        </p>
        <p className="text-muted-foreground">
          About {country.name} {country.emoji}
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-destructive text-center">{error}</p>
        <ChunkyButton onClick={() => window.location.reload()}>
          Try Again
        </ChunkyButton>
        <button
          onClick={() => navigate(`/country/${countryCode}`)}
          className="text-muted-foreground underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Results screen
  if (showResults) {
    const passed = correctCount >= 3;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="gradient-purple px-6 pt-12 pb-8">
          <h1 className="text-2xl font-bold text-primary-foreground text-center">
            Quiz Complete!
          </h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-8xl">{passed ? "🎉" : "😢"}</div>
          
          <h2 className={cn(
            "text-3xl font-bold",
            passed ? "text-success" : "text-destructive"
          )}>
            {passed ? "Congratulations!" : "Keep Trying!"}
          </h2>

          <p className="text-lg text-muted-foreground text-center">
            You got {correctCount}/5 correct
            {passed && " and completed this category!"}
          </p>

          <div className="text-4xl font-bold text-primary">
            {score} pts
          </div>

          <div className="w-full max-w-xs space-y-3">
            {!passed && (
              <ChunkyButton
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </ChunkyButton>
            )}
            <ChunkyButton
              variant="secondary"
              onClick={() => navigate(`/country/${countryCode}`)}
              className="w-full"
            >
              Back to {country.name}
            </ChunkyButton>
          </div>
        </div>
      </div>
    );
  }

  // Answer letter labels
  const answerLabels = ["A", "B", "C", "D"];
  const progressPercent = ((currentIndex + (selectedAnswer !== null ? 1 : 0)) / questions.length) * 100;

  // Quiz screen
  return (
    <div className="min-h-screen flex flex-col bg-[#7E7BDC]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => navigate(`/country/${countryCode}`)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-white/70">{country.emoji}</span>
          <span className="text-white font-semibold">{category.name}</span>
        </div>

        <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full">
          <Clock className={`w-4 h-4 ${timeRemaining <= 5 ? "text-red-400" : "text-white"}`} />
          <span className={`font-bold ${timeRemaining <= 5 ? "text-red-400" : "text-white"}`}>
            {timeRemaining}
          </span>
        </div>
      </div>

      {/* Score and Progress */}
      <div className="flex items-center justify-between px-4 mb-2">
        <div className="text-white font-bold">{score} pts</div>
        <div className="text-white/70 text-sm">{currentIndex + 1}/{questions.length}</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-6 flex flex-col">
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
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                i < currentIndex
                  ? "bg-white"
                  : i === currentIndex
                  ? "bg-white scale-125"
                  : "bg-white/40"
              )}
            />
          ))}
        </div>

        {/* Answer Buttons */}
        <div className="space-y-2 flex-1">
          {currentQuestion?.allAnswers?.map((answer, i) => {
            const isSelected = selectedAnswer === answer;
            const isCorrectAnswer = answer === currentQuestion.correct_answer;
            const showResult = selectedAnswer !== null;

            let bgColor = "#FFFFFF";
            let depthColor = "#CBD5E1";
            let textColor = "#2A2550";
            let labelBg = "#7DD3FC";
            let labelText = "#FFFFFF";

            if (showResult) {
              if (isCorrectAnswer) {
                bgColor = "#4ADE80";
                depthColor = "#22C55E";
                textColor = "#FFFFFF";
                labelBg = "#FFFFFF";
                labelText = "#22C55E";
              } else if (isSelected && !isCorrectAnswer) {
                bgColor = "#EF4444";
                depthColor = "#DC2626";
                textColor = "#FFFFFF";
                labelBg = "#FFFFFF";
                labelText = "#EF4444";
              }
            }

            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleAnswer(answer)}
                disabled={selectedAnswer !== null}
                className="w-full rounded-2xl text-left font-bold text-lg disabled:cursor-not-allowed relative"
                style={{ marginBottom: 4 }}
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
                    {showResult && isCorrectAnswer ? (
                      <Check className="w-5 h-5" />
                    ) : showResult && isSelected && !isCorrectAnswer ? (
                      <X className="w-5 h-5" />
                    ) : (
                      answerLabels[i]
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
        <AnimatePresence>
          {selectedAnswer !== null && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={handleNext}
              className="mt-4 w-full rounded-2xl font-bold text-lg relative"
              style={{ marginBottom: 4 }}
            >
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ background: "#22C55E", transform: "translateY(4px)" }}
              />
              <div
                className="relative flex items-center justify-center min-h-[56px] py-3 rounded-2xl text-white"
                style={{ background: "#4ADE80" }}
              >
                {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Safe area bottom padding */}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
