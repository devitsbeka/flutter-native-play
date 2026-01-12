import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LeagueInfo } from "@/hooks/useLeagueLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";
import { LeagueCountdown } from "./LeagueCountdown";

interface LeagueInfoCardProps {
  league: LeagueInfo;
  rankChange: number;
  isLocked?: boolean;
}

export function LeagueInfoCard({ league, rankChange, isLocked }: LeagueInfoCardProps) {
  const { t } = useLanguage();
  
  const getRankChangeDisplay = () => {
    if (rankChange === 0) {
      return {
        text: t('leaderboard.same'),
        icon: <Minus className="w-4 h-4" />,
        color: "text-foreground/70",
      };
    }
    if (rankChange > 0) {
      return {
        text: `${rankChange} ${t('leaderboard.positions')}`,
        icon: <TrendingUp className="w-4 h-4" />,
        color: "text-emerald-400",
      };
    }
    return {
      text: `${Math.abs(rankChange)} ${t('leaderboard.positions')}`,
      icon: <TrendingDown className="w-4 h-4" />,
      color: "text-rose-400",
    };
  };

  const rankDisplay = getRankChangeDisplay();

  return (
    <motion.div
      className="space-y-4 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Stats Row */}
      <div className="flex gap-3 justify-center">
        {/* Time Left - Using new countdown component */}
        <div className="flex-1 max-w-[180px]">
          <LeagueCountdown />
        </div>

        {/* Rank Change */}
        {!isLocked && (
          <motion.div
            className="flex-1 max-w-[150px] bg-card/80 backdrop-blur-md rounded-2xl p-4 border border-border/30 shadow-sm"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-xs text-foreground/70 uppercase tracking-wide mb-2 text-center font-medium">
              {t('leaderboard.today')}
            </div>
            <div className={`flex items-center justify-center gap-2 ${rankDisplay.color}`}>
              {rankDisplay.icon}
              <span className="text-lg font-bold">{rankDisplay.text}</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
