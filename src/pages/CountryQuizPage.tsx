import { useState, useEffect, useCallback } from "react";
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

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!countryData || !category) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase.functions.invoke("generate-country-trivia", {
          body: {
            countryName: countryData.country.name,
            countryCode: countryCode,
            category: categoryId,
            categoryName: category.name,
            count: 5,
          },
        });

        if (fetchError) throw fetchError;

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
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError("Failed to load questions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [countryCode, categoryId, countryData, category]);

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

  // Quiz screen
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-purple px-6 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(`/country/${countryCode}`)}
            className="p-2 rounded-full bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-primary-foreground/70 text-sm">
              {country.emoji} {country.name}
            </p>
            <h1 className="text-lg font-bold text-primary-foreground">
              {category.emoji} {category.name}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-primary-foreground font-bold">{score} pts</p>
            <p className="text-primary-foreground/70 text-sm">
              {currentIndex + 1}/{questions.length}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 justify-center">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentIndex
                  ? "bg-primary-foreground w-4"
                  : i < currentIndex
                  ? "bg-primary-foreground/70"
                  : "bg-primary-foreground/30"
              )}
            />
          ))}
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 p-6 flex flex-col">
        {/* Timer / Result indicator */}
        <div className="flex justify-center mb-6">
          {selectedAnswer === null ? (
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold",
              timeRemaining <= 5 ? "bg-destructive text-destructive-foreground" : "bg-secondary text-foreground"
            )}>
              {timeRemaining}
            </div>
          ) : (
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              isCorrect ? "bg-success" : "bg-destructive"
            )}>
              {isCorrect ? (
                <Check className="w-8 h-8 text-success-foreground" />
              ) : (
                <X className="w-8 h-8 text-destructive-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Question */}
        <h2 className="text-xl font-bold text-foreground text-center mb-8">
          {currentQuestion?.question}
        </h2>

        {/* Answers */}
        <div className="space-y-3 flex-1">
          {currentQuestion?.allAnswers?.map((answer, i) => {
            const isSelected = selectedAnswer === answer;
            const isCorrectAnswer = answer === currentQuestion.correct_answer;
            const showResult = selectedAnswer !== null;

            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleAnswer(answer)}
                disabled={selectedAnswer !== null}
                className={cn(
                  "w-full p-4 rounded-2xl border-2 text-left font-medium transition-all",
                  showResult
                    ? isCorrectAnswer
                      ? "bg-success/20 border-success text-foreground"
                      : isSelected
                      ? "bg-destructive/20 border-destructive text-foreground"
                      : "bg-card border-border text-muted-foreground"
                    : "bg-card border-border hover:border-primary text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{answer}</span>
                  {showResult && isCorrectAnswer && (
                    <Check className="w-5 h-5 text-success" />
                  )}
                  {showResult && isSelected && !isCorrectAnswer && (
                    <X className="w-5 h-5 text-destructive" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Next Button */}
        <AnimatePresence>
          {selectedAnswer !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6"
            >
              <ChunkyButton onClick={handleNext} className="w-full">
                {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
              </ChunkyButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
