import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCurrency } from "./useCurrency";
import { 
  WEEKLY_LEADERBOARD_REWARDS, 
  getRewardForRank,
  getCurrentWeekBounds,
  getDaysRemainingInWeek 
} from "@/config/leaderboardRewards";
import { toast } from "sonner";

export interface WeeklyReward {
  id: string;
  category_id: string;
  category_name?: string;
  week_start_date: string;
  week_end_date: string;
  final_rank: number;
  total_stars: number;
  coins_rewarded: number;
  gems_rewarded: number;
  frame_rewarded: string | null;
  badge_rewarded: string | null;
  claimed_at: string | null;
}

export interface EarnedFrame {
  id: string;
  frame_id: string;
  category_id: string;
  category_name?: string;
  earned_at: string;
  week_earned: string;
  is_equipped: boolean;
}

export interface EarnedBadge {
  id: string;
  badge_id: string;
  category_id: string;
  category_name?: string;
  earned_at: string;
  times_earned: number;
}

export function useLeaderboardRewards(categoryId?: string) {
  const { user } = useAuth();
  const { addCurrency } = useCurrency();
  const [unclaimedRewards, setUnclaimedRewards] = useState<WeeklyReward[]>([]);
  const [earnedFrames, setEarnedFrames] = useState<EarnedFrame[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRewardsData = useCallback(async () => {
    if (!user) {
      setUnclaimedRewards([]);
      setEarnedFrames([]);
      setEarnedBadges([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch unclaimed rewards
      const { data: rewards, error: rewardsError } = await supabase
        .from("category_weekly_rewards")
        .select("*")
        .eq("user_id", user.id)
        .is("claimed_at", null);

      if (rewardsError) throw rewardsError;

      // Fetch earned frames
      const { data: frames, error: framesError } = await supabase
        .from("user_leaderboard_frames")
        .select("*")
        .eq("user_id", user.id);

      if (framesError) throw framesError;

      // Fetch earned badges
      const { data: badges, error: badgesError } = await supabase
        .from("user_leaderboard_badges")
        .select("*")
        .eq("user_id", user.id);

      if (badgesError) throw badgesError;

      setUnclaimedRewards(rewards || []);
      setEarnedFrames(frames || []);
      setEarnedBadges(badges || []);
    } catch (error) {
      console.error("Error fetching leaderboard rewards:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRewardsData();
  }, [fetchRewardsData]);

  // Claim a weekly reward
  const claimReward = async (rewardId: string): Promise<boolean> => {
    if (!user) return false;

    const reward = unclaimedRewards.find((r) => r.id === rewardId);
    if (!reward) return false;

    try {
      // Atomically mark as claimed; the .is() guard makes double-claims a no-op
      const { data: claimedRows, error: updateError } = await supabase
        .from("category_weekly_rewards")
        .update({ claimed_at: new Date().toISOString() })
        .eq("id", rewardId)
        .is("claimed_at", null)
        .select();

      if (updateError) throw updateError;

      if (!claimedRows || claimedRows.length === 0) {
        // Already claimed elsewhere — don't grant again
        setUnclaimedRewards((prev) => prev.filter((r) => r.id !== rewardId));
        return false;
      }

      // Grant coins/gems via the delta-based currency RPC (stale-profile safe)
      const granted = await addCurrency(reward.coins_rewarded, reward.gems_rewarded);
      if (!granted) {
        // Roll back the claim so the user can retry instead of losing the reward
        await supabase
          .from("category_weekly_rewards")
          .update({ claimed_at: null })
          .eq("id", rewardId);
        return false;
      }

      // If frame was rewarded, add to user_leaderboard_frames
      if (reward.frame_rewarded) {
        await supabase.from("user_leaderboard_frames").upsert({
          user_id: user.id,
          frame_id: reward.frame_rewarded,
          category_id: reward.category_id,
          week_earned: reward.week_start_date,
        }, { onConflict: "user_id,frame_id,category_id" });
      }

      // If badge was rewarded, add/update user_leaderboard_badges
      if (reward.badge_rewarded) {
        // Check if badge already exists
        const existingBadge = earnedBadges.find(
          (b) => b.badge_id === reward.badge_rewarded && b.category_id === reward.category_id
        );

        if (existingBadge) {
          await supabase
            .from("user_leaderboard_badges")
            .update({ times_earned: existingBadge.times_earned + 1 })
            .eq("id", existingBadge.id);
        } else {
          await supabase.from("user_leaderboard_badges").insert({
            user_id: user.id,
            badge_id: reward.badge_rewarded,
            category_id: reward.category_id,
            week_earned: reward.week_start_date,
          });
        }
      }

      // Update local state
      setUnclaimedRewards((prev) => prev.filter((r) => r.id !== rewardId));

      toast.success(`მიღებულია ${reward.coins_rewarded} მონეტა და ${reward.gems_rewarded} ალმასი!`);
      return true;
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("ჯილდოს მიღება ვერ მოხერხდა");
      return false;
    }
  };

  // Equip an earned leaderboard frame
  const equipFrame = async (frameId: string | null): Promise<boolean> => {
    if (!user) return false;

    try {
      // Unequip all frames first
      await supabase
        .from("user_leaderboard_frames")
        .update({ is_equipped: false })
        .eq("user_id", user.id);

      // Also unequip regular avatar frames
      await supabase
        .from("user_avatar_frames")
        .update({ is_equipped: false })
        .eq("user_id", user.id);

      if (frameId) {
        const { error } = await supabase
          .from("user_leaderboard_frames")
          .update({ is_equipped: true })
          .eq("user_id", user.id)
          .eq("frame_id", frameId);

        if (error) throw error;
      }

      setEarnedFrames((prev) =>
        prev.map((f) => ({
          ...f,
          is_equipped: f.frame_id === frameId,
        }))
      );

      toast.success(frameId ? "ჩარჩო აქტივირებულია!" : "ჩარჩო გამოირთო");
      return true;
    } catch (error) {
      console.error("Error equipping frame:", error);
      toast.error("ჩარჩოს აქტივაცია ვერ მოხერხდა");
      return false;
    }
  };

  // Get current week info
  const weekInfo = {
    ...getCurrentWeekBounds(),
    daysRemaining: getDaysRemainingInWeek(),
  };

  // Get potential rewards for user's current rank
  const getPotentialReward = (currentRank: number) => {
    return getRewardForRank(currentRank);
  };

  // Check if user has any equipped leaderboard frame
  const equippedFrame = earnedFrames.find((f) => f.is_equipped);

  return {
    unclaimedRewards,
    earnedFrames,
    earnedBadges,
    loading,
    claimReward,
    equipFrame,
    weekInfo,
    getPotentialReward,
    equippedFrame,
    totalUnclaimedCoins: unclaimedRewards.reduce((sum, r) => sum + r.coins_rewarded, 0),
    totalUnclaimedGems: unclaimedRewards.reduce((sum, r) => sum + r.gems_rewarded, 0),
    hasUnclaimedRewards: unclaimedRewards.length > 0,
    refreshRewards: fetchRewardsData,
  };
}
