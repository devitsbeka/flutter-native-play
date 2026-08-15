import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { TimerBadge } from "@/components/game/TimerBadge";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Loader2, Play, ArrowRight, ArrowLeft } from "lucide-react";
import angryBoyIcon from "@/assets/icons/angry-boy.png";
import confettiPopperIcon from "@/assets/icons/confetti-popper.png";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { calculatePoints } from "@/utils/scoring";

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
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
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

  // Track answer history for progress dots
  const [answerHistory, setAnswerHistory] = useState<("correct" | "wrong" | null)[]>([]);

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

      // Fetch room code if challenge has a room_id
      if (data.room_id) {
        const { data: room } = await supabase
          .from("game_rooms")
          .select("room_code")
          .eq("id", data.room_id)
          .single();
        if (room) setRoomCode(room.room_code);
      }

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
    setAnswerHistory(prev => [...prev, "wrong"]);
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
        // Unified scoring policy — same value as rooms/solo/TV
        const earnedPoints = calculatePoints(true, timeRemaining);
        setPlayerScore((s) => s + earnedPoints);
        setCorrectCount((c) => c + 1);
      }
      setAnswerHistory(prev => [...prev, isCorrect ? "correct" : "wrong"]);

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
      .select("id")
      .single()
      .then(({ data: attemptData, error }) => {
        if (error) {
          console.error("Failed to save attempt:", error);
        } else if (attemptData) {
          // Store attempt info for post-registration linking
          localStorage.setItem("pending_challenge_link", JSON.stringify({
            attemptId: attemptData.id,
            challengeLinkId: challenge.id,
            playerScore,
            roomCode,
          }));
        }
      });
  }, [phase, attemptSaved, challenge, playerName, playerScore]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#7E7ADB]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#7E7ADB]">
        <div className="text-center">
          <p className="text-xl font-bold text-white mb-2">😔 ჩელენჯი ვერ მოიძებნა</p>
          <p className="text-white/60">ბმული არასწორია ან ვადაგასულია</p>
        </div>
      </div>
    );
  }

  // ============ LANDING PHASE ============
  if (phase === "landing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#7E7ADB]">
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
                className="w-20 h-20 border-2 border-white/30"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {challenge.challenger_nickname}
            </h1>
            <p className="text-white/70">გიწვევს ჩელენჯში!</p>
          </div>

          {/* Score to beat */}
          <div className="text-center p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <p className="text-sm text-white/60 mb-1">დასამარცხებელი შედეგი</p>
            <p className="text-4xl font-bold text-white">
              {challenge.challenger_score} ქულა
            </p>
            <p className="text-sm text-white/60 mt-1">
              ({challenge.total_questions} კითხვა)
            </p>
            {challenge.category_name && (
              <p className="text-sm text-white/60 mt-2">{challenge.category_name}</p>
            )}
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <Input
              placeholder="შეიყვანე სახელი"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="text-center text-lg h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
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
      <div className="w-full h-[100dvh] bg-[#7E7ADB] overflow-hidden">
        <div className="w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto">
          {/* Safe area padding */}
          <div className="pt-[env(safe-area-inset-top)]" />

          {/* Header: Back | Category | Timer */}
          <div className="flex items-center justify-between px-4 pt-3 py-1 mb-2 flex-shrink-0">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            
            <span className="text-white font-bold text-base truncate max-w-[160px] text-center">
              {challenge.category_name || "ჩელენჯი"}
            </span>
            
            <TimerBadge 
              seconds={timeRemaining} 
              maxSeconds={TIME_PER_QUESTION}
              compact
            />
          </div>

          {/* Question Card with Overlapping Icon.
              mt-3, not -mt-1: the icon hangs 16px above the card (-top-4), so
              a negative margin here pulled it up into the category name in the
              row above and the two nearly touched. */}
          <div className="px-4 flex-shrink-0 mt-3 mb-0 relative">
            {/* Category Icon overlapping card */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-4 z-20">
              <DynamicIcon 
                slug={currentQuestion.icon_slug || challenge.category_icon_slug || undefined}
                size={64}
                className="drop-shadow-lg"
                hideIfEmpty={true}
              />
            </div>

            <QuizQuestionCard
              questionText={currentQuestion.question_text}
              progressPercent={progressPercent}
              timerSeconds={timeRemaining}
              timerMaxSeconds={TIME_PER_QUESTION}
              reserveTopSpace={true}
            />
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center py-2 flex-shrink-0">
            <QuizProgressDots
              total={challenge.questions.length}
              current={currentIndex}
              results={answerHistory}
            />
          </div>

          {/* Answers */}
          <div className="flex-1 flex flex-col justify-start gap-3 px-4 overflow-y-auto">
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

          {/* Bottom safe area */}
          <div className="pb-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    );
  }

  // ============ RESULTS PHASE ============
  if (phase === "results") {
    const won = playerScore > challenge.challenger_score;
    const tied = playerScore === challenge.challenger_score;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#7E7ADB]">
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
              {won ? <img src={confettiPopperIcon} alt="Win" className="w-16 h-16 mx-auto" /> : tied ? "🤝" : <img src={angryBoyIcon} alt="Defeat" className="w-16 h-16 mx-auto" />}
            </motion.div>
            <h1 className="text-2xl font-bold text-white">
              {won ? "შენ მოიგე!" : tied ? "ფრე!" : "ამჯერად დამარცხდი!"}
            </h1>
          </div>

          {/* Side by side scores */}
          <div className="grid grid-cols-2 gap-3">
            {/* Player (you) */}
            <div className={`p-4 rounded-xl text-center border ${won ? "bg-white/20 border-white/30" : "bg-white/10 border-white/15"}`}>
              <p className="text-sm text-white/60 mb-1 truncate">{playerName}</p>
              <p className={`text-3xl font-bold ${won ? "text-white" : "text-white/80"}`}>
                {playerScore}
              </p>
              <p className="text-xs text-white/50">/{challenge.total_questions}</p>
            </div>

            {/* Challenger */}
            <div className={`p-4 rounded-xl text-center border ${!won && !tied ? "bg-white/20 border-white/30" : "bg-white/10 border-white/15"}`}>
              <p className="text-sm text-white/60 mb-1 truncate">{challenge.challenger_nickname}</p>
              <p className={`text-3xl font-bold ${!won && !tied ? "text-white" : "text-white/80"}`}>
                {challenge.challenger_score}
              </p>
              <p className="text-xs text-white/50">/{challenge.total_questions}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-3 pt-2">
            <ChunkyButton
              variant="primary"
              size="xl"
              className="w-full"
              onClick={() => {
                const returnTo = roomCode ? `/team?join=${roomCode}` : "/team";
                navigate(`/auth?mode=signup&returnTo=${encodeURIComponent(returnTo)}`);
              }}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              გაწევრიანდი უფასოდ
            </ChunkyButton>
            <p className="text-center text-xs text-white/50">
              დარეგისტრირდი რომ შეინახო შედეგი და გამოწვიო მეგობრები
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
