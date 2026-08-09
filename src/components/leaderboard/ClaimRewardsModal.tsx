import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gem, Gift, Sparkles, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useLeaderboardRewards, WeeklyReward } from "@/hooks/useLeaderboardRewards";
import { useLanguage } from "@/contexts/LanguageContext";
import { EXCLUSIVE_FRAMES, LEADERBOARD_BADGES } from "@/config/leaderboardRewards";
import { Button } from "@/components/ui/button";
import { ChunkyButton } from "@/components/ui/chunky-button";
import confetti from "canvas-confetti";
import glitchIcon from "@/assets/glitch.png";

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
  const { t } = useLanguage();
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

  const handleClose = () => onOpenChange(false);

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

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-to-b from-[#FDFAFF] to-[#F6E8FF] flex flex-col"
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
              <Gift className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">{t("extra.weeklyRewards")}</h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
            ) : pendingRewards.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-3">
                  <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="text-muted-foreground">
                  {claimedIds.size > 0
                    ? t("extra.crmAllClaimed")
                    : t("extra.noNewRewards")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20"
                >
                  <p className="text-sm text-muted-foreground mb-2">{t("extra.totalRewardsLabel")}</p>
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
                    {t("extra.claimAllBtn")}
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
                                {t("extra.placeNLabel", { rank: reward.final_rank })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {categoryNames[reward.category_id] || t("extra.categoryFallback")}
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
                                {t("extra.claimBtn")}
                              </>
                            )}
                          </Button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
