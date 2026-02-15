import { motion } from "framer-motion";
import { LEAGUES } from "@/hooks/useLeagueLeaderboard";
import leagueTrophy from "@/assets/league-trophy.png";

// CSS filter styles for each league tier color (tier 1 uses original image)
const LEAGUE_FILTERS: Record<number, string> = {
  1: "sepia(1) saturate(2) hue-rotate(-25deg) brightness(0.7) contrast(1.1)", // Bronze (darker copper/brown)
  2: "saturate(0) brightness(1.1) contrast(0.95)", // Silver (grayscale with brightness)
  3: "sepia(1) saturate(5) hue-rotate(15deg) brightness(1.05)", // Gold
  4: "sepia(1) saturate(3) hue-rotate(170deg) brightness(1.1)", // Diamond (cyan/blue)
  5: "sepia(1) saturate(4) hue-rotate(250deg) brightness(1)", // Champion (purple)
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
                src={leagueTrophy}
                alt={league.name}
                className={`w-full h-full object-contain transition-all duration-300 ${
                  isActive ? "drop-shadow-lg" : "opacity-70"
                }`}
                style={{
                  filter: LEAGUE_FILTERS[league.tier],
                }}
              />
              
              {/* Selection indicator */}
              {isActive && (
                <motion.div
                  className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary"
                  layoutId="activeIndicator"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.div>
          </motion.button>
        );
      })}
    </div>
  );
}
