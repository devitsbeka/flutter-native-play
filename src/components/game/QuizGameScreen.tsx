import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuizPlayerAvatar, QuizPlayerAvatarState } from "@/components/ui/quiz-player-avatar";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizCategoryIcon } from "@/components/ui/quiz-category-icon";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizPowerUpBar } from "@/components/ui/quiz-power-up-bar";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { PowerUpType } from "@/components/ui/quiz-power-up-button";
import categoryPlaceholder from "@/assets/placeholders/category-placeholder.webp";

interface Question {
  id: string;
  categoryImageUrl?: string;
  questionText: string;
  answers: string[];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard";
}

interface Player {
  id: string;
  avatarUrl: string;
  score: number;
  position: "left" | "right";
}

interface QuizGameScreenProps {
  questions?: Question[];
  players?: [Player, Player];
  onBack?: () => void;
  onGameEnd?: (results: { winner: Player; scores: Record<string, number> }) => void;
  className?: string;
}

const georgianLabels = ["ა", "ბ", "გ", "დ"];

const defaultQuestions: Question[] = [
  {
    id: "1",
    categoryImageUrl: categoryPlaceholder,
    questionText: "Who was the last pharaoh of Egypt, known for her beauty?",
    answers: ["Cleopatra", "Nefertiti", "Hatshepsut", "Nefertari"],
    correctIndex: 0,
    difficulty: "medium",
  },
  {
    id: "2",
    categoryImageUrl: categoryPlaceholder,
    questionText: "What is the largest planet in our solar system?",
    answers: ["Saturn", "Jupiter", "Neptune", "Uranus"],
    correctIndex: 1,
    difficulty: "easy",
  },
  {
    id: "3",
    categoryImageUrl: categoryPlaceholder,
    questionText: "Which country has the longest coastline?",
    answers: ["Russia", "Australia", "Canada", "Indonesia"],
    correctIndex: 2,
    difficulty: "hard",
  },
  {
    id: "4",
    categoryImageUrl: categoryPlaceholder,
    questionText: "What year did the Berlin Wall fall?",
    answers: ["1987", "1988", "1989", "1990"],
    correctIndex: 2,
    difficulty: "medium",
  },
  {
    id: "5",
    categoryImageUrl: categoryPlaceholder,
    questionText: "Who painted the Mona Lisa?",
    answers: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"],
    correctIndex: 2,
    difficulty: "easy",
  },
  {
    id: "6",
    categoryImageUrl: categoryPlaceholder,
    questionText: "What is the chemical symbol for gold?",
    answers: ["Go", "Gd", "Au", "Ag"],
    correctIndex: 2,
    difficulty: "medium",
  },
];

const defaultPlayers: [Player, Player] = [
  {
    id: "player1",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=player1",
    score: 0,
    position: "left",
  },
  {
    id: "player2",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=opponent",
    score: 0,
    position: "right",
  },
];

