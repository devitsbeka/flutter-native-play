import { useEffect } from "react";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Home, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

export function MatchResultScreen() {
  const { userScore, opponentScore, opponent, resetGame, startMatchmaking } = useGame();
  const { user, profile, updateProfile } = useAuth();

  const isWin = userScore > opponentScore;
  const isDraw = userScore === opponentScore;
  const result = isWin ? "Victory" : isDraw ? "Draw" : "Defeat";

  useEffect(() => {
    if (isWin) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    }

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Trophy */}
      <motion.div
        initial={{ scale: 0, y: -30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mb-6",
          isWin ? "bg-primary" : "bg-secondary"
        )}
      >
        <Trophy className={cn(
          "w-12 h-12",
          isWin ? "text-primary-foreground" : "text-muted-foreground"
        )} />
      </motion.div>

      {/* Result */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "text-3xl font-bold mb-2",
          isWin ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {result}
      </motion.h1>

      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm glass rounded-3xl p-6 my-8"
      >
        <div className="flex items-center justify-between">
          {/* Player */}
          <div className="text-center flex-1">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl mx-auto mb-3">
              {profile?.avatar_url || "😊"}
            </div>
            <p className="font-medium text-foreground text-sm mb-1">
              {profile?.nickname || "You"}
            </p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="text-3xl font-bold text-foreground"
            >
              {userScore}
            </motion.p>
          </div>

          <div className="text-lg font-medium text-muted-foreground">vs</div>

          {/* Opponent */}
          <div className="text-center flex-1">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-2xl mx-auto mb-3">
              {opponent?.avatarEmoji}
            </div>
            <p className="font-medium text-foreground text-sm mb-1">
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

        {userScore > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center pt-5 mt-5 border-t border-border"
          >
            <p className="text-muted-foreground text-sm">Points Earned</p>
            <p className="text-xl font-bold text-primary">+{userScore}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col gap-3 w-full max-w-xs"
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
