import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
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

import { ChunkyButton } from "@/components/ui/chunky-button";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";

// Import video animations
import wonVideo from "@/assets/animations/won.mp4";
import lostVideo from "@/assets/animations/lost.mp4";

// Animated video icon component with ping-pong effect
const AnimatedResultIcon = ({ videoSrc }: { videoSrc: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const directionRef = useRef<'forward' | 'backward'>('forward');
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      // When forward playback ends, start going backward
      directionRef.current = 'backward';
      animateBackward();
    };

    const animateBackward = () => {
      if (!video || directionRef.current !== 'backward') return;
      
      video.currentTime = Math.max(0, video.currentTime - 0.033);
      
      if (video.currentTime <= 0.05) {
        // Reached the beginning, play forward again
        directionRef.current = 'forward';
        video.play();
        return;
      }
      
      animationRef.current = requestAnimationFrame(animateBackward);
    };

    video.addEventListener('ended', handleEnded);
    video.play();

    return () => {
      video.removeEventListener('ended', handleEnded);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ scale: 0, y: 50, opacity: 0 }}
      animate={{ 
        scale: 1, 
        y: 0, 
        opacity: 1,
      }}
      transition={{ 
        scale: { type: "spring", stiffness: 200, damping: 15 },
        opacity: { duration: 0.3 }
      }}
      className="relative"
    >
      <video 
        ref={videoRef}
        src={videoSrc}
        muted
        playsInline
        className="w-40 h-40 object-contain relative"
      />
    </motion.div>
  );
};

// Player card component for clean display
const PlayerCard = ({ 
  avatarUrl, 
  name,
  score,
  level,
  isWinner,
  winnerLabel,
  coinChange,
}: { 
  avatarUrl?: string | null; 
  name: string;
  score: number;
  level: number;
  isWinner: boolean;
  winnerLabel: string;
  coinChange?: number;
}) => (
  <motion.div 
    className="flex flex-col items-center"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
  >
    {/* Coin change badge container - fixed height for alignment */}
    <div className="h-8 flex items-center justify-center mb-2">
      {coinChange !== undefined && coinChange !== 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
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
        className="rounded-2xl p-1 w-[88px] h-[88px] flex items-center justify-center"
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
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
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
    
    {/* Score with Level below */}
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: "spring" }}
      className="flex flex-col items-center mt-1"
    >
      <span className="text-3xl font-black" style={{ color: "#F5A623" }}>
        {score}
      </span>
      <span className="text-white/70 text-xs font-medium">
        (Lvl.{level})
      </span>
    </motion.div>
  </motion.div>
);

