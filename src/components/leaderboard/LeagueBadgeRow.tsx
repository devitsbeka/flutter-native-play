import { motion } from "framer-motion";
import { LEAGUES, LeagueInfo } from "@/hooks/useLeagueLeaderboard";

// League badge imports
import leagueBronze from "@/assets/leagues/league-bronze.png";
import leagueSilver from "@/assets/leagues/league-silver.png";
import leagueGold from "@/assets/leagues/league-gold.png";
import leagueDiamond from "@/assets/leagues/league-diamond.png";
import leagueChampion from "@/assets/leagues/league-champion.png";

const LEAGUE_BADGES: Record<number, string> = {
  1: leagueBronze,
  2: leagueSilver,
  3: leagueGold,
  4: leagueDiamond,
  5: leagueChampion,
};

interface LeagueBadgeRowProps {
  currentTier: number;
}

export function LeagueBadgeRow({ currentTier }: LeagueBadgeRowProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {LEAGUES.map((league) => {
        const isActive = league.tier === currentTier;
        const isLocked = league.tier > currentTier;
        const isPast = league.tier < currentTier;

        return (
          <motion.div
            key={league.tier}
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: league.tier * 0.1, duration: 0.3 }}
          >
            <motion.div
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isActive
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : ""
              }`}
              animate={
                isActive
                  ? {
                      scale: [1, 1.05, 1],
                    }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <img
                src={LEAGUE_BADGES[league.tier]}
                alt={league.name}
                className={`w-10 h-10 object-contain transition-all duration-300 ${
                  isLocked ? "grayscale opacity-40" : isPast ? "opacity-60" : ""
                }`}
              />
              
              {/* Active glow effect */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20 -z-10"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
            </motion.div>

            {/* Connector line */}
            {league.tier < 5 && (
              <div
                className={`absolute top-1/2 -right-2 w-2 h-0.5 -translate-y-1/2 ${
                  league.tier < currentTier
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                }`}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
