import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag, getRankFromPoints } from "@/data/opponents";

export function VSScreen() {
  const { opponent, startMatch } = useGame();
  const { profile } = useAuth();

  if (!opponent) return null;

  const playerRank = profile ? getRankFromPoints(profile.total_points) : { name: "Bronze", color: "text-muted-foreground" };
  const opponentRank = getRankFromPoints(opponent.points);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* VS Container */}
      <div className="relative w-full max-w-sm">
        {/* Player Card */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
          className="glass rounded-3xl p-5 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
              {profile?.avatar_url || "😊"}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {profile?.nickname || "You"}
              </p>
              <p className="text-sm text-muted-foreground">
                {playerRank.name} · {getCountryFlag(profile?.country_code || "US")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">
                {profile?.total_points?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
          </div>
        </motion.div>

        {/* VS Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center">
            <span className="text-background font-bold text-sm">VS</span>
          </div>
        </motion.div>

        {/* Opponent Card */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
          className="glass rounded-3xl p-5 mt-6"
        >
          <div className="flex items-center gap-4">
            <div className="text-right flex-1">
              <p className="font-semibold text-foreground">
                {opponent.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {opponentRank.name} · {getCountryFlag(opponent.countryCode)}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-2xl">
              {opponent.avatarEmoji}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Match Info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 text-muted-foreground text-sm"
      >
        Best of 5 · Answer fast for bonus points
      </motion.p>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8"
      >
        <ChunkyButton
          variant="primary"
          size="xl"
          onClick={startMatch}
        >
          Start Battle
        </ChunkyButton>
      </motion.div>
    </div>
  );
}