const QuizGameScreen = ({
  questions = defaultQuestions,
  players = defaultPlayers,
  onBack,
  onGameEnd,
  className,
}: QuizGameScreenProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [answerStates, setAnswerStates] = useState<QuizAnswerState[]>(["default", "default", "default", "default"]);
  const [playerStates, setPlayerStates] = useState<[QuizPlayerAvatarState, QuizPlayerAvatarState]>(["default", "default"]);
  const [playerScores, setPlayerScores] = useState([players[0].score, players[1].score]);
  const [results, setResults] = useState<("correct" | "wrong" | null)[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [powerUpCounts, setPowerUpCounts] = useState({
    "5050": 2,
    freeze: 1,
    replace: 3,
    hint: 4,
  });

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  // Timer countdown
  useEffect(() => {
    if (isAnswering || isLoading || gameEnded) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto wrong
          handleAnswer(-1);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, isAnswering, isLoading, gameEnded]);

  const handleAnswer = useCallback((selectedIndex: number) => {
    if (isAnswering || isLoading || gameEnded) return;
    
    const question = questions[currentQuestionIndex];
    if (!question) return;

    setIsAnswering(true);
    const isCorrect = selectedIndex === question.correctIndex;

    // Set loading state for selected answer
    if (selectedIndex >= 0) {
      setAnswerStates((prev) => {
        const newStates = [...prev] as QuizAnswerState[];
        newStates[selectedIndex] = "loading";
        return newStates;
      });
    }

    // Simulate checking answer
    setTimeout(() => {
      // Update answer button states
      setAnswerStates((prev) => {
        const newStates = prev.map((_, i) => {
          if (i === question.correctIndex) return "correct";
          if (i === selectedIndex && !isCorrect) return "wrong";
          return "default";
        }) as QuizAnswerState[];
        return newStates;
      });

      // Update player states and scores
      setPlayerStates(isCorrect ? ["correct", "default"] : ["wrong", "default"]);
      if (isCorrect) {
        const points = timeRemaining * 10;
        setPlayerScores((prev) => [prev[0] + points, prev[1]]);
      }

      // Simulate opponent answering (random)
      setTimeout(() => {
        const opponentCorrect = Math.random() > 0.4;
        setPlayerStates((prev) => [prev[0], opponentCorrect ? "correct" : "wrong"]);
        if (opponentCorrect) {
          const opponentPoints = Math.floor(Math.random() * 80) + 20;
          setPlayerScores((prev) => [prev[0], prev[1] + opponentPoints]);
        }
      }, 500);

      // Record result
      setResults((prev) => [...prev, isCorrect ? "correct" : "wrong"]);

      // Move to next question after delay
      setTimeout(() => {
        if (isLastQuestion) {
          setGameEnded(true);
          onGameEnd?.({
            winner: playerScores[0] > playerScores[1] ? players[0] : players[1],
            scores: { [players[0].id]: playerScores[0], [players[1].id]: playerScores[1] },
          });
        } else {
          setIsLoading(true);
          setTimeout(() => {
            setCurrentQuestionIndex((prev) => prev + 1);
            setAnswerStates(["default", "default", "default", "default"]);
            setPlayerStates(["default", "default"]);
            setTimeRemaining(10);
            setIsAnswering(false);
            setIsLoading(false);
          }, 500);
        }
      }, 1500);
    }, 800);
  }, [currentQuestion, isAnswering, isLoading, gameEnded, isLastQuestion, timeRemaining, playerScores, players, onGameEnd]);

  const handlePowerUp = (type: PowerUpType) => {
    const question = questions[currentQuestionIndex];
    if (powerUpCounts[type] <= 0 || isAnswering || !question) return;

    setPowerUpCounts((prev) => ({ ...prev, [type]: prev[type] - 1 }));

    switch (type) {
      case "5050":
        // Remove 2 wrong answers
        const wrongIndices = question.answers
          .map((_, i) => i)
          .filter((i) => i !== question.correctIndex);
        const toRemove = wrongIndices.slice(0, 2);
        setAnswerStates((prev) => {
          const newStates = [...prev] as QuizAnswerState[];
          toRemove.forEach((i) => (newStates[i] = "disabled"));
          return newStates;
        });
        break;
      case "freeze":
        // Pause timer (simplified - just add time)
        setTimeRemaining((prev) => Math.min(prev + 5, 15));
        break;
      case "hint":
        // Highlight correct answer briefly
        setAnswerStates((prev) => {
          const newStates = [...prev] as QuizAnswerState[];
          newStates[question.correctIndex] = "selected";
          return newStates;
        });
        setTimeout(() => {
          setAnswerStates(["default", "default", "default", "default"]);
        }, 1000);
        break;
      default:
        break;
    }
  };

  const resetGame = () => {
    setCurrentQuestionIndex(0);
    setTimeRemaining(10);
    setAnswerStates(["default", "default", "default", "default"]);
    setPlayerStates(["default", "default"]);
    setPlayerScores([0, 0]);
    setResults([]);
    setIsAnswering(false);
    setIsLoading(false);
    setGameEnded(false);
    setPowerUpCounts({ "5050": 2, freeze: 1, replace: 3, hint: 4 });
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-[#7E7ADB] flex flex-col relative overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-white/80" />
        </button>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center px-6 pb-4">
        {/* Players + Category Icon Row */}
        <div className="w-full flex items-center justify-between mb-4">
          {/* Left Player */}
          <QuizPlayerAvatar
            avatarUrl={players[0].avatarUrl}
            score={playerScores[0]}
            position="left"
            state={playerStates[0]}
          />

          {/* Category Icon */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`category-${currentQuestionIndex}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <QuizCategoryIcon
                imageUrl={currentQuestion?.categoryImageUrl || categoryPlaceholder}
                size={120}
                state={isLoading ? "loading" : "default"}
              />
            </motion.div>
          </AnimatePresence>

          {/* Right Player */}
          <QuizPlayerAvatar
            avatarUrl={players[1].avatarUrl}
            score={playerScores[1]}
            position="right"
            state={playerStates[1]}
          />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center mb-4"
          >
            <QuizQuestionCard
              questionText={currentQuestion?.questionText || ""}
              timeRemaining={timeRemaining}
              difficulty={currentQuestion?.difficulty || "medium"}
              state={isLoading ? "loading" : "default"}
            />
          </motion.div>
        </AnimatePresence>

        {/* Progress Dots */}
        <div className="mb-6">
          <QuizProgressDots
            total={questions.length}
            current={currentQuestionIndex}
            results={results}
          />
        </div>

        {/* Answer Buttons */}
        <div className="w-full max-w-md space-y-3 mb-6">
          <AnimatePresence mode="wait">
            {currentQuestion?.answers.map((answer, index) => (
              <motion.div
                key={`${currentQuestionIndex}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <QuizAnswerButton
                  state={answerStates[index]}
                  label={georgianLabels[index]}
                  text={answer}
                  onClick={() => handleAnswer(index)}
                  disabled={answerStates[index] === "disabled" || isAnswering}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Power-Up Bar */}
        <div className="mt-auto pb-4">
          <QuizPowerUpBar
            powerUps={[
              { type: "5050", count: powerUpCounts["5050"], state: isAnswering ? "disabled" : "default" },
              { type: "freeze", count: powerUpCounts.freeze, state: isAnswering ? "disabled" : "default" },
              { type: "replace", count: powerUpCounts.replace, state: isAnswering ? "disabled" : "default" },
              { type: "hint", count: powerUpCounts.hint, state: isAnswering ? "disabled" : "default" },
            ]}
            onPowerUpClick={handlePowerUp}
          />
        </div>
      </div>

      {/* Game End Overlay */}
      <AnimatePresence>
        {gameEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full mx-6 text-center"
            >
              <h2 className="text-2xl font-bold text-[#514F7F] mb-4">
                {playerScores[0] > playerScores[1] ? "🎉 You Win!" : playerScores[0] < playerScores[1] ? "😢 You Lose" : "🤝 It's a Tie!"}
              </h2>
              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <QuizPlayerAvatar
                    avatarUrl={players[0].avatarUrl}
                    score={playerScores[0]}
                    position="left"
                    state={playerScores[0] >= playerScores[1] ? "correct" : "wrong"}
                  />
                  <p className="text-sm text-[#514F7F] mt-2">You</p>
                </div>
                <div className="text-center">
                  <QuizPlayerAvatar
                    avatarUrl={players[1].avatarUrl}
                    score={playerScores[1]}
                    position="right"
                    state={playerScores[1] >= playerScores[0] ? "correct" : "wrong"}
                  />
                  <p className="text-sm text-[#514F7F] mt-2">Opponent</p>
                </div>
              </div>
              <button
                onClick={resetGame}
                className="w-full py-3 bg-[#7E7ADB] text-white font-bold rounded-xl hover:bg-[#6A66C4] transition-colors"
              >
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { QuizGameScreen };
