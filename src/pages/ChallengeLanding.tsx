import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Loader2, Play, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const ANSWER_LABELS = ["ა", "ბ", "გ", "დ"];
const TIME_PER_QUESTION = 15;

interface ChallengeData {
  id: string;
  code: string;
  challenger_nickname: string;
  challenger_avatar_url: string | null;
  challenger_score: number;
  total_questions: number;
  category_name: string | null;
  category_icon_slug: string | null;
  questions: Array<{
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    icon_slug?: string | null;
  }>;
}

type Phase = "landing" | "playing" | "results";

function shuffleAnswers(correct: string, incorrect: string[]): string[] {
  const all = [correct, ...incorrect];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

export default function ChallengeLanding() {
  const { code } = useParams<{ code: string }>();
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("landing");
  const [playerName, setPlayerName] = useState("");

  // Game state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerStates, setAnswerStates] = useState<Record<string, QuizAnswerState>>({});
  const [timeRemaining, setTimeRemaining] = useState(TIME_PER_QUESTION);
  const [isAnswered, setIsAnswered] = useState(false);

  // Pre-shuffle answers
  const [shuffledAnswers, setShuffledAnswers] = useState<string[][]>([]);

  // Results state
  const [attemptSaved, setAttemptSaved] = useState(false);

  // Fetch challenge data
  useEffect(() => {
    if (!code) return;
    const fetchChallenge = async () => {
      const { data, error: fetchError } = await supabase
        .from("challenge_links")
        .select("*")
        .eq("code", code)
        .single();

      if (fetchError || !data) {
        setError("ჩელენჯი ვერ მოიძებნა");
        setLoading(false);
        return;
      }

      const questions = (data.questions as any[]) || [];
      setChallenge({
        ...data,
        questions,
      } as ChallengeData);

      const shuffled = questions.map((q) =>
        shuffleAnswers(q.correct_answer, q.incorrect_answers as string[])
      );
      setShuffledAnswers(shuffled);
      setLoading(false);
    };
    fetchChallenge();
  }, [code]);

  const currentQuestion = challenge?.questions[currentIndex];
  const currentAnswers = shuffledAnswers[currentIndex] || [];

  // Timer
  useEffect(() => {
    if (phase !== "playing" || isAnswered) return;
    if (timeRemaining <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setTimeout(() => setTimeRemaining((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeRemaining, isAnswered]);

  const handleTimeUp = useCallback(() => {
    if (!currentQuestion || isAnswered) return;
    setIsAnswered(true);
    const states: Record<string, QuizAnswerState> = {};
    currentAnswers.forEach((a) => {
      states[a] = a === currentQuestion.correct_answer ? "correct" : "disabled";
    });
    setAnswerStates(states);
    setTimeout(goNext, 1500);
  }, [currentQuestion, currentAnswers, isAnswered]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (isAnswered || !currentQuestion) return;
      setIsAnswered(true);
      setSelectedAnswer(answer);

      const isCorrect = answer === currentQuestion.correct_answer;
      if (isCorrect) {
        setPlayerScore((s) => s + 1);
        setCorrectCount((c) => c + 1);
      }

      const states: Record<string, QuizAnswerState> = {};
      currentAnswers.forEach((a) => {
        if (a === currentQuestion.correct_answer) {
          states[a] = "correct";
        } else if (a === answer && !isCorrect) {
          states[a] = "wrong";
        } else {
          states[a] = "disabled";
        }
      });
      setAnswerStates(states);

      setTimeout(goNext, 1500);
    },
    [isAnswered, currentQuestion, currentAnswers]
  );

  const goNext = useCallback(() => {
    if (!challenge) return;
    if (currentIndex + 1 >= challenge.questions.length) {
      setPhase("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setAnswerStates({});
      setTimeRemaining(TIME_PER_QUESTION);
      setIsAnswered(false);
    }
  }, [challenge, currentIndex]);

  const handleStart = () => {
    if (!playerName.trim()) {
      toast.error("გთხოვთ შეიყვანოთ სახელი");
      return;
    }
    setPhase("playing");
    setTimeRemaining(TIME_PER_QUESTION);
  };

  // Save attempt on results
  useEffect(() => {
    if (phase !== "results" || attemptSaved || !challenge) return;
    setAttemptSaved(true);

    const won = playerScore > challenge.challenger_score;
    if (won) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    }

    supabase
      .from("challenge_attempts")
      .insert({
        challenge_link_id: challenge.id,
        player_name: playerName.trim(),
        player_score: playerScore,
      })
      .then(({ error }) => {
        if (error) console.error("Failed to save attempt:", error);
      });
  }, [phase, attemptSaved, challenge, playerName, playerScore]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground mb-2">😔 ჩელენჯი ვერ მოიძებნა</p>
          <p className="text-muted-foreground">ბმული არასწორია ან ვადაგასულია</p>
        </div>
      </div>
    );
  }

  // ============ LANDING PHASE ============
  if (phase === "landing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Challenger info */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto">
              <SafeAvatar
                avatarUrl={challenge.challenger_avatar_url}
                fallback={challenge.challenger_nickname.charAt(0)}
                className="w-20 h-20"
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {challenge.challenger_nickname}
            </h1>
            <p className="text-muted-foreground">გიწვევს ჩელენჯში!</p>
          </div>

          {/* Score to beat */}
          <div className="text-center p-5 rounded-2xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">დასამარცხებელი შედეგი</p>
            <p className="text-4xl font-bold text-primary">
              {challenge.challenger_score} ქულა
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ({challenge.total_questions} კითხვა)
            </p>
            {challenge.category_name && (
              <p className="text-sm text-muted-foreground mt-2">{challenge.category_name}</p>
            )}
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <Input
              placeholder="შეიყვანე სახელი"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="text-center text-lg h-12"
              maxLength={20}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
          </div>

          {/* Start button */}
          <ChunkyButton
            variant="primary"
            size="xl"
            className="w-full"
            onClick={handleStart}
            disabled={!playerName.trim()}
            icon={<Play className="w-5 h-5" />}
          >
            დაწყება
          </ChunkyButton>
        </motion.div>
      </div>
    );
  }

  // ============ PLAYING PHASE ============
  if (phase === "playing" && currentQuestion) {
    const progressPercent = (timeRemaining / TIME_PER_QUESTION) * 100;

    return (
      <div className="min-h-screen flex flex-col p-4 pt-8 bg-background">
        {/* Progress info */}
        <div className="text-center mb-4">
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {challenge.questions.length}
          </span>
        </div>

        {/* Question */}
        <div className="flex-shrink-0">
          <QuizQuestionCard
            questionText={currentQuestion.question_text}
            progressPercent={progressPercent}
            timerSeconds={timeRemaining}
            timerMaxSeconds={TIME_PER_QUESTION}
          />
        </div>

        {/* Answers */}
        <div className="flex-1 flex flex-col justify-center gap-3 mt-4">
          {currentAnswers.map((answer, index) => (
            <motion.div
              key={`${currentIndex}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <QuizAnswerButton
                label={ANSWER_LABELS[index]}
                text={answer}
                state={answerStates[answer] || "default"}
                onClick={() => handleAnswer(answer)}
                disabled={isAnswered}
              />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // ============ RESULTS PHASE ============
  if (phase === "results") {
    const won = playerScore > challenge.challenger_score;
    const tied = playerScore === challenge.challenger_score;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Result header */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="text-5xl mb-3"
            >
              {won ? "🏆" : tied ? "🤝" : "😤"}
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">
              {won ? "გაიმარჯვე!" : tied ? "ფრე!" : "ვერ დაამარცხე!"}
            </h1>
          </div>

          {/* Side by side scores */}
          <div className="grid grid-cols-2 gap-3">
            {/* Player (you) */}
            <div className={`p-4 rounded-xl text-center border ${won ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}>
              <p className="text-sm text-muted-foreground mb-1 truncate">{playerName}</p>
              <p className={`text-3xl font-bold ${won ? "text-primary" : "text-foreground"}`}>
                {playerScore}
              </p>
              <p className="text-xs text-muted-foreground">/{challenge.total_questions}</p>
            </div>

            {/* Challenger */}
            <div className={`p-4 rounded-xl text-center border ${!won && !tied ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}>
              <p className="text-sm text-muted-foreground mb-1 truncate">{challenge.challenger_nickname}</p>
              <p className={`text-3xl font-bold ${!won && !tied ? "text-primary" : "text-foreground"}`}>
                {challenge.challenger_score}
              </p>
              <p className="text-xs text-muted-foreground">/{challenge.total_questions}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-3 pt-2">
            <ChunkyButton
              variant="primary"
              size="xl"
              className="w-full"
              onClick={() => window.location.href = "/auth"}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              გაწევრიანდი უფასოდ
            </ChunkyButton>
            <p className="text-center text-xs text-muted-foreground">
              დარეგისტრირდი რომ შეინახო შედეგი და გამოწვიო მეგობრები
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
