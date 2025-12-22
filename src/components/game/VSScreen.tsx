import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag, getRankFromPoints } from "@/data/opponents";
import { AnimatedGlobe } from "@/components/shared/AnimatedGlobe";
import { cn } from "@/lib/utils";

export function VSScreen() {
  const { opponent, startMatch } = useGame();
  const { profile } = useAuth();

  if (!opponent) return null;

  const playerRank = profile ? getRankFromPoints(profile.total_points) : { name: "Bronze", color: "text-muted-foreground" };
  const opponentRank = getRankFromPoints(opponent.points);

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Globe Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatedGlobe className="w-[400px] h-[400px] text-primary/10" />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-sm space-y-4 relative z-10">
        
        {/* Player Card */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
          className="player-card flex items-center gap-3 p-3"
        >
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-12 h-12 rounded-xl bg-quiz-mint flex items-center justify-center flex-shrink-0"
          >
            <span className="text-2xl">{profile?.avatar_url || "😊"}</span>
          </motion.div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">You</p>
            <p className={cn("text-xs font-medium", playerRank.color)}>
              {playerRank.name} · {getCountryFlag(profile?.country_code || "US")}
            </p>
          </div>

          {/* Points */}
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-foreground">
              {profile?.total_points?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </motion.div>

        {/* VS Badge */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          className="flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center shadow-lg">
            <span className="text-background font-bold">VS</span>
          </div>
        </motion.div>

        {/* Opponent Card */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
          className="player-card flex items-center gap-3 p-3"
        >
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.5 }}
            className="w-12 h-12 rounded-xl bg-quiz-pink flex items-center justify-center flex-shrink-0"
          >
            <span className="text-2xl">{opponent.avatarEmoji}</span>
          </motion.div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{opponent.name}</p>
            <p className={cn("text-xs font-medium", opponentRank.color)}>
              {opponentRank.name} · {getCountryFlag(opponent.countryCode)}
            </p>
          </div>

          {/* Points */}
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-foreground">
              {opponent.points.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </motion.div>
      </div>

      {/* Match Info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 text-muted-foreground text-sm relative z-10"
      >
        Best of 5 · Answer fast for bonus points
      </motion.p>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: "spring" }}
        className="mt-6 relative z-10"
      >
        <ChunkyButton
          variant="primary"
          size="lg"
          onClick={startMatch}
          className="px-12"
        >
          Start Battle
        </ChunkyButton>
      </motion.div>
    </div>
  );
}
