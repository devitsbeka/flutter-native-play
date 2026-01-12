import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Coins, Gem, Clock, ChevronLeft } from "lucide-react";
import { 
  WEEKLY_LEADERBOARD_REWARDS, 
  EXCLUSIVE_FRAMES,
  getDaysRemainingInWeek 
} from "@/config/leaderboardRewards";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface WeeklyRewardsPreviewProps {
  currentRank?: number;
  trigger?: React.ReactNode;
  lightMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WeeklyRewardsPreview({ 
  currentRank, 
  trigger,
  lightMode = false,
  open: controlledOpen,
  onOpenChange
}: WeeklyRewardsPreviewProps) {
  const { t } = useLanguage();
  const daysRemaining = getDaysRemainingInWeek();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <span className="text-2xl">🥇</span>;
      case 2: return <span className="text-2xl">🥈</span>;
      case 3: return <span className="text-2xl">🥉</span>;
      default: return <span className="font-bold text-lg text-muted-foreground">{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-amber-50 to-yellow-100 border-amber-300 shadow-amber-100/50";
      case 2:
        return "bg-gradient-to-r from-slate-50 to-gray-100 border-slate-300 shadow-slate-100/50";
      case 3:
        return "bg-gradient-to-r from-orange-50 to-amber-100 border-orange-300 shadow-orange-100/50";
      default:
        return "bg-background/50 border-border/50";
    }
  };

  const getFrame = (frameId: string) => {
    return EXCLUSIVE_FRAMES.find(f => f.id === frameId);
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      {/* Trigger */}
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>{t('leaderboard.weeklyRewards')}</span>
          </Button>
        )}
      </div>

      {/* Full-screen Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-foreground">{t('leaderboard.weeklyRewards')}</h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
              {/* Timer */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10"
              >
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-base font-medium">
                  {daysRemaining} {t('leaderboard.daysRemaining')}
                </span>
              </motion.div>

              {/* Current rank indicator */}
              {currentRank && currentRank <= 10 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                >
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    🎯 {t('leaderboard.youAreRanked')} #{currentRank} - {t('leaderboard.keepPlaying')}
                  </p>
                </motion.div>
              )}

              {/* Rewards list */}
              <div className="space-y-3">
                {WEEKLY_LEADERBOARD_REWARDS.map((reward, index) => {
                  const frame = reward.frameId ? getFrame(reward.frameId) : null;
                  const isCurrentRank = currentRank === reward.rank;

                  return (
                    <motion.div
                      key={reward.rank}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl border-2 flex items-center gap-4 relative shadow-sm ${
                        getRankStyle(reward.rank)
                      } ${isCurrentRank ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    >
                      {/* Medal icon */}
                      <div className="w-12 h-12 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                        {getRankIcon(reward.rank)}
                      </div>

                      {/* Rewards content */}
                      <div className="flex-1 min-w-0">
                        {/* Coins and Gems row */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Coins className="h-5 w-5 text-amber-500" />
                            <span className="font-bold text-amber-700 dark:text-amber-400">{reward.coins.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Gem className="h-5 w-5 text-purple-500" />
                            <span className="font-bold text-purple-700 dark:text-purple-400">{reward.gems}</span>
                          </div>
                        </div>

                        {/* Exclusive frame - Only for top 3 */}
                        {frame && (
                          <div className="mt-2">
                            <span className={`inline-block text-xs px-3 py-1.5 rounded-full bg-gradient-to-r ${frame.gradient} text-white font-medium shadow-sm whitespace-nowrap`}>
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
                          className="absolute -right-2 -top-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-bold shadow-md"
                        >
                          {t('leaderboard.you')}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer info */}
              <p className="text-xs text-muted-foreground text-center pt-2">
                {t('leaderboard.rewardsInfo')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
