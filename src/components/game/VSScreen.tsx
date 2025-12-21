import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag, getRankFromPoints } from "@/data/opponents";
import { Swords } from "lucide-react";

export function VSScreen() {
  const { opponent, startMatch } = useGame();
  const { profile } = useAuth();

  if (!opponent) return null;

  const playerRank = profile ? getRankFromPoints(profile.total_points) : { name: "Bronze", color: "text-amber-600" };
  const opponentRank = getRankFromPoints(opponent.points);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-primary/10 overflow-hidden">
      {/* VS Container */}
      <div className="relative w-full max-w-md">
        {/* Player Card - Left */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
          className="bg-card rounded-3xl p-6 mb-8 shadow-lg border border-border"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl">
              {profile?.avatar_url || "😊"}
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-foreground">
                {profile?.nickname || "You"}
              </p>
              <p className={`text-sm ${playerRank.color}`}>
                {playerRank.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {getCountryFlag(profile?.country_code || "US")} {profile?.total_points.toLocaleString() || 0} pts
              </p>
            </div>
          </div>
        </motion.div>

        {/* VS Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center shadow-xl">
            <Swords className="w-10 h-10 text-destructive-foreground" />
          </div>
        </motion.div>

        {/* Opponent Card - Right */}
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
          className="bg-card rounded-3xl p-6 mt-8 shadow-lg border border-border"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 text-right">
              <p className="font-bold text-lg text-foreground">
                {opponent.name}
              </p>
              <p className={`text-sm ${opponentRank.color}`}>
                {opponent.rank}
              </p>
              <p className="text-sm text-muted-foreground">
                {opponent.points.toLocaleString()} pts {getCountryFlag(opponent.countryCode)}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center text-3xl">
              {opponent.avatarEmoji}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Match Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-center"
      >
        <p className="text-muted-foreground mb-2">Best of 5 Questions</p>
        <p className="text-sm text-muted-foreground/70">
          Answer fast for bonus points!
        </p>
      </motion.div>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-8"
      >
        <ChunkyButton
          variant="primary"
          size="xl"
          onClick={startMatch}
          className="px-16"
        >
          Start Battle!
        </ChunkyButton>
      </motion.div>
    </div>
  );
}
