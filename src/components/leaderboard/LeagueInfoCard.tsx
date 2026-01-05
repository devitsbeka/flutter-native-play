import { motion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LeagueInfo } from "@/hooks/useLeagueLeaderboard";

interface LeagueInfoCardProps {
  league: LeagueInfo;
  daysLeft: number;
  rankChange: number;
}

export function LeagueInfoCard({ league, daysLeft, rankChange }: LeagueInfoCardProps) {
  const getRankChangeDisplay = () => {
    if (rankChange === 0) {
      return {
        text: "იგივე პოზიცია",
        icon: <Minus className="w-4 h-4" />,
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
      };
    }
    if (rankChange > 0) {
      return {
        text: `▲ ${rankChange} პოზიცია`,
        icon: <TrendingUp className="w-4 h-4" />,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
      };
    }
    return {
      text: `▼ ${Math.abs(rankChange)} პოზიცია`,
      icon: <TrendingDown className="w-4 h-4" />,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
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
          className="flex-1 max-w-[140px] bg-card/50 backdrop-blur-sm rounded-xl p-3 border border-border/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Clock className="w-3 h-3" />
            <span>დარჩენილია</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {daysLeft} დღე
          </p>
        </motion.div>

        {/* Rank Change */}
        <motion.div
          className={`flex-1 max-w-[140px] rounded-xl p-3 border border-border/50 ${rankDisplay.bgColor}`}
          whileHover={{ scale: 1.02 }}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className={`flex items-center gap-2 text-xs mb-1 ${rankDisplay.color}`}>
            {rankDisplay.icon}
            <span>დღეს</span>
          </div>
          <p className={`text-lg font-bold ${rankDisplay.color}`}>
            {rankDisplay.text}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
