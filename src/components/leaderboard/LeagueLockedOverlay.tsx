import { motion } from "framer-motion";
import { Lock, Trophy } from "lucide-react";
import { LeagueInfo, LEAGUES } from "@/hooks/useLeagueLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";
import leagueTrophy from "@/assets/league-trophy.png";

interface LeagueLockedOverlayProps {
  league: LeagueInfo;
  userTier: number;
}

export function LeagueLockedOverlay({ league, userTier }: LeagueLockedOverlayProps) {
  const { t } = useLanguage();
  const previousLeague = LEAGUES.find(l => l.tier === league.tier - 1);
  
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex flex-col items-center text-center px-8 max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* League badge with lock */}
        <div className="relative mb-6">
          <img
            src={leagueTrophy}
            alt={league.name}
            className="w-24 h-28 object-contain opacity-50"
            style={{ filter: "grayscale(1) brightness(0.8)" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shadow-lg">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-foreground mb-2">
          {league.nameKa}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground text-sm mb-6">
          {t('leaderboard.leagueLockedMessage').replace('{previousLeague}', previousLeague?.nameKa || "")}
        </p>

        {/* Unlock requirement */}
        <div className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              {t('leaderboard.requiredToUnlock')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('leaderboard.topPlace').replace('{league}', previousLeague?.nameKa || "")}
            </p>
          </div>
        </div>

        {/* Current tier info */}
        <p className="mt-6 text-xs text-muted-foreground">
          {t('leaderboard.youAreCurrentlyIn')} {LEAGUES.find(l => l.tier === userTier)?.nameKa}
        </p>
      </motion.div>
    </motion.div>
  );
}
