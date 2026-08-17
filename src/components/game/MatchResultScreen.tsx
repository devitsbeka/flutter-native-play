import { useEffect, useState, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { GuestMaxPlaysModal } from "@/components/home/GuestMaxPlaysModal";
import { NotEnoughStakeModal } from "@/components/home/NotEnoughStakeModal";
import { hasReachedGuestPlayLimit, recordGuestPlay } from "@/hooks/useGuestPlays";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { useMissions } from "@/hooks/useMissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { missionTracker } from "@/services/missionTracker";
import { supabase } from "@/integrations/supabase/client";
import { Target, ArrowLeft, Crown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { calculateLevel } from "@/utils/levelCalculation";
import { LevelUpModal } from "@/components/home/LevelUpModal";
import { useGameStake } from "@/hooks/useGameStake";
import { useTrivia, ExhaustionInfo } from "@/hooks/useTrivia";
import { ExhaustionIndicator } from "@/components/ui/exhaustion-indicator";
import { useToast } from "@/hooks/use-toast";
import { showMissionCompleteToast } from "@/components/mission/MissionCompleteToast";
import { usePlayLimit, MAX_FREE_PLAYS } from "@/hooks/usePlayLimit";
import { useAds } from "@/hooks/useAds";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";

import { ChunkyButton } from "@/components/ui/chunky-button";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { resolveMatchOutcome } from "@/utils/matchOutcome";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";

// Compact number formatter (1.3m, 2.5k, etc.)
const formatCompactNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toLocaleString();
};

// Floating confetti component with looping effect
const FloatingConfetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });

    const colors = ["#ffffff", "#f0f0f0", "#e8e8e8", "#d0d0d0"];
    
    const frame = () => {
      myConfetti({
        particleCount: 8,
        angle: 90,
        spread: 180,
        origin: { x: Math.random(), y: -0.1 },
        colors: colors,
        gravity: 0.3,
        drift: Math.random() * 0.4 - 0.2,
        scalar: 0.9,
        ticks: 400,
      });
    };

    const interval = setInterval(frame, 30);
    
    return () => {
      clearInterval(interval);
      myConfetti.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

// Player card component for clean display
const PlayerCard = ({ 
  avatarUrl, 
  name,
  isWinner,
  winnerLabel,
  coinChange,
  score,
  correctSummary,
  onAvatarClick,
}: { 
  avatarUrl?: string | null; 
  name: string;
  isWinner: boolean;
  winnerLabel: string;
  coinChange?: number;
  score: number;
  correctSummary: string;
  onAvatarClick?: () => void;
}) => (
  <motion.div 
    className="flex flex-col items-center"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
  >
    {/* Spacer for alignment - same height as coin badge would take */}
    <div className="h-8 mb-2" />

    {/* Avatar section - fixed height container */}
    <div className="relative h-[110px] flex flex-col items-center justify-end">
      {/* Crown for winner */}
      {isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ 
            scale: 1, 
            y: [0, -4, 0]
          }}
          transition={{ 
            scale: { delay: 0.6, type: "spring", stiffness: 400 },
            y: { delay: 0.8, duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10"
          style={{ filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.4))" }}
        >
          <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400" />
        </motion.div>
      )}
      
      {/* Avatar with border */}
      <div
        onClick={onAvatarClick}
        role={onAvatarClick ? "button" : undefined}
        className={`rounded-2xl p-1 w-[88px] h-[88px] flex items-center justify-center ${onAvatarClick ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
        style={{
          background: isWinner 
            ? "linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)"
            : "rgba(255, 255, 255, 0.3)",
          boxShadow: isWinner 
            ? "0 8px 24px rgba(250, 204, 21, 0.4)"
            : "0 4px 12px rgba(255, 255, 255, 0.2)",
        }}
      >
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/20">
          {avatarUrl ? (
            <img src={resolveAvatarUrl(avatarUrl) || avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/30 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Winner badge container - fixed height for alignment */}
    <div className="h-6 flex items-start justify-center -mt-3 z-10">
      {isWinner && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
        >
          <div 
            className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)",
              color: "#78350F",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            {winnerLabel}
          </div>
        </motion.div>
      )}
    </div>
    
    {/* Name */}
    <p className="mt-4 font-semibold text-white truncate max-w-[120px] text-center text-xl">
      {name}
    </p>

    {/* This match: score + correct answers — the game's actual outcome */}
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.45, type: "spring" }}
      className="flex flex-col items-center mt-1"
    >
      <span className="text-3xl font-black text-white drop-shadow-sm">{score}</span>
      <span className="text-white/70 text-xs font-semibold">{correctSummary}</span>
    </motion.div>
    

    {/* Coin change badge - moved below */}
    <div className="h-8 flex items-center justify-center mt-2">
      {coinChange !== undefined && coinChange !== 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            coinChange > 0 
              ? "bg-emerald-500" 
              : "bg-red-500"
          }`}
          style={{ 
            boxShadow: coinChange > 0 
              ? "0 3px 0 rgba(5,150,105,0.5)" 
              : "0 3px 0 rgba(180,0,0,0.5)" 
          }}
        >
          <img src={coinIcon} alt="" className="w-4 h-4" />
          <span className="font-bold text-white text-sm">
            {coinChange > 0 ? `+${coinChange}` : coinChange}
          </span>
        </motion.div>
      )}
    </div>
  </motion.div>
);

