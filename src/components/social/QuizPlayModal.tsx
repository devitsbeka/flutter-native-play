import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Share2, ChevronRight, ChevronLeft, Coins, Star, Heart, Bookmark, Play } from "lucide-react";
import purpleHeartIcon from "@/assets/icons/purple-heart.webp";
import bookmarkIcon from "@/assets/icons/bookmark-3d.png";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { QuizTrueFalseButton, type QuizTrueFalseState } from "@/components/ui/quiz-true-false-button";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Button } from "@/components/ui/button";
import { SamplePost } from "@/data/samplePosts";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus } from "@/hooks/useVipStatus";
import { shuffleArray } from "@/utils/shuffle";
import { useAuth } from "@/contexts/AuthContext";
import { REWARDS } from "@/config/rewardConfig";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/hooks/useNotifications";
import trophyWinIcon from "@/assets/icons/trophy-win.png";
import { useLocation, useNavigate } from "react-router-dom";
import { calculateXP } from "@/utils/vipMultipliers";

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
  returnTo?: string;
}

export function QuizPlayModal({ open, onOpenChange, post, collectionPosts, returnTo }: QuizPlayModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { addCoins } = useCurrency();
  const { isVip } = useVipStatus();
  const { profile, updateProfile } = useAuth();
  const { userLikes, userSaves, toggleLike, toggleSave } = useSocialFeed();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const queryClient = useQueryClient();
  const [results, setResults] = useState<("correct" | "wrong" | null)[]>([]);
  
  // Collection multi-round state
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [roundComplete, setRoundComplete] = useState(false);
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const [allRoundsComplete, setAllRoundsComplete] = useState(false);
  
  // Reward tracking state
  const [roundEarnedXP, setRoundEarnedXP] = useState(0);
  const [roundEarnedCoins, setRoundEarnedCoins] = useState(0);
  const [totalEarnedXP, setTotalEarnedXP] = useState(0);
  const [totalEarnedCoins, setTotalEarnedCoins] = useState(0);
  const rewardsAwarded = useRef(false);

  // Get current round's post
  const isCollection = collectionPosts && collectionPosts.length > 1;
  const currentRoundPost = isCollection ? collectionPosts[currentRoundIndex] : post;
  const totalRounds = isCollection ? collectionPosts.length : 1;
  
  const questions = currentRoundPost?.questions || [];
  const currentQuestion = questions[currentIndex];

  const shuffleAnswers = useCallback((question: Question) => {
    const allAnswers = [question.correct_answer, ...question.incorrect_answers];
    return shuffleArray(allAnswers);
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
        // Round complete - calculate rewards
        const roundScore = score + (isCorrect ? 1 : 0);
        const isPerfect = roundScore === questions.length;
        
        // Calculate round rewards - apply VIP 2x XP multiplier
        const baseXpEarned = (roundScore * REWARDS.FEED_TRIVIA_XP_PER_CORRECT) + 
          (isPerfect ? REWARDS.FEED_TRIVIA_PERFECT_XP_BONUS : 0);
        const xpEarned = calculateXP(baseXpEarned, isVip);
        const coinsEarned = (roundScore * REWARDS.FEED_TRIVIA_COINS_PER_CORRECT) + 
          (isPerfect ? REWARDS.FEED_TRIVIA_PERFECT_COINS_BONUS : 0);
        
        setRoundEarnedXP(xpEarned);
        setRoundEarnedCoins(coinsEarned);
        setTotalEarnedXP(prev => prev + xpEarned);
        setTotalEarnedCoins(prev => prev + coinsEarned);
        
        setCumulativeScore(prev => prev + roundScore);
        
        if (isCollection && currentRoundIndex < totalRounds - 1) {
          // More rounds to play - award round rewards and increment plays for this round's post
          awardRewards(xpEarned, coinsEarned, currentRoundPost?.id, roundScore);
          setRoundComplete(true);
        } else {
          // All rounds complete - add collection bonus if applicable
          const finalCoins = isCollection 
            ? coinsEarned + REWARDS.FEED_COLLECTION_COMPLETE_COINS 
            : coinsEarned;
          if (isCollection) {
            setTotalEarnedCoins(prev => prev + REWARDS.FEED_COLLECTION_COMPLETE_COINS);
          }
          awardRewards(xpEarned, finalCoins, currentRoundPost?.id, roundScore);
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
  
  // Award rewards to user and increment plays count
  const awardRewards = async (xp: number, coins: number, postId?: string, score?: number) => {
    if (rewardsAwarded.current) return;
    rewardsAwarded.current = true;
    
    try {
      if (coins > 0) {
        await addCoins(coins, "feed_trivia");
      }
      if (xp > 0 && profile) {
        const newPoints = (profile.total_points || 0) + xp;
        await updateProfile({ total_points: newPoints } as any);
      }
      // Increment plays count and record play for the quiz
      if (postId) {
        await supabase.rpc('increment_quiz_plays', { post_id: postId });
        
        // Record that user played this quiz (for "played" indicator)
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.from('quiz_post_plays').insert({
            user_id: user.id,
            post_id: postId,
            score: score ?? 0,
          });
          
          // Invalidate trivia queries so leaderboard shows all players
          queryClient.invalidateQueries({ queryKey: ["trivia-leaderboard", postId] });
          queryClient.invalidateQueries({ queryKey: ["trivia-stats", postId] });
          queryClient.invalidateQueries({ queryKey: ["trivia-user-play", postId] });
          
          // Send notification to trivia creator
          const { data: postData } = await supabase
            .from("user_quiz_posts")
            .select("user_id, title")
            .eq("id", postId)
            .single();
          
          if (postData && postData.user_id !== user.id) {
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("nickname")
              .eq("user_id", user.id)
              .single();
            
            await createNotification(
              postData.user_id,
              "trivia_played",
              `${senderProfile?.nickname ? senderProfile.nickname : ""} played your trivia`,
              postData.title || undefined,
              // sender_nickname is what the notification list actually reads to
              // fill {name}. Without it translateNotificationTitle falls back
              // to the generic "someone played your trivia" - every time,
              // because nothing ever wrote this field.
              { post_id: postId, player_id: user.id, sender_nickname: senderProfile?.nickname ?? null }
            );
          }
        }
      }
    } catch (error) {
      console.error("Error awarding rewards:", error);
    }
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
    setRoundEarnedXP(0);
    setRoundEarnedCoins(0);
    rewardsAwarded.current = false;
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
    setRoundEarnedXP(0);
    setRoundEarnedCoins(0);
    setTotalEarnedXP(0);
    setTotalEarnedCoins(0);
    rewardsAwarded.current = false;
  };

  const handleClose = () => {
    resetGame();
    const dest = returnTo || (location.state as any)?.returnTo;
    if (dest) {
      onOpenChange(false);
      navigate(dest, { replace: true });
      return;
    }
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
      toast.success(t("extra.linkCopiedToast"));
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

  // Detect true/false questions
  const isTrueFalseQuestion = useMemo(() => {
    if (!shuffledAnswers) return false;
    if (shuffledAnswers.length !== 2) return false;
    
    const answers = shuffledAnswers.map(a => a.toLowerCase());
    return (
      (answers.includes("მართალია") && answers.includes("მცდარია")) ||
      (answers.includes("true") && answers.includes("false"))
    );
  }, [shuffledAnswers]);

  const answerLabels = ['ა', 'ბ', 'გ', 'დ'];

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
          <div className="relative z-10 flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
                {resolveAvatarUrl(currentRoundPost?.avatarUrl || post.avatarUrl) ? (
                  <img 
                    src={resolveAvatarUrl(currentRoundPost?.avatarUrl || post.avatarUrl)!}
                    alt={currentRoundPost?.displayName || post.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/30 flex items-center justify-center text-white font-bold text-sm">
                    {(currentRoundPost?.username || post.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
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
          <div className="relative z-10 flex flex-col h-[calc(100vh-160px)] px-4 max-w-[700px] md:max-w-[520px] mx-auto">
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
                  <motion.div 
                    className="mb-8"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <img src={trophyWinIcon} alt="Trophy" className="w-20 h-20 object-contain drop-shadow-2xl" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {t("extra.roundCompleted", { round: currentRoundIndex + 1 })}
                  </h3>
                  
                  <p className="text-4xl font-bold text-white mb-2">
                    {score}/{questions.length}
                  </p>
                  
                  <p className="text-white/70 text-sm mb-4">
                    {t("extra.totalScore", { score: cumulativeScore, total: collectionPosts.slice(0, currentRoundIndex + 1).reduce((sum, p) => sum + p.questions.length, 0) })}
                  </p>
                  
                  {/* Round Rewards */}
                  <div className="flex items-center gap-3 mb-6">
                    {roundEarnedXP > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="flex items-center gap-1.5 bg-purple-500/30 px-3 py-1.5 rounded-full"
                      >
                        <Star className="w-4 h-4 text-purple-300" />
                        <span className="text-white font-bold text-sm">+{roundEarnedXP} XP</span>
                      </motion.div>
                    )}
                    {roundEarnedCoins > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="flex items-center gap-1.5 bg-yellow-500/30 px-3 py-1.5 rounded-full"
                      >
                        <Coins className="w-4 h-4 text-yellow-300" />
                        <span className="text-white font-bold text-sm">+{roundEarnedCoins}</span>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-4 w-full max-w-sm items-center">
                    <ChunkyButton onClick={startNextRound} className="w-full">
                      <ChevronRight className="w-4 h-4 mr-2" />
                      {t("extra.continueRound", { current: currentRoundIndex + 2, total: totalRounds })}
                    </ChunkyButton>
                    
                    <div className="flex items-center justify-center gap-8 mt-2">
                      <button 
                        onClick={() => post?.id && toggleLike(post.id)}
                        className="flex flex-col items-center gap-2 transition-transform active:scale-95 hover:scale-110"
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                          userLikes.includes(post?.id || '') 
                            ? 'bg-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.5)]' 
                            : 'bg-white/15 hover:bg-white/25 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                        }`}>
                          <img 
                            src={purpleHeartIcon} 
                            alt="Like" 
                            className={`w-8 h-8 object-contain transition-all ${
                              userLikes.includes(post?.id || '') ? 'opacity-100 scale-110' : 'opacity-70'
                            }`}
                          />
                        </div>
                        <span className="text-white/80 text-xs font-medium">{t("extra.likeBtn")}</span>
                      </button>
                      
                      <button 
                        onClick={() => post?.id && toggleSave(post.id)}
                        className="flex flex-col items-center gap-2 transition-transform active:scale-95 hover:scale-110"
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                          userSaves.includes(post?.id || '') 
                            ? 'bg-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.5)]' 
                            : 'bg-white/15 hover:bg-white/25 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                        }`}>
                          <img 
                            src={bookmarkIcon} 
                            alt="Save" 
                            className={`w-8 h-8 object-contain transition-all ${
                              userSaves.includes(post?.id || '') ? 'opacity-100 scale-110' : 'opacity-70'
                            }`}
                          />
                        </div>
                        <span className="text-white/80 text-xs font-medium">{t("extra.saveBtn")}</span>
                      </button>
                    </div>
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
                  <motion.div 
                    className="mb-8"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <img src={trophyWinIcon} alt="Trophy" className="w-24 h-24 object-contain drop-shadow-2xl" />
                  </motion.div>
                  
                  <h3 className="text-3xl font-bold text-white mb-3">
                    {t("extra.gameOver")}
                  </h3>
                  
                  <p className="text-6xl font-bold text-white mb-3">
                    {isCollection ? cumulativeScore : score}/{totalCollectionQuestions}
                  </p>
                  
                  {isCollection && (
                    <p className="text-white/70 text-sm mb-4">
                      {currentRoundIndex + 1} {t("extra.roundsFull", { round: currentRoundIndex + 1 })}
                    </p>
                  )}
                  
                  {/* Total Rewards */}
                  <div className="flex items-center gap-3 mb-6">
                    {totalEarnedXP > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="flex items-center gap-1.5 bg-purple-500/30 px-4 py-2 rounded-full"
                      >
                        <Star className="w-5 h-5 text-purple-300" />
                        <span className="text-white font-bold">+{totalEarnedXP} XP</span>
                      </motion.div>
                    )}
                    {totalEarnedCoins > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="flex items-center gap-1.5 bg-yellow-500/30 px-4 py-2 rounded-full"
                      >
                        <Coins className="w-5 h-5 text-yellow-300" />
                        <span className="text-white font-bold">+{totalEarnedCoins}</span>
                      </motion.div>
                    )}
                  </div>
                  
                  <p className="text-white/80 text-xl mb-8">
                    {(() => {
                      const finalScore = isCollection ? cumulativeScore : score;
                      const total = totalCollectionQuestions;
                      if (finalScore >= total * 0.5) {
                        return <span className="flex items-center justify-center gap-2">{t("extra.wellDone")} <span className="text-2xl">🔥</span></span>;
                      }
                      return <span className="flex items-center justify-center gap-2">{t("extra.tryAgainMotivation")} <span className="text-2xl">💪</span></span>;
                    })()}
                  </p>
                  
                  {/* Social Actions */}
                  <div className="flex items-center justify-center gap-10 mb-10">
                    <button 
                      onClick={() => post?.id && toggleLike(post.id)}
                      className="flex flex-col items-center gap-2 transition-transform active:scale-95 hover:scale-110"
                    >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        userLikes.includes(post?.id || '') 
                          ? 'bg-pink-500/30 shadow-[0_0_25px_rgba(236,72,153,0.6)]' 
                          : 'bg-white/15 hover:bg-white/25 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                      }`}>
                        <img 
                          src={purpleHeartIcon} 
                          alt="Like" 
                          className={`w-9 h-9 object-contain transition-all ${
                            userLikes.includes(post?.id || '') ? 'opacity-100 scale-110' : 'opacity-70'
                          }`}
                        />
                      </div>
                      {!userLikes.includes(post?.id || '') && (
                        <span className="text-white/80 text-sm font-medium">{t("extra.likeBtn")}</span>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => post?.id && toggleSave(post.id)}
                      className="flex flex-col items-center gap-2 transition-transform active:scale-95 hover:scale-110"
                    >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        userSaves.includes(post?.id || '') 
                          ? 'bg-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.6)]' 
                          : 'bg-white/15 hover:bg-white/25 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                      }`}>
                        <img 
                          src={bookmarkIcon} 
                          alt="Save" 
                          className={`w-9 h-9 object-contain transition-all ${
                            userSaves.includes(post?.id || '') ? 'opacity-100 scale-110' : 'opacity-70'
                          }`}
                        />
                      </div>
                      {!userSaves.includes(post?.id || '') && (
                        <span className="text-white/80 text-sm font-medium">{t("extra.saveBtn")}</span>
                      )}
                    </button>
                  </div>
                  
                  <div className="w-full max-w-sm">
                    <ChunkyButton 
                      onClick={handleShare} 
                      variant="primary"
                      className="w-full"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      {t("extra.shareAction")}
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
                  {/* Question (icon overlaps card 50/50 like other quiz screens) */}
                  <div className="mt-10 mb-2 relative">
                    {currentQuestion?.icon_slug && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 -top-[33px] z-20"
                        style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.25))" }}
                      >
                        <DynamicIcon slug={currentQuestion.icon_slug} size={84} hideIfEmpty={true} />
                      </div>
                    )}

                    <QuizQuestionCard
                      questionText={currentQuestion?.question || ""}
                      timerSeconds={timeLeft}
                      timerMaxSeconds={15}
                      progressPercent={(currentIndex / Math.max(1, questions.length)) * 100}
                      state="default"
                      reserveTopSpace
                    />
                  </div>

                  {/* Progress Dots */}
                  <QuizProgressDots
                    total={questions.length}
                    current={currentIndex}
                    results={results}
                    className="mb-6"
                  />

                  {/* Answer Buttons */}
                  {isTrueFalseQuestion ? (
                    <div className="flex gap-3 mt-2">
                      {shuffledAnswers.map((answer, index) => {
                        const isTrue = answer.toLowerCase() === "მართალია" || answer.toLowerCase() === "true";
                        return (
                          <motion.div
                            key={answer}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex-1"
                          >
                            <QuizTrueFalseButton
                              variant={isTrue ? "true" : "false"}
                              state={getAnswerState(answer) as QuizTrueFalseState}
                              onClick={() => handleAnswer(answer)}
                              disabled={showResult}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
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
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}