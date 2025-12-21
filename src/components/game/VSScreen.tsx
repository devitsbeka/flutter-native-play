import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag, getRankFromPoints } from "@/data/opponents";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/utils";

export function VSScreen() {
  const { opponent, startMatch } = useGame();
  const { profile } = useAuth();

  if (!opponent) return null;

  const playerRank = profile ? getRankFromPoints(profile.total_points) : { name: "Bronze", color: "text-muted-foreground" };
  const opponentRank = getRankFromPoints(opponent.points);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Main Container */}
      <div className="w-full max-w-sm space-y-8">
        
        {/* Player Card - Top Left aligned */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
          className="flex items-center gap-4"
        >
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center"
          >
            <span className="text-4xl">{profile?.avatar_url || "😊"}</span>
          </motion.div>

          {/* Info */}
          <div className="flex-1">
            <p className="font-bold text-xl text-foreground">You</p>
            <p className={cn("text-sm font-medium", playerRank.color)}>
              {playerRank.name} · {getCountryFlag(profile?.country_code || "US")}
            </p>
          </div>

          {/* Points */}
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              {profile?.total_points?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </motion.div>

        {/* VS Badge - Center with opponent info */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
          className="flex items-center justify-center gap-4"
        >
          <div className="flex-1" />
          
          <div className="w-14 h-14 rounded-full bg-foreground flex items-center justify-center shadow-lg">
            <span className="text-background font-bold text-lg">VS</span>
          </div>

          <div className="flex-1 flex items-center gap-3">
            <div>
              <p className="font-bold text-lg text-foreground">{opponent.name}</p>
              <p className={cn("text-sm font-medium", opponentRank.color)}>
                {opponentRank.name} · {getCountryFlag(opponent.countryCode)}
              </p>
            </div>
            
            {/* Opponent Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
              className="w-16 h-16 rounded-3xl bg-quiz-pink flex items-center justify-center"
            >
              <span className="text-3xl">{opponent.avatarEmoji}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Match Info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-16 text-muted-foreground text-sm"
      >
        Best of 5 · Answer fast for bonus points
      </motion.p>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: "spring" }}
        className="mt-8"
      >
        <ChunkyButton
          variant="primary"
          size="xl"
          onClick={startMatch}
          className="px-16"
        >
          Start Battle
        </ChunkyButton>
      </motion.div>
    </div>
  );
}
