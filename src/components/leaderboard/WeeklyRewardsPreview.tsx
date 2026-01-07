import { motion } from "framer-motion";
import { Trophy, Coins, Gem, Clock, Crown, Medal, Award } from "lucide-react";
import { 
  WEEKLY_LEADERBOARD_REWARDS, 
  EXCLUSIVE_FRAMES,
  LEADERBOARD_BADGES,
  getDaysRemainingInWeek 
} from "@/config/leaderboardRewards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface WeeklyRewardsPreviewProps {
  currentRank?: number;
  trigger?: React.ReactNode;
  lightMode?: boolean;
}

export function WeeklyRewardsPreview({ 
  currentRank, 
  trigger,
  lightMode = false 
}: WeeklyRewardsPreviewProps) {
  const { t } = useLanguage();
  const daysRemaining = getDaysRemainingInWeek();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-amber-500" />;
      case 2: return <Medal className="h-5 w-5 text-slate-400" />;
      case 3: return <Award className="h-5 w-5 text-orange-500" />;
      default: return <span className="font-bold text-sm">{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-100 to-amber-100 border-amber-300";
      case 2:
        return "bg-gradient-to-r from-slate-100 to-gray-100 border-slate-300";
      case 3:
        return "bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300";
      default:
        return "bg-background/50 border-border/50";
    }
  };

  const getFrame = (frameId: string) => {
    return EXCLUSIVE_FRAMES.find(f => f.id === frameId);
  };

  const getBadge = (badgeId: string) => {
    return LEADERBOARD_BADGES.find(b => b.id === badgeId);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>{t('leaderboard.weeklyRewards') || 'კვირის ჯილდოები'}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            {t('leaderboard.weeklyRewards') || 'კვირის ჯილდოები'}
          </DialogTitle>
        </DialogHeader>

        {/* Timer */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20"
        >
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {daysRemaining} {t('leaderboard.daysLeft') || 'დღე დარჩენილია'}
          </span>
        </motion.div>

        {/* Current rank indicator */}
        {currentRank && currentRank <= 10 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-xl bg-emerald-50 border border-emerald-200"
          >
            <p className="text-sm text-emerald-700 font-medium">
              🎯 {t('leaderboard.youAreRanked') || 'შენ ხარ'} #{currentRank} - {t('leaderboard.keepPlaying') || 'გააგრძელე თამაში!'}
            </p>
          </motion.div>
        )}

        {/* Rewards list */}
        <div className="space-y-2">
          {WEEKLY_LEADERBOARD_REWARDS.map((reward, index) => {
            const frame = reward.frameId ? getFrame(reward.frameId) : null;
            const badge = reward.badgeId ? getBadge(reward.badgeId) : null;
            const isCurrentRank = currentRank === reward.rank;

            return (
              <motion.div
                key={reward.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-xl border-2 flex items-center gap-3 relative overflow-hidden ${
                  getRankStyle(reward.rank)
                } ${isCurrentRank ? "ring-2 ring-primary ring-offset-1" : ""}`}
              >
                {/* Rank */}
                <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                  {getRankIcon(reward.rank)}
                </div>

                {/* Rewards */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Coins */}
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-amber-500" />
                      <span className="font-bold text-amber-700">{reward.coins.toLocaleString()}</span>
                    </div>

                    {/* Gems */}
                    <div className="flex items-center gap-1">
                      <Gem className="h-4 w-4 text-purple-500" />
                      <span className="font-bold text-purple-700">{reward.gems}</span>
                    </div>

                    {/* Badge */}
                    {badge && (
                      <span className="text-lg" title={badge.name}>{badge.icon}</span>
                    )}
                  </div>

                  {/* Exclusive frame */}
                  {frame && (
                    <div className="mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${frame.gradient} text-white font-medium`}>
                        + {frame.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Current rank marker */}
                {isCurrentRank && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold"
                  >
                    შენ
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footer info */}
        <p className="text-xs text-muted-foreground text-center">
          {t('leaderboard.rewardsInfo') || 'ჯილდოები გაიცემა კვირის ბოლოს ავტომატურად'}
        </p>
      </DialogContent>
    </Dialog>
  );
}
