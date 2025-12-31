import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QuizAnswerButton } from "@/components/ui/quiz-answer-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Target, HelpCircle, ArrowLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { calculateLevel } from "@/utils/levelCalculation";
import { LevelUpModal } from "@/components/home/LevelUpModal";

// Player card component for clean display
const PlayerCard = ({ 
  avatarUrl, 
  name,
  score,
  isWinner,
  showWinnerBadge 
}: { 
  avatarUrl?: string | null; 
  name: string;
  score: number;
  isWinner: boolean;
  showWinnerBadge: boolean;
}) => (
  <motion.div 
    className="flex flex-col items-center relative"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
  >
    {/* Winner Badge - positioned above avatar */}
    {showWinnerBadge && (
      <motion.div
        initial={{ scale: 0, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.6, type: "spring" }}
        className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap"
      >
        <div 
          className="px-2.5 py-1 rounded-full flex items-center gap-1"
          style={{
            background: "linear-gradient(135deg, #FDE047 0%, #FACC15 100%)",
            boxShadow: "0 4px 12px rgba(250, 204, 21, 0.4)",
          }}
        >
          <Trophy className="w-3 h-3 text-amber-800" />
          <span className="text-[10px] font-bold text-amber-800">გამარჯვებული</span>
        </div>
      </motion.div>
    )}
    
    {/* Avatar with border */}
    <div 
      className="rounded-2xl p-1"
      style={{
        background: isWinner 
          ? "linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)"
          : "#B9B6FF",
        boxShadow: isWinner 
          ? "0 8px 24px rgba(250, 204, 21, 0.4)"
          : "0 4px 12px rgba(185, 182, 255, 0.3)",
      }}
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
            <span className="text-2xl text-slate-600">👤</span>
          </div>
        )}
      </div>
    </div>
    
    {/* Name */}
    <p className="mt-2 font-semibold text-slate-700 text-sm truncate max-w-[90px]">
      {name}
    </p>
    
    {/* Score */}
    <motion.p
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: "spring" }}
      className="text-3xl font-black"
      style={{ 
        color: isWinner ? "#5EDAD0" : "#374151",
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

  // Get result icon and colors based on outcome
  const getResultConfig = () => {
    if (isWin) {
      return {
        icon: <Trophy className="w-16 h-16 text-amber-800" />,
        bg: "linear-gradient(135deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)",
        shadow: "0 12px 40px rgba(250, 204, 21, 0.5)",
        text: "გამარჯვება!",
      };
    }
    if (isDraw) {
      return {
        icon: <Target className="w-16 h-16 text-white" />,
        bg: "linear-gradient(135deg, #94A3B8 0%, #64748B 100%)",
        shadow: "0 12px 30px rgba(100, 116, 139, 0.3)",
        text: "ფრე",
      };
    }
    return {
      icon: <HelpCircle className="w-16 h-16 text-white" />,
      bg: "linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)",
      shadow: "0 12px 30px rgba(244, 63, 94, 0.3)",
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
      
      <div 
        className="h-[100dvh] w-full flex flex-col relative overflow-hidden"
        style={{ 
          background: "linear-gradient(180deg, #F5F5F7 0%, #FFFFFF 100%)",
        }}
      >
        {/* Header */}
        <motion.div 
          className="flex items-center px-4 pt-4 pb-2 relative z-30 shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button 
            onClick={handleBackToHome}
            className="p-3 rounded-2xl bg-white shadow-lg"
            whileTap={{ scale: 0.95 }}
            style={{
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            }}
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </motion.button>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center px-6 pt-6 relative z-10">
          
          {/* Result Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mb-4"
          >
            <div 
              className="w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: resultConfig.bg,
                boxShadow: resultConfig.shadow,
              }}
            >
              {resultConfig.icon}
            </div>
          </motion.div>

          {/* Result Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black mb-6"
            style={{
              fontFamily: "'TASolivare', sans-serif",
              color: "#7E7ADB",
            }}
          >
            {resultConfig.text}
          </motion.h1>

          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6"
            style={{
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div className="flex items-start justify-between pt-4">
              {/* Player */}
              <PlayerCard 
                avatarUrl={profile?.avatar_url} 
                name={profile?.nickname || "შენ"}
                score={userScore}
                isWinner={isWin}
                showWinnerBadge={isWin}
              />

              {/* VS Divider */}
              <div className="flex flex-col items-center justify-center h-full pt-8">
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
              <PlayerCard 
                avatarUrl={opponent?.avatarUrl} 
                name={opponent?.name || "მოწინააღმდეგე"}
                score={opponentScore}
                isWinner={!isWin && !isDraw}
                showWinnerBadge={!isWin && !isDraw}
              />
            </div>

            {/* Points Earned */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center pt-5 mt-5 border-t border-slate-100"
            >
              <p className="text-slate-400 text-sm mb-1">მიღებული ქულები</p>
              <p 
                className="text-3xl font-black"
                style={{ color: "#5EDAD0" }}
              >
                +{userScore}
              </p>
            </motion.div>
          </motion.div>

          {/* Action Buttons */}
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
