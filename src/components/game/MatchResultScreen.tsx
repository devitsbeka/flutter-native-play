import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { RotateCcw, Home, Trophy, Star, Frown, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { calculateLevel } from "@/utils/levelCalculation";
import { LevelUpModal } from "@/components/home/LevelUpModal";

// Reusable avatar component with gamified border
const GameAvatar = ({ 
  avatarUrl, 
  isWinner,
  size = 100 
}: { 
  avatarUrl?: string | null; 
  isWinner?: boolean;
  size?: number;
}) => (
  <motion.div 
    className="relative"
    animate={isWinner ? { scale: [1, 1.05, 1] } : {}}
    transition={{ duration: 2, repeat: Infinity }}
  >
    {/* Glow effect for winner */}
    {isWinner && (
      <motion.div
        className="absolute inset-[-8px] rounded-3xl"
        style={{
          background: "radial-gradient(circle, rgba(250, 204, 21, 0.4) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    )}
    
    <div 
      className="rounded-2xl p-1"
      style={{
        background: isWinner 
          ? "linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)"
          : "linear-gradient(135deg, #5EEAD4 0%, #2DD4BF 50%, #14B8A6 100%)",
        boxShadow: isWinner 
          ? "0 8px 30px rgba(250, 204, 21, 0.4)"
          : "0 8px 30px rgba(45, 212, 191, 0.3)",
      }}
    >
      <div 
        className="rounded-xl overflow-hidden flex items-center justify-center"
        style={{ 
          width: size, 
          height: size,
          background: "#94a3b8",
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
            <span className="text-4xl">👤</span>
          </div>
        )}
      </div>
    </div>
    
    {/* Crown for winner */}
    {isWinner && (
      <motion.div
        className="absolute -top-6 left-1/2 -translate-x-1/2"
        initial={{ scale: 0, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <span className="text-3xl">👑</span>
      </motion.div>
    )}
  </motion.div>
);

export function MatchResultScreen() {
  const { userScore, opponentScore, opponent, resetGame, startMatchmaking } = useGame();
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const isWin = userScore > opponentScore;
  const isDraw = userScore === opponentScore;

  // Level up detection
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [previousLevel, setPreviousLevel] = useState(0);
  const hasCheckedLevelUp = useRef(false);

  const handleBackToHome = () => {
    resetGame();
    navigate("/");
  };

  const handlePlayAgain = () => {
    startMatchmaking();
  };

  useEffect(() => {
    if (isWin) {
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#7C5CFC', '#F5A623', '#FFD6E0', '#FDE047'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#7C5CFC', '#F5A623', '#FFD6E0', '#FDE047'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }

    if (user && profile && !hasCheckedLevelUp.current) {
      hasCheckedLevelUp.current = true;
      
      const updateStats = async () => {
        const oldPoints = profile.total_points || 0;
        const newPoints = oldPoints + userScore;
        const oldLevelInfo = calculateLevel(oldPoints);
        const newLevelInfo = calculateLevel(newPoints);

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
          }, isWin ? 2500 : 500);
        }
      };

      updateStats();
    }
  }, [user, profile, userScore, opponentScore, isWin, isDraw, opponent, updateProfile]);

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
        style={{ background: "#7E7BDC" }}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-white/10"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Header with back button */}
        <motion.div 
          className="flex items-center px-4 pt-4 pb-2 relative z-30 shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button 
            onClick={handleBackToHome}
            className="p-2 rounded-full bg-white/10"
            whileTap={{ scale: 0.95 }}
          >
            <Home className="w-5 h-5 text-white/80" />
          </motion.button>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          
          {/* Result Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mb-4"
          >
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: isWin 
                  ? "linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)"
                  : isDraw 
                    ? "linear-gradient(135deg, #94A3B8 0%, #64748B 100%)"
                    : "linear-gradient(135deg, #F87171 0%, #EF4444 100%)",
                boxShadow: isWin
                  ? "0 10px 40px rgba(250, 204, 21, 0.5)"
                  : "0 10px 30px rgba(0,0,0,0.2)",
              }}
            >
              {isWin ? (
                <Trophy className="w-12 h-12 text-amber-800" />
              ) : isDraw ? (
                <Sparkles className="w-12 h-12 text-white" />
              ) : (
                <Frown className="w-12 h-12 text-white" />
              )}
            </div>
          </motion.div>

          {/* Result Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black mb-2"
            style={{
              fontFamily: "'TASolivare', sans-serif",
              color: isWin ? "#FDE047" : "#FFFFFF",
              textShadow: isWin 
                ? "0 4px 0 #92400E, 0 0 30px rgba(250, 204, 21, 0.5)"
                : "0 4px 0 rgba(0,0,0,0.3)",
            }}
          >
            {isWin ? "გამარჯვება!" : isDraw ? "ფრე" : "წაგება"}
          </motion.h1>

          {/* Stars for win */}
          <AnimatePresence>
            {isWin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center gap-2 mb-6"
              >
                {[1, 2, 3].map((star) => (
                  <motion.div
                    key={star}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + star * 0.15, type: "spring" }}
                  >
                    <Star className="w-8 h-8 text-yellow-300 fill-yellow-300 drop-shadow-lg" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-sm bg-white/95 backdrop-blur-lg rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              {/* Player */}
              <div className="flex-1 flex flex-col items-center">
                <GameAvatar 
                  avatarUrl={profile?.avatar_url} 
                  isWinner={isWin}
                  size={80}
                />
                <p className="mt-3 font-bold text-slate-700 text-sm">
                  {profile?.nickname || "შენ"}
                </p>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="text-3xl font-black"
                  style={{ 
                    color: isWin ? "#7C5CFC" : "#64748B",
                  }}
                >
                  {userScore}
                </motion.p>
              </div>

              {/* VS Divider */}
              <div className="px-4 flex flex-col items-center">
                <span 
                  className="text-2xl font-black"
                  style={{
                    fontFamily: "'TASolivare', sans-serif",
                    color: "#7E7ADB",
                  }}
                >
                  VS
                </span>
              </div>

              {/* Opponent */}
              <div className="flex-1 flex flex-col items-center">
                <GameAvatar 
                  avatarUrl={opponent?.avatarUrl} 
                  isWinner={!isWin && !isDraw}
                  size={80}
                />
                <p className="mt-3 font-bold text-slate-700 text-sm">
                  {opponent?.name || "მოწინააღმდეგე"}
                </p>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="text-3xl font-black"
                  style={{ 
                    color: !isWin && !isDraw ? "#7C5CFC" : "#64748B",
                  }}
                >
                  {opponentScore}
                </motion.p>
              </div>
            </div>

            {/* Points Earned */}
            {userScore > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center pt-4 mt-4 border-t border-slate-200"
              >
                <p className="text-slate-500 text-sm">მიღებული ქულები</p>
                <p className="text-2xl font-black text-primary">+{userScore}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-sm flex flex-col gap-3 mt-6"
          >
            <ChunkyButton
              variant="success"
              size="lg"
              className="w-full"
              onClick={handlePlayAgain}
              icon={<RotateCcw className="w-5 h-5" />}
            >
              თავიდან თამაში
            </ChunkyButton>

            <ChunkyButton
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={handleBackToHome}
              icon={<Home className="w-5 h-5" />}
            >
              მთავარზე დაბრუნება
            </ChunkyButton>
          </motion.div>
        </div>
      </div>
    </>
  );
}
