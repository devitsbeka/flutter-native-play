import { useEffect } from "react";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Home, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

export function MatchResultScreen() {
  const { userScore, opponentScore, opponent, resetGame, startMatchmaking } = useGame();
  const { user, profile, updateProfile } = useAuth();

  const isWin = userScore > opponentScore;
  const isDraw = userScore === opponentScore;
  const result = isWin ? "Victory!" : isDraw ? "Draw!" : "Defeat";

  useEffect(() => {
    // Celebrate victory with confetti
    if (isWin) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // Update user stats if logged in
    if (user && profile) {
      const updateStats = async () => {
        await updateProfile({
          total_points: profile.total_points + userScore,
          games_played: profile.games_played + 1,
          games_won: isWin ? profile.games_won + 1 : profile.games_won,
          current_streak: isWin ? profile.current_streak + 1 : 0,
          best_streak: isWin 
            ? Math.max(profile.best_streak, profile.current_streak + 1)
            : profile.best_streak,
        });

        // Save game session
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
      };

      updateStats();
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-primary/10">
      {/* Result Icon */}
      <motion.div
        initial={{ scale: 0, y: -50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className={cn(
          "w-28 h-28 rounded-full flex items-center justify-center mb-6",
          isWin 
            ? "bg-gradient-to-br from-yellow-400 to-yellow-600" 
            : isDraw
              ? "bg-gradient-to-br from-gray-400 to-gray-600"
              : "bg-gradient-to-br from-gray-500 to-gray-700"
        )}
      >
        {isWin ? (
          <Trophy className="w-14 h-14 text-white" />
        ) : (
          <Medal className="w-14 h-14 text-white" />
        )}
      </motion.div>

      {/* Result Text */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "text-4xl font-bold mb-2",
          isWin ? "text-yellow-500" : isDraw ? "text-muted-foreground" : "text-muted-foreground"
        )}
      >
        {result}
      </motion.h1>

      {/* Final Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm bg-card rounded-3xl p-6 mb-6 shadow-lg border border-border"
      >
        <div className="flex items-center justify-between mb-4">
          {/* Player */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl mx-auto mb-2">
              {profile?.avatar_url || "😊"}
            </div>
            <p className="font-semibold text-foreground text-sm">
              {profile?.nickname || "You"}
            </p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="text-3xl font-bold text-primary mt-1"
            >
              {userScore}
            </motion.p>
          </div>

          {/* VS */}
          <div className="text-2xl font-bold text-muted-foreground">VS</div>

          {/* Opponent */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center text-2xl mx-auto mb-2">
              {opponent?.avatarEmoji}
            </div>
            <p className="font-semibold text-foreground text-sm">
              {opponent?.name}
            </p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="text-3xl font-bold text-destructive mt-1"
            >
              {opponentScore}
            </motion.p>
          </div>
        </div>

        {/* Points earned */}
        {userScore > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center pt-4 border-t border-border"
          >
            <p className="text-muted-foreground text-sm">Points Earned</p>
            <p className="text-2xl font-bold text-primary">+{userScore}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        <ChunkyButton
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => startMatchmaking()}
          icon={<RotateCcw className="w-5 h-5" />}
        >
          Play Again
        </ChunkyButton>

        <ChunkyButton
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={resetGame}
          icon={<Home className="w-5 h-5" />}
        >
          Home
        </ChunkyButton>
      </motion.div>
    </div>
  );
}