export function MatchResultScreen() {
  const { userScore, opponentScore, opponent, resetGame, startMatchmaking } = useGame();
  const { user, profile, updateProfile } = useAuth();
  const { playSound } = useSound();
  const { updateMissionProgress } = useMissions();
  const { t } = useLanguage();
  const { awardWin, awardDraw, awardLose, netWinProfit, netLoss, stakeAmount } = useGameStake();
  const navigate = useNavigate();

  const isWin = userScore > opponentScore;
  const isDraw = userScore === opponentScore;
  const isLose = !isWin && !isDraw;

  // Level up detection
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  const [newLevel, setNewLevel] = useState(0);
  const [previousLevel, setPreviousLevel] = useState(0);
  const [coinChange, setCoinChange] = useState(0);
  const hasCheckedLevelUp = useRef(false);
  const hasSoundPlayed = useRef(false);

  const handleBackToHome = () => {
    resetGame();
    navigate("/");
  };

  const handlePlayAgain = () => {
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
    
    if (currentUser && currentProfile && !hasCheckedLevelUp.current) {
      hasCheckedLevelUp.current = true;
      
      const updateStats = async () => {
        const oldPoints = currentProfile.total_points || 0;
        const newPoints = oldPoints + userScore;
        const oldLevelInfo = calculateLevel(oldPoints);
        const newLevelInfo = calculateLevel(newPoints);

        // Stake-based rewards: Winner takes all, loser already paid
        if (isWin) {
          await awardWin();
          setCoinChange(netWinProfit); // +500 net profit
        } else if (isDraw) {
          await awardDraw();
          setCoinChange(REWARDS.GAME_DRAW_REFUND - stakeAmount); // -250 net
        } else {
          awardLose();
          setCoinChange(-netLoss); // -500 (already paid)
        }

        // Calculate level-up rewards upfront (instead of in modal)
        let levelUpCoins = 0;
        let levelUpGems = 0;
        if (newLevelInfo.level > oldLevelInfo.level) {
          const { LEVEL_UP_COINS_PER_LEVEL, LEVEL_UP_GEMS_THRESHOLD } = REWARDS;
          levelUpCoins = newLevelInfo.level * LEVEL_UP_COINS_PER_LEVEL;
          levelUpGems = newLevelInfo.level >= LEVEL_UP_GEMS_THRESHOLD && newLevelInfo.level % LEVEL_UP_GEMS_THRESHOLD === 0 
            ? Math.floor(newLevelInfo.level / LEVEL_UP_GEMS_THRESHOLD) 
            : 0;
        }

        await updateProfile({
          total_points: newPoints,
          games_played: (currentProfile.games_played || 0) + 1,
          games_won: isWin ? (currentProfile.games_won || 0) + 1 : currentProfile.games_won,
          current_streak: isWin ? (currentProfile.current_streak || 0) + 1 : 0,
          best_streak: isWin 
            ? Math.max(currentProfile.best_streak || 0, (currentProfile.current_streak || 0) + 1)
            : currentProfile.best_streak,
          // Add level-up rewards here in a single transaction
          coins: (currentProfile.coins || 0) + levelUpCoins,
          gems: (currentProfile.gems || 0) + levelUpGems,
        });

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

        if (newLevelInfo.level > oldLevelInfo.level) {
          setPreviousLevel(oldLevelInfo.level);
          setNewLevel(newLevelInfo.level);
          // Use requestAnimationFrame for smoother timing
          requestAnimationFrame(() => {
            setTimeout(() => {
              setShowLevelUp(true);
            }, isWin ? 1500 : 500);
          });
        }

        // Update mission progress
        const sessionData = missionTracker.getSessionData();
        
        // Update correct answers mission
        if (sessionData.correctAnswers > 0) {
          await updateMissionProgress("answer_correct", sessionData.correctAnswers);
        }
        
        // Update win games mission
        if (isWin) {
          await updateMissionProgress("win_games", 1);
        }
        
        // Update categories played mission
        if (sessionData.categoriesPlayed > 0) {
          await updateMissionProgress("play_categories", sessionData.categoriesPlayed);
        }
      };

      updateStats();
    }
  // Only depend on user.id to prevent re-runs when profile changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Calculate user level
  const userLevel = calculateLevel(profile?.total_points || 0).level;
  const opponentLevel = Math.floor(Math.random() * 5) + 1; // Mock opponent level

  // Get result icon and colors based on outcome
  const getResultConfig = () => {
    if (isWin) {
      return {
        icon: <AnimatedResultIcon videoSrc={wonVideo} />,
        text: t("game.victory"),
      };
    }
    if (isDraw) {
      return {
        icon: <Target className="w-16 h-16 text-white" />,
        text: t("game.tie"),
      };
    }
    return {
      icon: <AnimatedResultIcon videoSrc={lostVideo} />,
      text: t("game.lose"),
    };
  };

  const resultConfig = getResultConfig();

  return (
    <>
      <LevelUpModal
        isOpen={showLevelUp}
        onClose={() => setShowLevelUp(false)}
        newLevel={newLevel}
        previousLevel={previousLevel}
      />

      
      <div 
        className="h-[100dvh] w-full flex flex-col relative overflow-hidden"
        style={{ 
          background: isLose ? "#919CEB" : "#7E7ADB",
        }}
      >
        {/* Topographic Wave Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg 
            className="absolute inset-0 w-full h-full opacity-10" 
            viewBox="0 0 400 800" 
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id="waves" patternUnits="userSpaceOnUse" width="100" height="100">
                <path 
                  d="M0 50 Q25 30 50 50 T100 50" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="1"
                />
                <path 
                  d="M0 70 Q25 50 50 70 T100 70" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="1"
                />
                <path 
                  d="M0 30 Q25 10 50 30 T100 30" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#waves)" />
          </svg>
        </div>

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
        <div className="flex-1 flex flex-col items-center px-6 pt-2 relative z-10">
          
          {/* Result Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mb-4"
          >
            {resultConfig.icon}
          </motion.div>

          {/* Result Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black mb-10 text-white"
            style={{
              fontFamily: "'TASolivare', sans-serif",
            }}
          >
            {resultConfig.text}
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
              score={userScore}
              level={userLevel}
              isWinner={isWin}
              winnerLabel={t("game.winner")}
              coinChange={isLose ? -Math.abs(netLoss) : isWin ? netWinProfit : undefined}
            />

            {/* Opponent */}
            <PlayerCard 
              avatarUrl={opponent?.avatarUrl} 
              name={opponent?.name || t("game.opponent")}
              score={opponentScore}
              level={opponentLevel}
              isWinner={!isWin && !isDraw}
              winnerLabel={t("game.winner")}
              coinChange={isLose ? Math.abs(netLoss) : isWin ? -netWinProfit : undefined}
            />
          </motion.div>
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
