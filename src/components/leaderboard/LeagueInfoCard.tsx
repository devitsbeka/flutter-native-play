import { motion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LeagueInfo } from "@/hooks/useLeagueLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";

interface LeagueInfoCardProps {
  league: LeagueInfo;
  daysLeft: number;
  rankChange: number;
  isLocked?: boolean;
}

export function LeagueInfoCard({ league, daysLeft, rankChange, isLocked }: LeagueInfoCardProps) {
  const { t } = useLanguage();
  
  const getRankChangeDisplay = () => {
    if (rankChange === 0) {
      return {
        text: t('leaderboard.same'),
        icon: <Minus className="w-4 h-4" />,
        color: "text-muted-foreground",
      };
    }
    if (rankChange > 0) {
      return {
        text: `${rankChange} ${t('leaderboard.positions')}`,
        icon: <TrendingUp className="w-4 h-4" />,
        color: "text-emerald-500",
      };
    }
    return {
      text: `${Math.abs(rankChange)} ${t('leaderboard.positions')}`,
      icon: <TrendingDown className="w-4 h-4" />,
      color: "text-rose-500",
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
      {/* League Name */}
      <h1 className="text-2xl font-bold text-center text-foreground">
        {league.nameKa}
      </h1>

      {/* Stats Row */}
      <div className="flex gap-3 justify-center">
        {/* Time Left */}
        <motion.div
          className="flex-1 max-w-[150px] bg-card rounded-2xl p-4 border border-border"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 text-center">
            {t('leaderboard.timeRemaining')}
          </div>
          <div className="flex items-center justify-center gap-2 text-amber-500">
            <Clock className="w-4 h-4" />
            <span className="text-lg font-bold">{daysLeft} {t('leaderboard.days')}</span>
          </div>
        </motion.div>

        {/* Rank Change */}
        {!isLocked && (
          <motion.div
            className="flex-1 max-w-[150px] bg-card rounded-2xl p-4 border border-border"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 text-center">
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