export function MatchResultScreen() {
  const { userScore, opponentScore, opponent, matchId, resetGame, startMatchmaking, userAnswerHistory, opponentAnswerHistory } = useGame();
  const { user, profile, setProfileLocal } = useAuth();
  const { openProfile } = usePlayerProfile();
  const { addCoins } = useCurrency();
  const { playSound } = useSound();
  const { trackMissionEvent } = useMissions();
  const { t } = useLanguage();
  const { settleGame, hasEnoughCoins } = useGameStake();
  const { exhaustionInfo } = useTrivia();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canPlay, isVip, loading: vipLoading, playsRemaining, windowMode, regenPlayAvailable, timeUntilNextPlay, useRegenPlay, consumePlay } = usePlayLimit();
  const { maybeShowInterstitial } = useAds();
  
  // State for showing PRO upgrade modal when limit reached
  const [showPlayLimitModal, setShowPlayLimitModal] = useState(false);
  const [showNotEnoughCoinsModal, setShowNotEnoughCoinsModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalBlocking, setGuestModalBlocking] = useState(false);

  // What actually happened in this match, per player
  const userCorrect = userAnswerHistory.filter((a) => a.correct).length;
  const opponentCorrect = opponentAnswerHistory.filter((a) => a.correct).length;
  const totalQuestions = userAnswerHistory.length;

  // A win must be earned: leading the score AND at least one correct
  // answer — zero correct answers never celebrate as a victory.
  const { isWin, isDraw, isLose } = resolveMatchOutcome({
    userScore,
    opponentScore,
    userCorrect,
  });

  // Level up detection
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [awardedPowerUp, setAwardedPowerUp] = useState<string | undefined>(undefined);
  
  const [newLevel, setNewLevel] = useState(0);
  const [previousLevel, setPreviousLevel] = useState(0);
  /** Correct answers behind the reward, which is what actually triggers it. */
  const [milestoneCorrectAnswers, setMilestoneCorrectAnswers] = useState<number | undefined>(undefined);
  const [coinChange, setCoinChange] = useState(0);
  const hasCheckedLevelUp = useRef(false);
  const hasSoundPlayed = useRef(false);

  const handleBackToHome = () => {
    resetGame();
    navigate("/");
  };

  const handlePlayAgain = () => {
    // === GUEST CHECK - always show modal for guests ===
    if (!user) {
      if (hasReachedGuestPlayLimit()) {
        setGuestModalBlocking(true);
        setShowGuestModal(true);
      } else {
        setGuestModalBlocking(false);
        setShowGuestModal(true);
      }
      return;
    }

    // Can they start another one?
    //
    // Under the window rule the play just finished was already spent at its
    // start, so playsRemaining is current and speaks for itself. Under the
    // old rule the count comes from games_played, which is only written
    // after the game completes - so the game just played still has to be
    // subtracted by hand.
    const remainingAfterThisGame = windowMode ? playsRemaining : playsRemaining - 1;
    if (!isVip && !vipLoading && remainingAfterThisGame <= 0) {
      // Wanting another game right now is the whole reason this button was
      // tapped, so the modal that sells one opens directly — the invite offer
      // that used to come first answered a different question.
      setShowPlayLimitModal(true);
      return;
    }

    // And can they cover the stake? Home asks this before starting a quick
    // game; this button did not, so a player under 500 coins could keep
    // playing games whose loss they could not be charged for — which is one
    // of the ways a lost game ended up costing nothing.
    if (!hasEnoughCoins) {
      setShowNotEnoughCoinsModal(true);
      return;
    }

    void consumePlay();
    startMatchmaking();
  };

  // Play sound effects
  useEffect(() => {
    if (hasSoundPlayed.current) return;
    hasSoundPlayed.current = true;

    if (isWin) {
      playSound("game-win"); // Victory sound
    } else if (isLose) {
      playSound("game-lose"); // Lose sound
    }
  }, [isWin, isLose, playSound]);

  // Capture initial profile data at mount to prevent re-triggers
  const initialProfileRef = useRef(profile);
  const initialUserRef = useRef(user);
  
  // Update refs only on mount
  useEffect(() => {
    if (profile && !initialProfileRef.current) {
      initialProfileRef.current = profile;
    }
    if (user && !initialUserRef.current) {
      initialUserRef.current = user;
    }
  }, [profile, user]);

  useEffect(() => {
    const currentUser = initialUserRef.current || user;
    const currentProfile = initialProfileRef.current || profile;

    // Everything a finished game is worth — coins, points, the streak, the
    // session row — happens in here, once. The profile is what it is all
    // measured against, so arriving before it has loaded is a wait, not a
    // skip: this used to run on user id alone and, finding no profile, do
    // nothing at all and never come back to it. The game paid out nothing.
    if (currentUser && currentProfile && !hasCheckedLevelUp.current) {
      hasCheckedLevelUp.current = true;

      const updateStats = async () => {
        const oldPoints = currentProfile.total_points || 0;
        const newPoints = oldPoints + userScore;
        const oldLevelInfo = calculateLevel(oldPoints);
        const newLevelInfo = calculateLevel(newPoints);

        // Post-game settlement: Win +500, Lose -500, Draw 0 — decided by the
        // server, which is also the only thing that knows whether it landed.
        //
        // The badge shows what actually moved, not what it set out to move:
        // a credit the day's ceiling refused, or a debit larger than the
        // balance, both used to be announced as a full ±500 that never
        // reached the profile.
        setCoinChange(await settleGame(isWin ? "win" : isDraw ? "draw" : "lose", matchId));

        // === Settle the profile counters in ONE atomic increment ===
        // The database adds; the client no longer writes absolute totals
        // computed from a snapshot, so a mission or level bonus settling in
        // parallel can't erase this game's XP (or vice versa). The returned
        // row is the live truth the milestone math below runs against.
        const sessionData = missionTracker.getSessionData();
        const sessionCorrectAnswers = sessionData.correctAnswers;
        const { data: statsData, error: statsError } = await supabase.rpc("increment_profile_stats", {
          p_points: Math.min(Math.round(userScore), 5000),
          p_games_played: 1,
          p_games_won: isWin ? 1 : 0,
          p_correct_answers: Math.min(sessionCorrectAnswers, 500),
          p_streak_action: isWin ? "win" : "reset",
        });
        if (statsError) throw statsError;
        const stats = (statsData ?? {}) as Record<string, number>;
        setProfileLocal(stats);

        // Interstitial cadence check now that this game counts as completed
        void maybeShowInterstitial(stats.games_played ?? (currentProfile.games_played || 0) + 1);

        // === Correct-answer milestone level-up (every 20 correct answers) ===
        // Computed from the RPC's returned totals — the actual before/after —
        // instead of a possibly-stale client snapshot.
        const newTotalCorrect = stats.total_correct_answers ?? 0;
        const oldTotalCorrect = Math.max(0, newTotalCorrect - sessionCorrectAnswers);
        const threshold = REWARDS.LEVEL_UP_CORRECT_ANSWERS_THRESHOLD;
        const oldMilestone = Math.floor(oldTotalCorrect / threshold);
        const newMilestone = Math.floor(newTotalCorrect / threshold);

        let levelUpCoins = 0;
        let randomPowerUp: string | undefined;

        if (newMilestone > oldMilestone) {
          levelUpCoins = REWARDS.LEVEL_UP_COINS;
          const powerUpTypes = REWARDS.LEVEL_UP_POWER_UP_TYPES;
          randomPowerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
          setAwardedPowerUp(randomPowerUp);

          // Atomic upsert-increment — the read-add-write it replaces could
          // drop a grant landing at the same moment as a mission's.
          if (randomPowerUp) {
            const { error: powerError } = await supabase.rpc("adjust_power_up", {
              p_type: randomPowerUp,
              p_delta: 1,
            });
            if (powerError) console.error("Level-up power-up grant failed:", powerError);
          }
        }

        // Level-up coins added atomically via RPC (separate from game rewards)
        if (levelUpCoins > 0) {
          await addCoins(levelUpCoins, "level_up");
        }

        await supabase.from("game_sessions").insert({
          user_id: currentUser.id,
          opponent_name: opponent?.name || "Unknown",
          opponent_country: opponent?.countryCode || "US",
          opponent_points: opponent?.points || 0,
          user_score: userScore,
          opponent_score: opponentScore,
          status: isWin ? "won" : isDraw ? "draw" : "lost",
          completed_at: new Date().toISOString(),
        });

        if (newMilestone > oldMilestone) {
          // The badge shows the player's level, the way every other screen
          // counts it. It used to show the milestone index instead — a player
          // on level 79 crossing their third 20-correct-answer mark was told
          // they were level 3.
          setPreviousLevel(oldLevelInfo.level);
          setNewLevel(newLevelInfo.level);
          setMilestoneCorrectAnswers(newMilestone * threshold);
          requestAnimationFrame(() => {
            setTimeout(() => {
              setShowLevelUp(true);
            }, isWin ? 1500 : 500);
          });
        }

        // Update mission progress (sessionData already captured above)
        
        // Helper to show toast if mission completed
        const handleMissionResult = (result: { 
          completed: boolean; 
          missionTitle?: string;
          rewardCoins?: number;
          rewardGems?: number;
          rewardXp?: number;
          rewardPowerUp?: string | null;
          rewardPowerUpCount?: number;
        }) => {
          if (result.completed && result.missionTitle) {
            setTimeout(() => {
              showMissionCompleteToast(toast, {
                title: result.missionTitle!,
                coins: result.rewardCoins || 0,
                gems: result.rewardGems || 0,
                xp: result.rewardXp || 0,
                powerUp: result.rewardPowerUp,
                powerUpCount: result.rewardPowerUpCount,
              });
            }, 1500); // Delay to let result screen animate in first
          }
        };
        
        // Every finished game counts, plus the specific outcomes — events
        // advance both the daily and the weekly variants at once
        (await trackMissionEvent("game_played", 1)).forEach(handleMissionResult);

        if (sessionData.correctAnswers > 0) {
          (await trackMissionEvent("correct_answers", sessionData.correctAnswers)).forEach(handleMissionResult);
        }

        if (isWin) {
          (await trackMissionEvent("game_won", 1)).forEach(handleMissionResult);

          // Perfect game: won without a single wrong answer
          if (sessionData.totalAnswers > 0 && sessionData.correctAnswers === sessionData.totalAnswers) {
            (await trackMissionEvent("perfect_win", 1)).forEach(handleMissionResult);
          }
        }

        if (sessionData.categoriesPlayed > 0) {
          (await trackMissionEvent("categories_played", sessionData.categoriesPlayed)).forEach(handleMissionResult);
        }
      };

      // Guard flips synchronously above to block a concurrent second run,
      // but a FAILED settlement hands it back so a remount retries — one
      // network error used to eat the game's coins and XP with no retry.
      updateStats().catch((e) => {
        console.error("[MatchResult] settlement failed, will retry on next mount:", e);
        hasCheckedLevelUp.current = false;
      });
    }
  // The ref guard is what keeps this to one run; the deps only decide when it
  // is first allowed to happen, which is as soon as there is a profile to
  // count against.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.user_id]);

  // Calculate user level

  // Get result text based on outcome
  const getResultText = () => {
    if (isWin) return t("game.victory");
    if (isDraw) return t("game.tie");
    return t("game.lose");
  };

  const resultText = getResultText();

  return (
    <>
      <LevelUpModal
        isOpen={showLevelUp}
        onClose={() => setShowLevelUp(false)}
        newLevel={newLevel}
        previousLevel={previousLevel}
        awardedPowerUp={awardedPowerUp}
        correctAnswers={milestoneCorrectAnswers}
      />
      
      <PlayLimitModal
        isOpen={showPlayLimitModal}
        onClose={() => setShowPlayLimitModal(false)}
        isGuest={false}
        regenPlayAvailable={regenPlayAvailable}
        timeUntilNextPlay={timeUntilNextPlay}
        onPlayWithRegen={async () => {
          const success = await useRegenPlay();
          if (success) {
            setShowPlayLimitModal(false);
            startMatchmaking();
          }
        }}
        onPurchased={() => {
          setShowPlayLimitModal(false);
          void consumePlay();
          startMatchmaking();
        }}
      />

      <NotEnoughStakeModal
        isOpen={showNotEnoughCoinsModal}
        onClose={() => setShowNotEnoughCoinsModal(false)}
        onDailyRewards={() => {
          resetGame();
          navigate("/?daily=1");
        }}
      />

      <GuestMaxPlaysModal
        isOpen={showGuestModal}
        isBlocking={guestModalBlocking}
        onClose={() => {
          setShowGuestModal(false);
          resetGame();
          navigate("/");
        }}
        onRegister={() => {
          setShowGuestModal(false);
          resetGame();
          navigate("/auth?mode=signup");
        }}
        onContinuePlaying={() => {
          setShowGuestModal(false);
          const recorded = recordGuestPlay();
          if (!recorded) {
            setGuestModalBlocking(true);
            setShowGuestModal(true);
            return;
          }
          startMatchmaking();
        }}
      />

      <div 
        className="h-[100dvh] w-full flex flex-col relative overflow-hidden max-w-[700px] mx-auto safe-bleed"
        style={{
          background: "#7E7ADB",
        }}
      >
        {/* Floating Confetti Effect - Only show on win */}
        {isWin && <FloatingConfetti />}

        {/* Header */}
        <motion.div 
          className="flex items-center px-4 pt-4 pb-2 relative z-30 shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button 
            onClick={handleBackToHome}
            className="p-2"
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </motion.button>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          
          {/* Result Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-black mb-8 text-white"
            style={{
              fontFamily: "'TASolivare', sans-serif",
            }}
          >
            {resultText}
          </motion.h1>

          {/* Players Side by Side */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start justify-center gap-16 w-full"
          >
            {/* Player */}
            <PlayerCard 
              avatarUrl={profile?.avatar_url} 
              name={profile?.nickname || t("game.you")}
              isWinner={isWin}
              winnerLabel={t("game.winner")}
              coinChange={coinChange !== 0 ? coinChange : undefined}
              score={userScore}
              correctSummary={`${userCorrect}/${totalQuestions} ${t("modals.correctAnswers")}`}
              onAvatarClick={user ? () => openProfile(user.id) : undefined}
            />

            {/* Opponent */}
            <PlayerCard 
              avatarUrl={opponent?.avatarUrl} 
              name={opponent?.name || t("game.opponent")}
              isWinner={!isWin && !isDraw}
              winnerLabel={t("game.winner")}
              coinChange={coinChange !== 0 ? -coinChange : undefined}
              score={opponentScore}
              correctSummary={`${opponentCorrect}/${totalQuestions} ${t("modals.correctAnswers")}`}
            />
          </motion.div>

          {/* Exhaustion Indicator - show when nearing exhaustion */}
          {exhaustionInfo && exhaustionInfo.percentUsed >= 70 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6"
            >
              <ExhaustionIndicator
                percentUsed={exhaustionInfo.percentUsed}
                totalAvailable={exhaustionInfo.totalAvailable}
                totalSeen={exhaustionInfo.totalSeen}
                wasReset={exhaustionInfo.wasReset}
                usedFallback={exhaustionInfo.usedFallback}
                compact
              />
            </motion.div>
          )}
        </div>

        {/* Bottom Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-6 pb-8 relative z-10"
        >
          <ChunkyButton
            variant="white"
            size="lg"
            onClick={handlePlayAgain}
            className="w-full"
          >
            {t("game.playAgain")}
          </ChunkyButton>
        </motion.div>
      </div>
    </>
  );
}
