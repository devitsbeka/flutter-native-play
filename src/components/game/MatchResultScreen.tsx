import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Home, RotateCcw, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import confetti from "canvas-confetti";
import { calculateLevel } from "@/utils/levelCalculation";
import { LevelUpModal } from "@/components/home/LevelUpModal";

export function MatchResultScreen() {
  const { userScore, opponentScore, opponent, resetGame, startMatchmaking } = useGame();
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const isWin = userScore > opponentScore;
  const isDraw = userScore === opponentScore;
  const result = isWin ? "Victory!" : isDraw ? "Draw" : "Defeat";

  // Level up detection
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [previousLevel, setPreviousLevel] = useState(0);
  const hasCheckedLevelUp = useRef(false);

  const handleBackToHome = () => {
    resetGame();
    navigate("/");
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
    }

    if (user && profile && !hasCheckedLevelUp.current) {
      hasCheckedLevelUp.current = true;
      
      const updateStats = async () => {
        // Calculate level before and after
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

        // Check for level up after a short delay to let victory confetti finish
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
      <div className="h-full flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full">
      {/* Result Header */}
      <motion.div
        initial={{ scale: 0, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-3",
          isWin ? "bg-quiz-yellow" : "bg-secondary"
        )}
      >
        {isWin ? (
          <Trophy className="w-10 h-10 text-quiz-orange" />
        ) : (
          <Trophy className="w-10 h-10 text-muted-foreground" />
        )}
      </motion.div>

      {/* Result Text */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-bold text-foreground mb-1"
      >
        {result}
      </motion.h1>

      {/* Stars for win */}
      {isWin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center gap-1 mb-4"
        >
          {[1, 2, 3].map((star) => (
            <motion.div
              key={star}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3 + star * 0.1, type: "spring" }}
            >
              <Star className="w-6 h-6 text-quiz-yellow fill-quiz-yellow" />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full bg-background/95 backdrop-blur-lg rounded-2xl p-4 mb-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          {/* You */}
          <div className="text-center flex-1">
            <Avatar imageUrl={profile?.avatar_url || undefined} emoji="😊" size="md" className="mx-auto mb-1" />
            <p className="font-bold text-foreground text-xs mb-1">
              {profile?.nickname || "You"}
            </p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="text-3xl font-bold text-primary"
            >
              {userScore}
            </motion.p>
          </div>

          <div className="text-xl font-bold text-muted-foreground">vs</div>

          {/* Opponent */}
          <div className="text-center flex-1">
            <Avatar emoji={opponent?.avatarEmoji || "🤖"} size="md" className="mx-auto mb-1" />
            <p className="font-bold text-foreground text-xs mb-1">
              {opponent?.name}
            </p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="text-3xl font-bold text-muted-foreground"
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
            transition={{ delay: 0.6 }}
            className="text-center pt-3 mt-3 border-t border-border"
          >
            <p className="text-muted-foreground text-xs">Points Earned</p>
            <p className="text-xl font-bold text-primary">+{userScore}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="w-full flex flex-col gap-2"
      >
        <ChunkyButton
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => startMatchmaking()}
          icon={<RotateCcw className="w-4 h-4" />}
        >
          Play Again
        </ChunkyButton>

        <ChunkyButton
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={handleBackToHome}
          icon={<Home className="w-4 h-4" />}
        >
          Back to Home
        </ChunkyButton>
      </motion.div>
      </div>
    </>
  );
}
