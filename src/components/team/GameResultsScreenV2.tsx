import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useAds } from "@/hooks/useAds";
import { useRoomCategoryQueue } from "@/hooks/useRoomCategoryQueue";
import { supabase } from "@/integrations/supabase/client";
import { ChallengeShareModal } from "@/components/challenge/ChallengeShareModal";
import { ArrowLeft, Star, Crown, Shuffle, Library, ChevronRight, Loader2, Gift, Share2 } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import trophyWinIcon from "@/assets/icons/trophy-win.png";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import xpIcon from "@/assets/icons/icon-xp.png";
import { toast } from "sonner";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { CategoryPickerModal } from "./CategoryPickerModal";

interface RankedParticipant {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
  score: number;
  rank: number;
  isMe: boolean;
}

export function GameResultsScreenV2() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { playSound, vibrate } = useSound();
  const { t } = useLanguage();
  const { addCoins } = useCurrency();
  const { maybeShowInterstitial } = useAds();
  const [coinsEarned, setCoinsEarned] = useState(0);
  const { 
    myScore: localMyScore, 
    participants, 
    resetMultiplayer,
    currentRoom,
    exitRoom,
    continueInRoom,
    startNewRound,
    startNextFromQueue,
    isHost,
    startGame,
  } = useMultiplayerV2();

  const { queue, addToQueue } = useRoomCategoryQueue(currentRoom?.id || null);

  const [isStartingRematch, setIsStartingRematch] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeQuestions, setChallengeQuestions] = useState<any[]>([]);
  const [myCorrectAnswers, setMyCorrectAnswers] = useState<number | undefined>(undefined);
  const hasAutoOpenedChallenge = useRef(false);

  // Sort participants by score and assign ranks
  const rankedParticipants: RankedParticipant[] = [...participants]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((p, index) => ({
      user_id: p.user_id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      country_code: p.country_code,
      score: p.score || 0,
      rank: index + 1,
      isMe: p.user_id === user?.id,
    }));

  const myParticipant = rankedParticipants.find(p => p.isMe);
  // Use Math.max to handle race condition where DB score hasn't propagated yet
  const myScore = Math.round(Math.max(myParticipant?.score || 0, localMyScore));
  const myRank = myParticipant?.rank ?? rankedParticipants.length;

  const isWin = myRank === 1;
  const isPodium = myRank <= 3;
  const result = isWin 
    ? t("game.victory") 
    : isPodium 
      ? t("game.placeFirst", { rank: myRank }) 
      : t("game.place", { rank: myRank });

  const hasUpdatedStats = useRef(false);

  // Victory/loss sound and confetti
  useEffect(() => {
    if (isWin) {
      playSound("game-win");
      vibrate([100, 50, 100]);
      
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#7C5CFC', '#F5A623', '#FFD6E0'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#7C5CFC', '#F5A623', '#FFD6E0'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else if (isPodium) {
      playSound("game-win");
      vibrate(100);
    } else {
      playSound("game-lose");
      vibrate(200);
    }
  }, [isWin, isPodium, playSound, vibrate]);

  // Update stats and save game
  useEffect(() => {
    if (user && profile && currentRoom && !hasUpdatedStats.current) {
      hasUpdatedStats.current = true;

      const updateStats = async () => {
        // Calculate coins earned based on rank
        let earnedCoins = 0;
        if (myRank === 1) {
          earnedCoins = REWARDS.MULTIPLAYER_1ST_COINS + myScore;
        } else if (myRank === 2) {
          earnedCoins = REWARDS.MULTIPLAYER_2ND_COINS + Math.floor(myScore / 2);
        } else if (myRank === 3) {
          earnedCoins = REWARDS.MULTIPLAYER_3RD_COINS + Math.floor(myScore / 2);
        } else {
          earnedCoins = REWARDS.MULTIPLAYER_PARTICIPATION_COINS;
        }
        setCoinsEarned(earnedCoins);

        // Add coins
        await addCoins(earnedCoins);

        // Update profile stats
        await updateProfile({
          total_points: (profile.total_points || 0) + myScore,
          games_played: (profile.games_played || 0) + 1,
          games_won: isWin ? (profile.games_won || 0) + 1 : profile.games_won,
          current_streak: isWin ? (profile.current_streak || 0) + 1 : 0,
          best_streak: isWin
            ? Math.max(profile.best_streak || 0, (profile.current_streak || 0) + 1)
            : profile.best_streak,
        });

        // Interstitial cadence check now that this game counts as completed
        void maybeShowInterstitial((profile.games_played || 0) + 1);

        // Save to room_games
        const playerScores = rankedParticipants.map(p => ({
          user_id: p.user_id,
          nickname: p.nickname,
          score: p.score,
          avatar_url: p.avatar_url,
        }));
        
        if (currentRoom.current_game_id) {
          await supabase
            .from("room_games")
            .update({
              completed_at: new Date().toISOString(),
              winner_user_id: rankedParticipants[0]?.user_id,
              player_scores: playerScores,
            })
            .eq("id", currentRoom.current_game_id);
        }

        // Save to room_match_history for recent games display.
        // Host only - every device runs this effect, so without the guard
        // an N-player round inserts N duplicate history rows
        if (isHost) {
          await supabase
            .from("room_match_history")
            .insert({
              room_id: currentRoom.id,
              winner_user_id: rankedParticipants[0]?.user_id || null,
              player_scores: playerScores,
            });
        }

        // Update participant stats including cumulative total_score
        const winnerId = rankedParticipants[0]?.user_id;
        for (const p of participants) {
          const isWinner = p.user_id === winnerId;
          const participantScore = rankedParticipants.find(rp => rp.user_id === p.user_id)?.score || 0;
          await supabase
            .from("room_participants")
            .update({
              total_wins: isWinner ? (p.total_wins || 0) + 1 : p.total_wins || 0,
              total_rounds_played: (p.total_rounds_played || 0) + 1,
              total_score: (p.total_score || 0) + participantScore, // Add to cumulative score
              last_played_at: new Date().toISOString(),
              has_seen_results: p.user_id === user.id,
            })
            .eq("id", p.id);
        }
      };

      updateStats();
    }
  }, [user, profile, myScore, myRank, isWin, currentRoom, updateProfile, rankedParticipants, addCoins, participants, maybeShowInterstitial]);

  // Auto-open challenge share modal
  // Prefetch challenge-share data so the share button opens instantly.
  // The modal itself no longer auto-opens - popping a share sheet over every
  // round's results interrupted multi-round play.
  useEffect(() => {
    if (hasAutoOpenedChallenge.current || !currentRoom?.current_game_id || !user) return;

    hasAutoOpenedChallenge.current = true;

    const fetchAndOpen = async () => {
      // Fetch questions
      const { data: qData } = await supabase
        .from("room_questions")
        .select("question_text, correct_answer, incorrect_answers, icon_slug")
        .eq("game_id", currentRoom.current_game_id!)
        .order("question_index");
      setChallengeQuestions(qData || []);

      // Fetch correct answer count
      const { count } = await supabase
        .from("player_answers")
        .select("*", { count: "exact", head: true })
        .eq("room_id", currentRoom.id)
        .eq("user_id", user.id)
        .eq("is_correct", true);
      setMyCorrectAnswers(count ?? undefined);
    };
    fetchAndOpen();
  }, [currentRoom, user]);

  const handleBackToRoom = () => {
    continueInRoom();
  };

  // Get next queue item for display
  const nextQueueItem = queue[0];

  const handlePlayAgain = async () => {
    setIsStartingRematch(true);
    try {
      if (queue.length > 0) {
        // Continue with next queued category
        await startNextFromQueue();
      } else {
        // No queue - repeat same category
        await startNewRound();
      }
    } catch (error) {
      console.error("Error starting new round:", error);
      toast.error(t("game.couldNotStartRound"));
    } finally {
      setIsStartingRematch(false);
    }
  };

  // Category picker handlers - directly from results screen
  const handleSelectCategory = async (category: { id: string; name: string; iconSlug?: string | null }) => {
    setShowCategoryPicker(false);
    setIsStartingRematch(true);
    try {
      // Update room with selected category
      await supabase
        .from("game_rooms")
        .update({
          category_id: category.id,
          category_name: category.name,
          user_trivia_id: null, // Clear any previous trivia selection
        })
        .eq("id", currentRoom?.id);
      
      await startGame();
    } catch (error) {
      console.error("Error starting game with category:", error);
      toast.error(t("game.couldNotStartRound"));
    } finally {
      setIsStartingRematch(false);
    }
  };

  const handleSelectRandom = async () => {
    setShowCategoryPicker(false);
    setIsStartingRematch(true);
    try {
      // Fetch a random category
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, icon_slug")
        .eq("is_active", true);
      
      if (categories && categories.length > 0) {
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        // Update room with random category
        await supabase
          .from("game_rooms")
          .update({
            category_id: randomCat.id,
            category_name: randomCat.name,
            user_trivia_id: null,
          })
          .eq("id", currentRoom?.id);
        
        await startGame();
      }
    } catch (error) {
      console.error("Error starting random game:", error);
      toast.error(t("game.couldNotStartRound"));
    } finally {
      setIsStartingRematch(false);
    }
  };

  const handleSelectTrivia = async (trivia: { id: string; title: string }) => {
    setShowCategoryPicker(false);
    setIsStartingRematch(true);
    try {
      // Update room with user trivia
      await supabase
        .from("game_rooms")
        .update({
          user_trivia_id: trivia.id,
          category_name: trivia.title,
          category_id: null,
        })
        .eq("id", currentRoom?.id);
      
      await startGame();
    } catch (error) {
      console.error("Error starting trivia game:", error);
      toast.error(t("game.couldNotStartRound"));
    } finally {
      setIsStartingRematch(false);
    }
  };

  const handleAddToQueue = async (item: {
    source_type: "category" | "random" | "user_trivia";
    category_id?: string | null;
    category_name?: string | null;
    user_trivia_id?: string | null;
    icon_slug?: string | null;
  }) => {
    if (!currentRoom) return;
    
    // Add item to queue first
    await addToQueue(item);

    // CRITICAL FIX: Reset room status to waiting, but DON'T set category fields
    // The queue items will be shown separately, and the first item
    // will become "current" only when the game starts
    // This prevents the duplicate display bug where category appears both as
    // "current" AND in the queue
    // Guard: never downgrade a "playing" room - another player may have already
    // started the next round and this write would derail their live game
    const { data: freshRoom } = await supabase
      .from("game_rooms")
      .select("status")
      .eq("id", currentRoom.id)
      .single();

    if (freshRoom?.status !== "playing") {
      await supabase
        .from("game_rooms")
        .update({
          status: "waiting",
          category_id: null,      // Clear - no current category
          category_name: null,    // Clear - show empty state
          user_trivia_id: null,   // Clear - no current trivia
        })
        .eq("id", currentRoom.id);
    }
    
    // Navigate to lobby (continueInRoom will see status is already "waiting" and skip redundant DB update)
    continueInRoom();
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5]">
      <div className="w-full h-full flex flex-col max-w-[700px] mx-auto">
      {/* Back Button Header */}
      <div className="flex items-center px-4 pt-3 pb-0 flex-shrink-0">
        <button
          onClick={handleBackToRoom}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Top Section: Icon + Result */}
      <div className="pt-0 text-center">
        <motion.img 
          src={trophyWinIcon} 
          alt="Trophy" 
          className="w-[54px] h-[54px] object-contain mx-auto mb-1"
          initial={{ scale: 0.5, y: -20 }}
          animate={{ 
            scale: 1, 
            y: 0,
            rotate: [0, -8, 8, -8, 0] 
          }}
          transition={{ 
            scale: { type: "spring", stiffness: 200 },
            y: { type: "spring", stiffness: 200 },
            rotate: { 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: "easeInOut"
            }
          }}
        />

        {/* Stars for win */}
        {isWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-1 mt-2"
          >
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + star * 0.1, type: "spring" }}
              >
                <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Points + Coins Row - Fixed under stars */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-4 mt-2"
        >
          {/* Coins Badge */}
          {coinsEarned > 0 && (
            <div 
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/90"
              style={{ boxShadow: "0 4px 0 rgba(180,120,0,0.4)" }}
            >
              <img src={coinIcon} alt="Coins" className="w-5 h-5" />
              <span className="text-white font-bold text-lg">+{coinsEarned}</span>
            </div>
          )}

          {/* XP Badge */}
          {myScore > 0 && (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-sm">
              <img src={xpIcon} alt="XP" className="w-5 h-5" />
              <span className="text-white font-bold text-lg">+{myScore} XP</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Middle Section: Category + Scorecard (with 40px top spacing) */}
      <div className="flex-1 min-h-0 flex flex-col items-center gap-4 px-4 overflow-hidden" style={{ paddingTop: '20px' }}>
        {/* Category */}
        {currentRoom?.category_name && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-6 py-2.5 rounded-full bg-white/15 backdrop-blur-sm"
          >
            <span className="text-white font-medium">{currentRoom.category_name}</span>
          </motion.div>
        )}

        {/* Compact Scorecard with scroll */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full max-w-xs bg-white/10 backdrop-blur-sm rounded-2xl p-3 flex-1 min-h-0 overflow-y-auto"
        >
          <div className="space-y-2">
          {rankedParticipants.map((p, idx) => (
              <div
                key={p.user_id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl",
                  p.isMe ? "bg-white/20" : ""
                )}
              >
                {/* Avatar with crown for winner */}
                <div className="relative">
                  <SafeAvatar 
                    avatarUrl={p.avatar_url}
                    fallback={p.nickname || "?"}
                    className="w-12 h-12 border-2 border-white/30"
                    fallbackClassName="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-base font-bold"
                  />
                  {idx === 0 && (
                    <Crown className="absolute -top-3 -right-1 w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-md" />
                  )}
                </div>
                
                {/* Medal */}
                <span className="text-2xl">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${p.rank}`}
                </span>
                
                {/* Name */}
                <span className="flex-1 text-white font-display text-lg truncate">
                  {p.isMe ? t("game.you") : p.nickname}
                </span>
                
                {/* Score */}
                <span className="text-white font-display text-lg">{p.score}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Section: Next Round Preview + Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 space-y-3"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}
      >
        {/* Next Round Preview - show if queue has items */}
        {nextQueueItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
          >
            <p className="text-white/50 text-xs mb-2">შემდეგი რაუნდი:</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                {nextQueueItem.category_id === "__mixed__" ? (
                  <DynamicIcon slug="mystery-box" size={20} />
                ) : nextQueueItem.source_type === "random" ? (
                  <Shuffle className="w-5 h-5 text-purple-300" />
                ) : nextQueueItem.icon_slug ? (
                  <DynamicIcon slug={nextQueueItem.icon_slug} size={20} />
                ) : (
                  <Library className="w-5 h-5 text-purple-300" />
                  )}
              </div>
              <span className="flex-1 text-white font-medium truncate">
                {nextQueueItem.source_type === "random" 
                  ? "შემთხვევითი" 
                  : nextQueueItem.category_name || "კატეგორია"}
              </span>
              {queue.length > 1 && (
                <span className="text-white/40 text-sm flex items-center gap-1">
                  +{queue.length - 1} მეტი
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Strict host check: ensure user.id is defined and matches host_user_id */}
        {isHost && user?.id && currentRoom?.host_user_id === user.id ? (
          <>
            {/* Continue button - when queue has items */}
            {queue.length > 0 && (
              <ChunkyButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handlePlayAgain}
                disabled={isStartingRematch}
                icon={isStartingRematch ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              >
                {isStartingRematch ? t("game.starting") : t("common.continue")}
              </ChunkyButton>
            )}

            {/* Category picker button */}
            <ChunkyButton
              variant="mint"
              size="lg"
              className="w-full"
              onClick={() => setShowCategoryPicker(true)}
              disabled={isStartingRematch}
              icon={<ChevronRight className="w-5 h-5" />}
            >
              {t("extra.addCategory")}
            </ChunkyButton>

            {/* Challenge Friends button */}
            <ChunkyButton
              variant="gold"
              size="lg"
              className="w-full"
              onClick={() => setShowChallengeModal(true)}
              icon={<Share2 className="w-5 h-5" />}
            >
              {t("extra.challengeFriend")}
            </ChunkyButton>

          </>
        ) : (
          <>
            {/* Non-host - show waiting or back */}
            <div className="text-center py-4 px-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <p className="text-white/70 font-medium">{t("extra.waitingForHostResult")}</p>
            </div>
          </>
        )}
      </motion.div>

      {/* Category Picker Modal */}
      <CategoryPickerModal
        isOpen={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelectCategory={handleSelectCategory}
        onSelectRandom={handleSelectRandom}
        onSelectTrivia={handleSelectTrivia}
        onAddToQueue={handleAddToQueue}
        showQueueOption={true}
        roomGradient={currentRoom?.background_gradient || undefined}
        excludeTriviaId={currentRoom?.user_trivia_id}
      />

      {/* Challenge Share Modal */}
      <ChallengeShareModal
        open={showChallengeModal}
        onOpenChange={setShowChallengeModal}
        score={myScore}
        totalQuestions={currentRoom?.total_questions || challengeQuestions.length}
        correctAnswers={myCorrectAnswers}
        categoryName={currentRoom?.category_name}
        categoryIconSlug={null}
        roomId={currentRoom?.id}
        questions={challengeQuestions}
      />
      </div>
    </div>
  );
}
