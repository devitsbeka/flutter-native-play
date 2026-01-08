import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, RotateCcw, Share2, ChevronRight } from "lucide-react";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Button } from "@/components/ui/button";
import { SamplePost } from "@/data/samplePosts";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  icon_slug?: string;
}

interface QuizPlayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: SamplePost | null;
  collectionPosts?: SamplePost[];
}

export function QuizPlayModal({ open, onOpenChange, post, collectionPosts }: QuizPlayModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [results, setResults] = useState<("correct" | "wrong" | null)[]>([]);
  
  // Collection multi-round state
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [roundComplete, setRoundComplete] = useState(false);
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const [allRoundsComplete, setAllRoundsComplete] = useState(false);

  // Get current round's post
  const isCollection = collectionPosts && collectionPosts.length > 1;
  const currentRoundPost = isCollection ? collectionPosts[currentRoundIndex] : post;
  const totalRounds = isCollection ? collectionPosts.length : 1;
  
  const questions = currentRoundPost?.questions || [];
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
  }, [open, currentIndex, currentQuestion, shuffleAnswers, currentRoundIndex]);

  useEffect(() => {
    if (!open || showResult || gameComplete || roundComplete || allRoundsComplete) return;

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
  }, [open, showResult, gameComplete, roundComplete, allRoundsComplete, currentIndex, currentRoundIndex]);

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
        // Round complete
        const roundScore = score + (isCorrect ? 1 : 0);
        setCumulativeScore(prev => prev + roundScore);
        
        if (isCollection && currentRoundIndex < totalRounds - 1) {
          // More rounds to play
          setRoundComplete(true);
        } else {
          // All rounds complete
          setGameComplete(true);
          setAllRoundsComplete(true);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    }, 1500);
  };

  const startNextRound = () => {
    setCurrentRoundIndex(prev => prev + 1);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setRoundComplete(false);
    setGameComplete(false);
    setTimeLeft(15);
    setResults([]);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameComplete(false);
    setRoundComplete(false);
    setTimeLeft(15);
    setResults([]);
    setCurrentRoundIndex(0);
    setCumulativeScore(0);
    setAllRoundsComplete(false);
  };

  const handleClose = () => {
    resetGame();
    onOpenChange(false);
  };

  const handleFinishCollection = () => {
    // User wants to exit early - show final results
    setAllRoundsComplete(true);
    setGameComplete(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleShare = async () => {
    const totalQuestions = isCollection 
      ? collectionPosts.reduce((sum, p) => sum + p.questions.length, 0)
      : questions.length;
    const displayScore = isCollection ? cumulativeScore : score;
    const text = `მივიღე ${displayScore}/${totalQuestions} "${post?.title}" Trivia-ში! 🎮`;
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

  // Calculate total questions for collection
  const totalCollectionQuestions = isCollection 
    ? collectionPosts.reduce((sum, p) => sum + p.questions.length, 0)
    : questions.length;

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
                  src={currentRoundPost?.avatarUrl || post.avatarUrl} 
                  alt={currentRoundPost?.displayName || post.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{currentRoundPost?.title || post.title}</p>
                <p className="text-white/70 text-xs">
                  @{currentRoundPost?.username || post.username}
                  {isCollection && (
                    <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                      რაუნდი {currentRoundIndex + 1}/{totalRounds}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col h-[calc(100vh-160px)] px-4">
            <AnimatePresence mode="wait">
              {/* Round Complete Screen - Ask to continue */}
              {roundComplete && !allRoundsComplete ? (
                <motion.div
                  key="round-complete"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex-1 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-20 h-20 mb-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-yellow-300" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">
                    რაუნდი {currentRoundIndex + 1} დასრულდა!
                  </h3>
                  
                  <p className="text-4xl font-bold text-white mb-2">
                    {score}/{questions.length}
                  </p>
                  
                  <p className="text-white/70 text-sm mb-6">
                    ჯამური: {cumulativeScore}/{collectionPosts.slice(0, currentRoundIndex + 1).reduce((sum, p) => sum + p.questions.length, 0)}
                  </p>
                  
                  <p className="text-white/80 text-lg mb-8">
                    გაგრძელება შემდეგ რაუნდზე?
                  </p>
                  
                  <div className="flex flex-col gap-3 w-full max-w-sm">
                    <ChunkyButton onClick={startNextRound} className="w-full">
                      <ChevronRight className="w-4 h-4 mr-2" />
                      გაგრძელება ({currentRoundIndex + 2}/{totalRounds})
                    </ChunkyButton>
                    <Button 
                      variant="outline" 
                      onClick={handleFinishCollection} 
                      className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      დასრულება
                    </Button>
                  </div>
                </motion.div>
              ) : gameComplete || allRoundsComplete ? (
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
                  
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {isCollection ? "კოლექცია დასრულდა!" : "თამაში დასრულდა!"}
                  </h3>
                  
                  <p className="text-6xl font-bold text-white mb-4">
                    {isCollection ? cumulativeScore : score}/{totalCollectionQuestions}
                  </p>
                  
                  {isCollection && (
                    <p className="text-white/70 text-sm mb-4">
                      {currentRoundIndex + 1} რაუნდი სრულად
                    </p>
                  )}
                  
                  <p className="text-white/80 text-lg mb-8">
                    {(() => {
                      const finalScore = isCollection ? cumulativeScore : score;
                      const total = totalCollectionQuestions;
                      if (finalScore === total) return "პერფექტული! 🎉";
                      if (finalScore >= total * 0.7) return "შესანიშნავი! 👏";
                      if (finalScore >= total * 0.5) return "კარგი შედეგი! 👍";
                      return "სცადე ხელახლა! 💪";
                    })()}
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
                  key={`${currentRoundIndex}-${currentIndex}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Question Icon */}
                  {currentQuestion?.icon_slug && (
                    <div className="flex justify-center mb-4" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))' }}>
                      <DynamicIcon 
                        slug={currentQuestion.icon_slug}
                        size={84}
                        hideIfEmpty={true}
                      />
                    </div>
                  )}

                  {/* Question Card */}
                  <QuizQuestionCard
                    questionText={currentQuestion?.question || ""}
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