import { useEffect } from "react";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Home, RotateCcw, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import confetti from "canvas-confetti";

export function MatchResultScreen() {
  const { userScore, opponentScore, opponent, resetGame, startMatchmaking } = useGame();
  const { user, profile, updateProfile } = useAuth();

  const isWin = userScore > opponentScore;
  const isDraw = userScore === opponentScore;
  const result = isWin ? "Victory!" : isDraw ? "Draw" : "Defeat";

  useEffect(() => {
    if (isWin) {
      // Multiple confetti bursts
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
    <div className="min-h-screen flex flex-col">
      {/* Purple Header */}
      <div className={cn(
        "pt-12 pb-32 px-6 text-center",
        isWin ? "gradient-purple" : "bg-muted"
      )}>
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0, y: -30 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={cn(
            "w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4",
            isWin ? "bg-quiz-yellow" : "bg-secondary"
          )}
        >
          {isWin ? (
            <Trophy className="w-12 h-12 text-quiz-orange" />
          ) : (
            <Trophy className="w-12 h-12 text-muted-foreground" />
          )}
        </motion.div>

        {/* Result */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "text-4xl font-bold mb-2",
            isWin ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {result}
        </motion.h1>

        {/* Stars for win */}
        {isWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-2"
          >
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + star * 0.1, type: "spring" }}
              >
                <Star className="w-8 h-8 text-quiz-yellow fill-quiz-yellow" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* White Content Area */}
      <div className="flex-1 bg-background rounded-t-[2rem] -mt-6 relative z-10 p-6">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-3xl p-6 mb-6 shadow-lg -mt-16"
        >
          <div className="flex items-center justify-between">
            {/* You */}
            <div className="text-center flex-1">
              <Avatar emoji={profile?.avatar_url || "😊"} size="lg" className="mx-auto mb-2" />
              <p className="font-bold text-foreground text-sm mb-1">
                {profile?.nickname || "You"}
              </p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="text-4xl font-bold text-primary"
              >
                {userScore}
              </motion.p>
            </div>

            <div className="text-2xl font-bold text-muted-foreground">vs</div>

            {/* Opponent */}
            <div className="text-center flex-1">
              <Avatar emoji={opponent?.avatarEmoji || "🤖"} size="lg" className="mx-auto mb-2" />
              <p className="font-bold text-foreground text-sm mb-1">
                {opponent?.name}
              </p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="text-4xl font-bold text-muted-foreground"
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
              className="text-center pt-5 mt-5 border-t border-border"
            >
              <p className="text-muted-foreground text-sm">Points Earned</p>
              <p className="text-2xl font-bold text-primary">+{userScore}</p>
            </motion.div>
          )}
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col gap-3"
        >
          <ChunkyButton
            variant="primary"
            size="xl"
            className="w-full"
            onClick={() => startMatchmaking()}
            icon={<RotateCcw className="w-5 h-5" />}
          >
            Play Again
          </ChunkyButton>

          <ChunkyButton
            variant="secondary"
            size="xl"
            className="w-full"
            onClick={resetGame}
            icon={<Home className="w-5 h-5" />}
          >
            Back to Home
          </ChunkyButton>
        </motion.div>
      </div>
    </div>
  );
}
