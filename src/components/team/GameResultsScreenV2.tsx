import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useMissions } from "@/hooks/useMissions";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useRoomCategoryQueue } from "@/hooks/useRoomCategoryQueue";
import { supabase } from "@/integrations/supabase/client";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";
import { useChallengeShare } from "@/hooks/useChallengeShare";
import { ArrowLeft, Star, Crown, Shuffle, Library, ChevronRight, Loader2, Gift, Share2 } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import trophyWinIcon from "@/assets/icons/trophy-win.png";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import xpIcon from "@/assets/level/xp-spark.png";
import { toast } from "@/lib/toast";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { CategoryPickerModal } from "./CategoryPickerModal";
import { RoomQueueSheet } from "./RoomQueueSheet";
import { calculateMultiplayerPayout } from "@/utils/multiplayerPayout";
import { isGuestAccount } from "@/utils/guestAccount";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";

// Games whose results were already counted on this device. Module-level (not a
// ref) because the results screen can remount for the SAME game (results ->
// lobby -> results bounce while a slow player finishes) and a per-mount ref
// would re-grant coins/stats and re-touch participant rows mid-next-round.
const processedResultsGames = new Set<string>();

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
  const { user, profile, setProfileLocal } = useAuth();
  const { playSound, vibrate } = useSound();
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  const { addCoins } = useCurrency();
  const { trackMissionEvent } = useMissions();
  const { openProfile } = usePlayerProfile();
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [showQueueSheet, setShowQueueSheet] = useState(false);

  // Let the result land before asking for anything — the score is the reason
  // they played, and the ask reads as a reward rather than a toll gate.
  useEffect(() => {
    if (!isGuestAccount(user)) return;
    const timer = setTimeout(() => setShowGuestSignUp(true), 3000);
    return () => clearTimeout(timer);
  }, [user]);
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
  const { share, sharing } = useChallengeShare();

  const [isStartingRematch, setIsStartingRematch] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [challengeQuestions, setChallengeQuestions] = useState<any[]>([]);
  const hasFetchedChallengeQuestions = useRef(false);

  /**
   * The best score seen for each player while this screen has been up.
   *
   * room_participants.score is live round state, not a record of what
   * happened. When the host starts the next round — or the realtime
   * subscription reconnects and finds the room still playing — every client
   * resets its OWN row to score 0, and it does that whether or not the
   * player is still reading the last round's result. So the scoreboard a
   * player was looking at rewrote itself to 0/0 while they waited for the
   * host, with the header still showing the XP the round had paid.
   *
   * Scores only ever climb during a round, so keeping the highest value seen
   * ignores the reset without needing to detect it, and still lets a score
   * that propagates late arrive. The header already did exactly this for the
   * player's own total (Math.max with localMyScore); the rows did not, which
   * is why the two disagreed.
   */
  const bestSeenScores = useRef<Map<string, number>>(new Map());
  for (const p of participants) {
    const seen = bestSeenScores.current.get(p.user_id) ?? 0;
    bestSeenScores.current.set(p.user_id, Math.max(seen, p.score || 0));
  }
  const roundScoreOf = (p: { user_id: string; score?: number | null }) =>
    Math.max(bestSeenScores.current.get(p.user_id) ?? 0, p.score || 0);

  // Sort participants by score and assign ranks
  const rankedParticipants: RankedParticipant[] = [...participants]
    .sort((a, b) => roundScoreOf(b) - roundScoreOf(a))
    .map((p, index) => ({
      user_id: p.user_id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      country_code: p.country_code,
      score: roundScoreOf(p),
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
    // Key by game id so a remount for the same game can't double-count. Rooms
    // without a game id (legacy/RLS-blocked inserts) keep the per-mount guard
    // only - keying those by room id would block every later round's stats.
    const statsKey = currentRoom?.current_game_id || null;
    if (user && profile && currentRoom && !hasUpdatedStats.current && !(statsKey && processedResultsGames.has(statsKey))) {
      hasUpdatedStats.current = true;
      if (statsKey) processedResultsGames.add(statsKey);

      const updateStats = async () => {
        // Round completion — the room-wide write-set (room_games completion
        // snapshot, match history row, and every participant's cumulative
        // total_score / total_rounds_played / total_wins) — happens in ONE
        // idempotent SECURITY DEFINER RPC, called by every device; the first
        // call applies it, the rest no-op. It replaced a host-only client
        // loop that RLS silently reduced to the host's own row: every other
        // player sat at 0 points / 0 rounds on the scoreboard forever.
        // First in the chain and error-isolated, so a coins or profile
        // failure below can never eat the round again.
        if (currentRoom.current_game_id) {
          const { error: roundError } = await supabase.rpc("complete_room_round", {
            p_room_id: currentRoom.id,
            p_game_id: currentRoom.current_game_id,
          });
          if (roundError) {
            console.error("[GameResults] complete_room_round failed:", roundError);
          }
        }

        // Unified reward policy — see multiplayerPayout.ts for the rules.
        const { earnedCoins, isPractice, countsAsWin } = calculateMultiplayerPayout({
          playerCount: participants.length,
          myRank,
          myScore,
          isWin,
        });
        setCoinsEarned(earnedCoins);

        // Missions: every room game counts as played; a real (non-practice)
        // room is a game with friends; ranked wins advance win missions
        void trackMissionEvent("game_played", 1);
        if (!isPractice) void trackMissionEvent("friend_game", 1);
        if (countsAsWin) void trackMissionEvent("game_won", 1);

        if (earnedCoins > 0) {
          await addCoins(earnedCoins, "quiz_reward");
        }

        // Update profile stats — XP is placement-independent: every player
        // banks their raw score in every mode. Increment RPC, not an
        // absolute write: a mission settling in parallel reads the same
        // starting total, and whichever absolute write landed last used to
        // erase the other grant. The database does the addition now.
        const { data: statsData, error: statsError } = await supabase.rpc("increment_profile_stats", {
          p_points: Math.min(Math.round(myScore), 5000),
          p_games_played: 1,
          p_games_won: countsAsWin ? 1 : 0,
          p_streak_action: countsAsWin ? "win" : isPractice ? "none" : "reset",
        });
        if (statsError) {
          console.error("[GameResults] increment_profile_stats failed:", statsError);
        } else if (statsData) {
          setProfileLocal(statsData as Record<string, number>);
        }

        // room_games completion, room_match_history, and the cumulative
        // participant totals are all written by complete_room_round above —
        // server-side, from live scores, once per round. The client-side
        // versions this replaces were host-gated (RLS made anything else a
        // silent no-op) and read from whichever snapshot this device had.

        // Every device still marks only its own "seen results" flag
        const myRow = participants.find(p => p.user_id === user.id);
        if (myRow) {
          await supabase
            .from("room_participants")
            .update({ has_seen_results: true })
            .eq("id", myRow.id);
        }
      };

      // The guards flip synchronously above so a re-render can't start the
      // chain twice — but a FAILED chain hands them back, so a remount
      // retries instead of the round's payout being lost forever (the old
      // behavior: one network error and the coins were gone with no retry).
      // complete_room_round is idempotent server-side; the worst a retry
      // can double is a coin grant whose first attempt half-landed, which
      // beats guaranteed loss.
      updateStats().catch((e) => {
        console.error("[GameResults] settlement failed, will retry on next mount:", e);
        hasUpdatedStats.current = false;
        if (statsKey) processedResultsGames.delete(statsKey);
      });
    }
  }, [user, profile, myScore, myRank, isWin, isHost, currentRoom, setProfileLocal, rankedParticipants, addCoins, participants]);

  // Prefetch the questions a challenge link carries, so sharing is one tap
  // and not a wait.
  //
  // The correct-answer count used to be fetched here too. It existed only to
  // print "(2 correct)" inside the dialog that is gone, so it was a round trip
  // on every results screen for something nobody reads.
  useEffect(() => {
    if (hasFetchedChallengeQuestions.current || !currentRoom?.current_game_id || !user) return;

    hasFetchedChallengeQuestions.current = true;

    const fetchQuestions = async () => {
      const { data: qData } = await supabase
        .from("room_questions")
        .select("question_text, correct_answer, incorrect_answers, icon_slug")
        .eq("game_id", currentRoom.current_game_id!)
        .order("question_index");
      setChallengeQuestions(qData || []);
    };
    fetchQuestions();
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
        .select("id, name, icon_slug, is_language_specific, language")
        .eq("is_active", true);

      const pool = filterCategoriesForLanguage(categories || []);
      if (pool.length > 0) {
        const randomCat = pool[Math.floor(Math.random() * pool.length)];
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
    <>
    {/* A visitor who opened a shared room link is signed in anonymously so
        they can play immediately. That free game ends here: the score lands
        first, then the offer to keep it. Guests only — a real account never
        sees this. */}
    <AuthRequiredModal
      isOpen={showGuestSignUp}
      onClose={() => setShowGuestSignUp(false)}
      message={t("extra.guestSaveScorePrompt")}
    />
    {/* safe-bleed, because this screen renders standalone inside the
        safe-area-padded #root: a plain 100dvh box in there is taller than
        the padded shell by both insets, and overflow-hidden was clipping
        the bottom section — the next-round queue and the waiting-for-host
        button — off the screen. Bled into the insets and self-padded, the
        box is exactly the viewport and the gradient covers the status bar. */}
    <div className="h-[100dvh] w-full overflow-hidden safe-bleed bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5]">
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
            <span className="text-white font-medium">{localizeCategory(currentRoom.category_name)}</span>
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
                {/* Avatar with crown for winner — tap opens the player's profile */}
                <div
                  className={cn("relative", !p.isMe && "cursor-pointer active:scale-95 transition-transform")}
                  onClick={!p.isMe ? () => openProfile(p.user_id) : undefined}
                  role={!p.isMe ? "button" : undefined}
                >
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

      {/* Bottom Section: Next Round Preview + Buttons. The home-indicator
          inset is already the root's own padding (safe-bleed), so this
          carries plain spacing — env(safe-area-inset-bottom) here again
          would double-count the inset. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 pb-5 space-y-3"
      >
        {/* Next Round Preview - show if queue has items */}
        {nextQueueItem && (
          // Tappable: it already showed "+3 >" beside the next item, which
          // reads as something you can open. A player waiting on the host
          // could see more rounds existed and had no way to see what they
          // were.
          <motion.button
            type="button"
            onClick={() => setShowQueueSheet(true)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full text-left p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 transition-colors hover:bg-white/15 active:scale-[0.99]"
          >
            <p className="text-white/50 text-xs mb-2">{t("extra.nextRoundLabel")}</p>
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
                  ? t("extra.randomOption")
                  : localizeCategory(nextQueueItem.category_name) || t("extra.categoryType")}
              </span>
              <span className="text-white/40 text-sm flex items-center gap-1 flex-shrink-0">
                {queue.length > 1 && <>+{queue.length - 1} {t("extra.moreCount")}</>}
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </motion.button>
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

            {/* Challenge a friend.
                A text button, not a third chunky one: the two above it are
                what to do next, and this is a way to pass the game on. It
                used to open a dialog that showed the score and category the
                screen behind it was already showing, and then offered this
                same share — so the share happens here directly. */}
            <button
              type="button"
              onClick={() =>
                void share({
                  score: myScore,
                  totalQuestions: currentRoom?.total_questions || challengeQuestions.length,
                  categoryName: currentRoom?.category_name,
                  categoryIconSlug: null,
                  roomId: currentRoom?.id,
                  questions: challengeQuestions,
                })
              }
              disabled={sharing}
              className="mx-auto flex items-center gap-2 py-3 text-sm font-bold text-white/80 hover:text-white disabled:opacity-60 transition-colors"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {t("extra.challengeFriend")}
            </button>

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
      <RoomQueueSheet
        isOpen={showQueueSheet}
        onClose={() => setShowQueueSheet(false)}
        queue={queue}
      />

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

      </div>
    </div>
    </>
  );
}
