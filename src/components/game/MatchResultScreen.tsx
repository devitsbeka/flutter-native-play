import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { supabase } from "@/integrations/supabase/client";
import { Target, ArrowLeft, Crown } from "lucide-react";
import { calculateLevel } from "@/utils/levelCalculation";
import { LevelUpModal } from "@/components/home/LevelUpModal";
import { GameLoseModal } from "@/components/game/GameLoseModal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import trophyWinIcon from "@/assets/icons/trophy-win.png";

// Floating trophy animation component
const FloatingTrophy = () => (
  <motion.div
    initial={{ scale: 0, y: 50, opacity: 0 }}
    animate={{ 
      scale: 1, 
      y: [0, -15, 0], 
      opacity: 1,
    }}
    transition={{ 
      scale: { type: "spring", stiffness: 200, damping: 15 },
      y: { 
        duration: 2, 
        repeat: Infinity, 
        ease: "easeInOut" 
      },
      opacity: { duration: 0.3 }
    }}
    className="relative"
  >
    {/* Golden glow effect */}
    <div 
      className="absolute inset-0 blur-xl rounded-full"
      style={{
        background: "radial-gradient(circle, rgba(250, 204, 21, 0.6) 0%, transparent 70%)",
        transform: "scale(1.5)",
      }}
    />
    <img src={trophyWinIcon} alt="Victory" className="w-24 h-24 object-contain relative drop-shadow-lg" />
  </motion.div>
);

// Player card component for clean display
const PlayerCard = ({ 
  avatarUrl, 
  name,
  score,
  level,
  isWinner,
  earnedPoints,
}: { 
  avatarUrl?: string | null; 
  name: string;
  score: number;
  level: number;
  isWinner: boolean;
  earnedPoints?: number;
}) => (
  <motion.div 
    className="flex flex-col items-center"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
  >
    {/* Avatar wrapper with crown inside for proper centering */}
    <div className="relative">
      {/* Crown for winner - now properly centered on avatar */}
      {isWinner && (
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 z-10"
          style={{ filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.4))" }}
        >
          <Crown className="w-10 h-10 text-yellow-400 fill-yellow-400" />
        </motion.div>
      )}
      
      {/* Avatar with border */}
      <div 
        className="rounded-2xl p-1"
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

      {/* Winner label - half overlapping bottom of avatar */}
      {isWinner && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div 
            className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)",
              color: "#78350F",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            გამარჯვებული
          </div>
        </motion.div>
      )}
    </div>
    
    {/* Name - increased margin */}
    <p className="mt-4 font-semibold text-white truncate max-w-[120px]" style={{ fontSize: "22px" }}>
      {name}
    </p>
    
    {/* Score with Level below - added margin */}
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: "spring" }}
      className="flex flex-col items-center mt-2"
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
  const { addCoins } = useCurrency();
  const { playSound } = useSound();
  const navigate = useNavigate();

  const isWin = userScore > opponentScore;
  const isDraw = userScore === opponentScore;
  const isLose = !isWin && !isDraw;

  // Level up detection
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [previousLevel, setPreviousLevel] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const hasCheckedLevelUp = useRef(false);
  const hasSoundPlayed = useRef(false);

  const handleBackToHome = () => {
    resetGame();
    navigate("/");
  };

  const handlePlayAgain = () => {
    setShowLoseModal(false);
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
      // Show lose modal after a short delay
      setTimeout(() => setShowLoseModal(true), 800);
    }
  }, [isWin, isLose, playSound]);

  useEffect(() => {
    if (user && profile && !hasCheckedLevelUp.current) {
      hasCheckedLevelUp.current = true;
      
      const updateStats = async () => {
        const oldPoints = profile.total_points || 0;
        const newPoints = oldPoints + userScore;
        const oldLevelInfo = calculateLevel(oldPoints);
        const newLevelInfo = calculateLevel(newPoints);

        // Calculate coins earned
        let earnedCoins = 0;
        if (isWin) {
          earnedCoins = REWARDS.GAME_WIN_BASE_COINS + (userScore * REWARDS.GAME_WIN_PER_POINT_COINS);
        } else if (isDraw) {
          earnedCoins = REWARDS.GAME_DRAW_COINS;
        } else {
          earnedCoins = REWARDS.GAME_LOSE_CONSOLATION_COINS;
        }
        setCoinsEarned(earnedCoins);

        // Add coins
        await addCoins(earnedCoins);

        await updateProfile({
          total_points: newPoints,
          games_played: (profile.games_played || 0) + 1,
          games_won: isWin ? (profile.games_won || 0) + 1 : profile.games_won,
          current_streak: isWin ? (profile.current_streak || 0) + 1 : 0,
          best_streak: isWin 
            ? Math.max(profile.best_streak || 0, (profile.current_streak || 0) + 1)
            : profile.best_streak,
        });

        await supabase.from("game_sessions").insert({
          user_id: user.id,
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
          setTimeout(() => {
            setShowLevelUp(true);
          }, isWin ? 1500 : 500);
        }
      };

      updateStats();
    }
  }, [user, profile, userScore, opponentScore, isWin, isDraw, opponent, updateProfile, addCoins]);

  // Calculate user level
  const userLevel = calculateLevel(profile?.total_points || 0).level;
  const opponentLevel = Math.floor(Math.random() * 5) + 1; // Mock opponent level

  // Get result icon and colors based on outcome
  const getResultConfig = () => {
    if (isWin) {
      return {
        icon: <FloatingTrophy />,
        text: "გამარჯვება!",
      };
    }
    if (isDraw) {
      return {
        icon: <Target className="w-16 h-16 text-white" />,
        text: "ფრე",
      };
    }
    return {
      icon: <span className="text-5xl">😔</span>,
      text: "წაგება",
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

      <GameLoseModal
        isOpen={showLoseModal}
        onClose={() => setShowLoseModal(false)}
        onPlayAgain={handlePlayAgain}
        userScore={userScore}
        opponentScore={opponentScore}
        opponentName={opponent?.name || "მოწინააღმდეგე"}
        opponentAvatarUrl={opponent?.avatarUrl}
        coinsEarned={coinsEarned}
      />
      
      <div 
        className="h-[100dvh] w-full flex flex-col relative overflow-hidden"
        style={{ 
          background: "#7E7ADB",
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

          {/* Coins Earned Badge */}
          {coinsEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/90 mb-8"
              style={{ boxShadow: "0 4px 0 rgba(180,120,0,0.4)" }}
            >
              <img src={coinIcon} alt="" className="w-6 h-6" />
              <span className="font-bold text-white text-lg">+{coinsEarned}</span>
            </motion.div>
          )}

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
              name={profile?.nickname || "შენ"}
              score={userScore}
              level={userLevel}
              isWinner={isWin}
              earnedPoints={isWin ? userScore : undefined}
            />

            {/* Opponent */}
            <PlayerCard 
              avatarUrl={opponent?.avatarUrl} 
              name={opponent?.name || "მოწინააღმდეგე"}
              score={opponentScore}
              level={opponentLevel}
              isWinner={!isWin && !isDraw}
              earnedPoints={!isWin && !isDraw ? opponentScore : undefined}
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
            variant="mint"
            size="lg"
            onClick={handlePlayAgain}
            className="w-full"
          >
            თავიდან თამაში
          </ChunkyButton>
        </motion.div>
      </div>
    </>
  );
}
