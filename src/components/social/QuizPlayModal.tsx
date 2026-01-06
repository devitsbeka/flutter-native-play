import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, RotateCcw, Share2 } from "lucide-react";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Button } from "@/components/ui/button";
import { SamplePost } from "@/data/samplePosts";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface QuizPlayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: SamplePost | null;
}

export function QuizPlayModal({ open, onOpenChange, post }: QuizPlayModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [results, setResults] = useState<("correct" | "wrong" | null)[]>([]);

  const questions = post?.questions || [];
  const currentQuestion = questions[currentIndex];

  const shuffleAnswers = useCallback((question: Question) => {
    const allAnswers = [question.correct_answer, ...question.incorrect_answers];
    return allAnswers.sort(() => Math.random() - 0.5);
  }, []);

  useEffect(() => {
    if (open && currentQuestion) {
      setShuffledAnswers(shuffleAnswers(currentQuestion));
      setTimeLeft(15);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  }, [open, currentIndex, currentQuestion, shuffleAnswers]);

  useEffect(() => {
    if (!open || showResult || gameComplete) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, showResult, gameComplete, currentIndex]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === currentQuestion?.correct_answer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    
    setResults(prev => [...prev, isCorrect ? "correct" : "wrong"]);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setGameComplete(true);
        // Trigger confetti on game complete
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }, 1500);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameComplete(false);
    setTimeLeft(15);
    setResults([]);
  };

  const handleClose = () => {
    resetGame();
    onOpenChange(false);
  };

  const handleShare = async () => {
    const text = `მივიღე ${score}/${questions.length} "${post?.title}" Trivia-ში! 🎮`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied!");
    }
  };

  const getAnswerState = (answer: string): QuizAnswerState => {
    if (!showResult) return "default";
    
    if (answer === currentQuestion?.correct_answer) {
      return "correct";
    }
    
    if (answer === selectedAnswer && answer !== currentQuestion?.correct_answer) {
      return "wrong";
    }
    
    return "disabled";
  };

  const answerLabels = ['A', 'B', 'C', 'D'];

  if (!post) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#7E7BDC]"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }} />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-4 py-4 safe-top">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
                <img 
                  src={post.avatarUrl} 
                  alt={post.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{post.title}</p>
                <p className="text-white/70 text-xs">@{post.username}</p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Score display */}
          {!gameComplete && (
            <div className="relative z-10 flex justify-center mb-4">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">{score}</span>
                <span className="text-white/70 text-sm"> ქულა</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-col h-[calc(100vh-160px)] px-4">
            <AnimatePresence mode="wait">
              {gameComplete ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex-1 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-24 h-24 mb-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Trophy className="w-12 h-12 text-yellow-300" />
                  </div>
                  
                  <h3 className="text-3xl font-bold text-white mb-2">თამაში დასრულდა!</h3>
                  
                  <p className="text-6xl font-bold text-white mb-4">
                    {score}/{questions.length}
                  </p>
                  
                  <p className="text-white/80 text-lg mb-8">
                    {score === questions.length
                      ? "პერფექტული! 🎉"
                      : score >= questions.length * 0.7
                      ? "შესანიშნავი! 👏"
                      : score >= questions.length * 0.5
                      ? "კარგი შედეგი! 👍"
                      : "სცადე ხელახლა! 💪"}
                  </p>
                  
                  <div className="flex gap-3 w-full max-w-sm">
                    <Button 
                      variant="outline" 
                      onClick={resetGame} 
                      className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      თავიდან
                    </Button>
                    <ChunkyButton onClick={handleShare} className="flex-1">
                      <Share2 className="w-4 h-4 mr-2" />
                      გაზიარება
                    </ChunkyButton>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Question Card */}
                  <QuizQuestionCard
                    questionText={currentQuestion?.question || ""}
                    questionNumber={currentIndex + 1}
                    totalQuestions={questions.length}
                    timerSeconds={timeLeft}
                    timerMaxSeconds={15}
                    progressPercent={((currentIndex) / questions.length) * 100}
                    state="default"
                    className="mb-4"
                  />

                  {/* Progress Dots */}
                  <QuizProgressDots
                    total={questions.length}
                    current={currentIndex}
                    results={results}
                    className="mb-6"
                  />

                  {/* Answer Buttons */}
                  <div className="space-y-3 flex-1">
                    {shuffledAnswers.map((answer, index) => (
                      <motion.div
                        key={answer}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <QuizAnswerButton
                          label={answerLabels[index]}
                          text={answer}
                          state={getAnswerState(answer)}
                          onClick={() => handleAnswer(answer)}
                          disabled={showResult}
                          showLabel={true}
                          className="w-full"
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}