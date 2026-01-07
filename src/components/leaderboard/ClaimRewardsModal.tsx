import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Coins, Gem, Gift, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { useLeaderboardRewards, WeeklyReward } from "@/hooks/useLeaderboardRewards";
import { EXCLUSIVE_FRAMES, LEADERBOARD_BADGES } from "@/config/leaderboardRewards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChunkyButton } from "@/components/ui/chunky-button";
import confetti from "canvas-confetti";

interface ClaimRewardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryNames?: Record<string, string>;
}

export function ClaimRewardsModal({ 
  open, 
  onOpenChange,
  categoryNames = {}
}: ClaimRewardsModalProps) {
  const { unclaimedRewards, claimReward, loading } = useLeaderboardRewards();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const handleClaim = async (reward: WeeklyReward) => {
    setClaimingId(reward.id);
    const success = await claimReward(reward.id);
    if (success) {
      setClaimedIds(prev => new Set([...prev, reward.id]));
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    setClaimingId(null);
  };

  const handleClaimAll = async () => {
    for (const reward of unclaimedRewards) {
      if (!claimedIds.has(reward.id)) {
        await handleClaim(reward);
      }
    }
  };

  const getFrame = (frameId: string | null) => {
    if (!frameId) return null;
    return EXCLUSIVE_FRAMES.find(f => f.id === frameId);
  };

  const getBadge = (badgeId: string | null) => {
    if (!badgeId) return null;
    return LEADERBOARD_BADGES.find(b => b.id === badgeId);
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return "🏆";
    }
  };

  const pendingRewards = unclaimedRewards.filter(r => !claimedIds.has(r.id));
  const totalCoins = pendingRewards.reduce((sum, r) => sum + r.coins_rewarded, 0);
  const totalGems = pendingRewards.reduce((sum, r) => sum + r.gems_rewarded, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            კვირის ჯილდოები
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
        ) : pendingRewards.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {claimedIds.size > 0 
                ? "ყველა ჯილდო მიღებულია! 🎉" 
                : "ახალი ჯილდოები არ გაქვს"}
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20"
            >
              <p className="text-sm text-muted-foreground mb-2">მთლიანი ჯილდოები:</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <span className="text-xl font-bold text-amber-600">
                    {totalCoins.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gem className="h-5 w-5 text-purple-500" />
                  <span className="text-xl font-bold text-purple-600">{totalGems}</span>
                </div>
              </div>
            </motion.div>

            {/* Claim All button */}
            {pendingRewards.length > 1 && (
              <ChunkyButton
                onClick={handleClaimAll}
                disabled={claimingId !== null}
                variant="mint"
                className="w-full"
              >
                <Gift className="h-4 w-4 mr-2" />
                მიიღე ყველა
              </ChunkyButton>
            )}

            {/* Individual rewards */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pendingRewards.map((reward, index) => {
                  const frame = getFrame(reward.frame_rewarded);
                  const badge = getBadge(reward.badge_rewarded);
                  const isClaiming = claimingId === reward.id;

                  return (
                    <motion.div
                      key={reward.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl border bg-card relative overflow-hidden"
                    >
                      {/* Rank badge */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{getRankEmoji(reward.final_rank)}</span>
                        <div>
                          <p className="font-bold">
                            #{reward.final_rank} ადგილი
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {categoryNames[reward.category_id] || "კატეგორია"}
                          </p>
                        </div>
                      </div>

                      {/* Rewards display */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-amber-500" />
                          <span className="font-bold text-amber-600">
                            {reward.coins_rewarded.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Gem className="h-4 w-4 text-purple-500" />
                          <span className="font-bold text-purple-600">
                            {reward.gems_rewarded}
                          </span>
                        </div>
                        {badge && <span className="text-xl">{badge.icon}</span>}
                      </div>

                      {/* Frame reward */}
                      {frame && (
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${frame.gradient} text-white mb-3`}>
                          + {frame.name}
                        </div>
                      )}

                      {/* Claim button */}
                      <Button
                        onClick={() => handleClaim(reward)}
                        disabled={isClaiming}
                        className="w-full"
                        variant="outline"
                      >
                        {isClaiming ? (
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        ) : (
                          <>
                            <Gift className="h-4 w-4 mr-2" />
                            მიიღე
                          </>
                        )}
                      </Button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
