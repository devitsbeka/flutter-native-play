import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, RotateCcw, Share2, Check, XIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Progress } from "@/components/ui/progress";
import { SamplePost } from "@/data/samplePosts";

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

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setGameComplete(true);
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
    }
  };

  const getAnswerStyle = (answer: string) => {
    if (!showResult) {
      return "bg-card border-border hover:border-primary hover:bg-primary/5";
    }

    if (answer === currentQuestion?.correct_answer) {
      return "bg-green-500/20 border-green-500 text-green-700";
    }

    if (answer === selectedAnswer && answer !== currentQuestion?.correct_answer) {
      return "bg-red-500/20 border-red-500 text-red-700";
    }

    return "bg-muted border-border opacity-50";
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-background">
        {/* Header */}
        <div className={`p-4 bg-gradient-to-r ${post.coverGradient}`}>
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h3 className="font-bold text-lg">{post.title}</h3>
              <p className="text-white/80 text-sm">@{post.username}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {!gameComplete && (
            <div className="mt-4">
              <div className="flex justify-between text-white/80 text-sm mb-2">
                <span>კითხვა {currentIndex + 1}/{questions.length}</span>
                <span>{timeLeft}s</span>
              </div>
              <Progress value={(currentIndex / questions.length) * 100} className="h-2 bg-white/20" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {gameComplete ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">თამაში დასრულდა!</h3>
                <p className="text-4xl font-bold text-primary mb-6">
                  {score}/{questions.length}
                </p>
                <p className="text-muted-foreground mb-8">
                  {score === questions.length
                    ? "პერფექტული! 🎉"
                    : score >= questions.length * 0.7
                    ? "შესანიშნავი! 👏"
                    : score >= questions.length * 0.5
                    ? "კარგი შედეგი! 👍"
                    : "სცადე ხელახლა! 💪"}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetGame} className="flex-1">
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
                className="space-y-4"
              >
                <h4 className="text-lg font-semibold text-foreground text-center leading-relaxed">
                  {currentQuestion?.question}
                </h4>

                <div className="space-y-3 mt-6">
                  {shuffledAnswers.map((answer, index) => (
                    <motion.button
                      key={answer}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleAnswer(answer)}
                      disabled={showResult}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${getAnswerStyle(answer)}`}
                    >
                      <span className="font-medium">{answer}</span>
                      {showResult && answer === currentQuestion?.correct_answer && (
                        <Check className="w-5 h-5 text-green-600" />
                      )}
                      {showResult && answer === selectedAnswer && answer !== currentQuestion?.correct_answer && (
                        <XIcon className="w-5 h-5 text-red-600" />
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="text-center text-sm text-muted-foreground mt-4">
                  ქულა: {score}/{currentIndex}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
