import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag, getRankFromPoints } from "@/data/opponents";
import { AnimatedGlobe } from "@/components/shared/AnimatedGlobe";
import { cn } from "@/lib/utils";
import { Star, Trophy } from "lucide-react";

const getRankBadgeStyles = (rankName: string) => {
  switch (rankName.toLowerCase()) {
    case "grandmaster":
      return "bg-quiz-purple/20 text-quiz-purple border-quiz-purple/30";
    case "master":
      return "bg-quiz-pink/20 text-quiz-pink border-quiz-pink/30";
    case "diamond":
      return "bg-quiz-sky/20 text-quiz-sky border-quiz-sky/30";
    case "platinum":
      return "bg-primary/20 text-primary border-primary/30";
    case "gold":
      return "bg-quiz-yellow/20 text-quiz-yellow border-quiz-yellow/30";
    case "silver":
      return "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30";
    default:
      return "bg-quiz-coral/20 text-quiz-coral border-quiz-coral/30";
  }
};

export function VSScreen() {
  const { opponent, startMatch } = useGame();
  const { profile } = useAuth();

  if (!opponent) return null;

  const playerRank = profile ? getRankFromPoints(profile.total_points) : { name: "Bronze", color: "text-muted-foreground" };
  const opponentRank = getRankFromPoints(opponent.points);

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Globe Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <AnimatedGlobe className="w-[500px] h-[500px] text-primary/20" />
      </div>

      {/* Match Found Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="mb-6 relative z-10"
      >
        <h1 className="font-display text-3xl font-bold text-foreground text-center">
          Match Found!
        </h1>
        <p className="text-muted-foreground text-sm text-center mt-1">
          Get ready to battle
        </p>
      </motion.div>

      {/* Main Container */}
      <div className="w-full max-w-sm space-y-3 relative z-10">
        
        {/* Player Card */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
          className="bg-card/90 backdrop-blur-lg rounded-2xl p-4 border border-border/50 shadow-xl"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-14 h-14 rounded-xl bg-quiz-mint flex items-center justify-center flex-shrink-0 shadow-lg"
            >
              <span className="text-3xl">{profile?.avatar_url || "😊"}</span>
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-foreground text-lg">You</p>
                <span className="text-2xl">{getCountryFlag(profile?.country_code || "US")}</span>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                getRankBadgeStyles(playerRank.name)
              )}>
                <Trophy className="w-3 h-3" />
                {playerRank.name}
              </span>
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-4 h-4 text-quiz-yellow fill-quiz-yellow" />
                <p className="text-xl font-bold text-foreground">
                  {profile?.total_points?.toLocaleString() || 0}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
          </div>
        </motion.div>

        {/* VS Badge */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          className="flex items-center justify-center py-1"
        >
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-primary-foreground font-display text-xl font-bold">VS</span>
          </div>
        </motion.div>

        {/* Opponent Card */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
          className="bg-card/90 backdrop-blur-lg rounded-2xl p-4 border border-border/50 shadow-xl"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
              className="w-14 h-14 rounded-xl bg-quiz-pink flex items-center justify-center flex-shrink-0 shadow-lg"
            >
              <span className="text-3xl">{opponent.avatarEmoji}</span>
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-foreground text-lg truncate">{opponent.name}</p>
                <span className="text-2xl">{getCountryFlag(opponent.countryCode)}</span>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                getRankBadgeStyles(opponentRank.name)
              )}>
                <Trophy className="w-3 h-3" />
                {opponentRank.name}
              </span>
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-4 h-4 text-quiz-yellow fill-quiz-yellow" />
                <p className="text-xl font-bold text-foreground">
                  {opponent.points.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
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
