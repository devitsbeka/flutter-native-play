import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QuizAnswerButton } from "@/components/ui/quiz-answer-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Star, Target, ArrowLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { calculateLevel } from "@/utils/levelCalculation";
import { LevelUpModal } from "@/components/home/LevelUpModal";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

// Clean avatar component with winner badge
const ResultAvatar = ({ 
  avatarUrl, 
  isWinner,
  name,
  score,
  size = 90 
}: { 
  avatarUrl?: string | null; 
  isWinner?: boolean;
  name: string;
  score: number;
  size?: number;
}) => (
  <motion.div 
    className="flex flex-col items-center"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
  >
    {/* Winner Badge - clean label, no emoji */}
    {isWinner && (
      <motion.div
        initial={{ scale: 0, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.6, type: "spring" }}
        className="mb-2 px-3 py-1 rounded-full flex items-center gap-1"
        style={{
          background: "linear-gradient(135deg, #FDE047 0%, #FACC15 100%)",
          boxShadow: "0 4px 12px rgba(250, 204, 21, 0.4)",
        }}
      >
        <Trophy className="w-3 h-3 text-amber-800" />
        <span className="text-xs font-bold text-amber-800">გამარჯვებული</span>
      </motion.div>
    )}
    
    {/* Avatar with border */}
    <div 
      className="rounded-2xl p-1"
      style={{
        background: isWinner 
          ? "linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)"
          : "linear-gradient(135deg, #B9B6FF 0%, #7E7ADB 100%)",
        boxShadow: isWinner 
          ? "0 8px 24px rgba(250, 204, 21, 0.4)"
          : "0 6px 20px rgba(126, 122, 219, 0.3)",
      }}
    >
      <div 
        className="rounded-xl overflow-hidden flex items-center justify-center bg-slate-200"
        style={{ width: size, height: size }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
            <span className="text-3xl text-slate-600">👤</span>
          </div>
        )}
      </div>
    </div>
    
    {/* Name */}
    <p className="mt-3 font-bold text-slate-700 text-sm truncate max-w-[100px]">
      {name}
    </p>
    
    {/* Score */}
    <motion.p
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: "spring" }}
      className="text-3xl font-black"
      style={{ 
        color: isWinner ? "#7C5CFC" : "#64748B",
      }}
    >
      {score}
    </motion.p>
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

  // Get result icon based on outcome
  const getResultIcon = () => {
    if (isWin) return "trophy";
    if (isDraw) return "target";
    return "frown";
  };

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
          background: "linear-gradient(180deg, #7E7ADB 0%, #9B97E8 50%, #B9B6FF 100%)",
        }}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: "rgba(255,255,255,0.3)",
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div 
          className="flex items-center px-4 pt-4 pb-2 relative z-30 shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button 
            onClick={handleBackToHome}
            className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm"
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center px-6 pt-4 relative z-10">
          
          {/* Result Icon - using DynamicIcon for beautiful display */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mb-2"
          >
            <div 
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: isWin 
                  ? "linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)"
                  : isDraw 
                    ? "linear-gradient(135deg, #94A3B8 0%, #64748B 100%)"
                    : "linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)",
                boxShadow: isWin
                  ? "0 12px 40px rgba(250, 204, 21, 0.5)"
                  : isDraw
                    ? "0 12px 30px rgba(100, 116, 139, 0.3)"
                    : "0 12px 30px rgba(244, 63, 94, 0.3)",
              }}
            >
              {isWin ? (
                <Trophy className="w-14 h-14 text-amber-800" />
              ) : isDraw ? (
                <Target className="w-14 h-14 text-white" />
              ) : (
                <DynamicIcon slug="frown" size={56} className="opacity-90" />
              )}
            </div>
          </motion.div>

          {/* Result Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black mb-1"
            style={{
              fontFamily: "'TASolivare', sans-serif",
              color: "#FFFFFF",
              textShadow: isWin 
                ? "0 4px 0 rgba(146, 64, 14, 0.3), 0 0 30px rgba(250, 204, 21, 0.4)"
                : "0 4px 0 rgba(0,0,0,0.2)",
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
                className="flex justify-center gap-2 mb-4"
              >
                {[1, 2, 3].map((star) => (
                  <motion.div
                    key={star}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + star * 0.15, type: "spring" }}
                  >
                    <Star className="w-7 h-7 text-yellow-300 fill-yellow-300 drop-shadow-lg" />
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
            <div className="flex items-start justify-between">
              {/* Player */}
              <ResultAvatar 
                avatarUrl={profile?.avatar_url} 
                isWinner={isWin}
                name={profile?.nickname || "შენ"}
                score={userScore}
              />

              {/* VS Divider */}
              <div className="flex flex-col items-center justify-center h-full pt-12">
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
              <ResultAvatar 
                avatarUrl={opponent?.avatarUrl} 
                isWinner={!isWin && !isDraw}
                name={opponent?.name || "მოწინააღმდეგე"}
                score={opponentScore}
              />
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
                <p className="text-2xl font-black" style={{ color: "#7C5CFC" }}>+{userScore}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Action Buttons - Using Quiz Answer Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-sm flex flex-col gap-3 mt-6"
          >
            <QuizAnswerButton
              state="next"
              text="თავიდან თამაში"
              onClick={handlePlayAgain}
              showLabel={false}
            />

            <QuizAnswerButton
              state="default"
              text="მთავარზე დაბრუნება"
              onClick={handleBackToHome}
              showLabel={false}
            />
          </motion.div>
        </div>
      </div>
    </>
  );
}
