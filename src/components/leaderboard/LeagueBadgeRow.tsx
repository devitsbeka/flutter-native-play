import { motion } from "framer-motion";
import { LEAGUES } from "@/hooks/useLeagueLeaderboard";

// League badge imports
import leagueBronze from "@/assets/leagues/league-bronze.png";
import leagueSilver from "@/assets/leagues/league-silver.png";
import leagueGold from "@/assets/leagues/league-gold.png";
import leagueDiamond from "@/assets/leagues/league-diamond.png";
import leagueChampion from "@/assets/leagues/league-champion.png";

export const LEAGUE_BADGES: Record<number, string> = {
  1: leagueBronze,
  2: leagueSilver,
  3: leagueGold,
  4: leagueDiamond,
  5: leagueChampion,
};

interface LeagueBadgeRowProps {
  currentTier: number;
  userTier: number;
  onSelectTier: (tier: number) => void;
}

export function LeagueBadgeRow({ currentTier, userTier, onSelectTier }: LeagueBadgeRowProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-6 px-4">
      {LEAGUES.map((league) => {
        const isActive = league.tier === currentTier;
        const isLocked = league.tier > userTier;
        const isUnlocked = league.tier <= userTier;

        return (
          <motion.button
            key={league.tier}
            onClick={() => onSelectTier(league.tier)}
            className="relative focus:outline-none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: league.tier * 0.08, duration: 0.3 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className={`relative w-14 h-16 flex items-center justify-center transition-all duration-300`}
              animate={
                isActive
                  ? {
                      y: [0, -4, 0],
                    }
                  : {}
              }
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <img
                src={LEAGUE_BADGES[league.tier]}
                alt={league.name}
                className={`w-full h-full object-contain transition-all duration-300 ${
                  isLocked 
                    ? "grayscale opacity-40" 
                    : isActive 
                      ? "drop-shadow-lg" 
                      : "opacity-70"
                }`}
              />
              
              {/* Selection indicator */}
              {isActive && (
                <motion.div
                  className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary"
                  layoutId="activeIndicator"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              {/* Lock overlay for locked tiers */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.button>
        );
      })}
    </div>
  );
}
