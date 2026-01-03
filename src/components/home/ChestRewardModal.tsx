import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Clock } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import chestTabletIcon from "@/assets/icons/icon-chest-tablet.png";
import confetti from "canvas-confetti";
import { useRewards } from "@/hooks/useRewards";
import { useRewardTimers, useDailyRewardsClaim } from "@/hooks/useRewardTimers";
import { useSound } from "@/contexts/SoundContext";
import { toast } from "sonner";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { FlyingCurrency } from "@/components/shared/FlyingCurrency";

interface ChestRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (newPoints?: number) => void;
}

const rewards = [
  { icon: coinIcon, isImage: true, label: `${REWARDS.CHEST_COINS} მონეტა`, type: "coins", value: REWARDS.CHEST_COINS, gradient: "from-amber-400 to-yellow-500" },
  { icon: gemIcon, isImage: true, label: `${REWARDS.CHEST_GEMS} ალმასი`, type: "gems", value: REWARDS.CHEST_GEMS, gradient: "from-purple-400 to-pink-500" },
  { icon: "⭐", isImage: false, label: `${REWARDS.CHEST_XP} XP`, type: "xp", value: REWARDS.CHEST_XP, gradient: "from-blue-400 to-cyan-500" },
];

// Timer display component
const ChestTimer = ({ timeLeft }: { timeLeft: string }) => (
  <div className="flex flex-col items-center gap-3 py-6">
    <div 
      className="w-24 h-24 rounded-full flex items-center justify-center"
      style={{
        background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
        boxShadow: "0 4px 0 #FCD34D, 0 8px 24px rgba(252, 211, 77, 0.3)",
      }}
    >
      <Clock className="w-12 h-12 text-amber-600" />
    </div>
    <div className="text-center">
      <p className="text-sm text-muted-foreground mb-2">მომდევნო განძი</p>
      <div 
        className="px-6 py-3 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, #1F2937 0%, #111827 100%)",
          boxShadow: "0 4px 0 #000, inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        <span className="text-3xl font-bold text-white font-mono">{timeLeft}</span>
      </div>
    </div>
  </div>
);

export function ChestRewardModal({ isOpen, onClose, onClaim }: ChestRewardModalProps) {
  const { recordChestReward } = useRewards();
  const { canClaimChest, chestTimeLeft, refreshTimers } = useRewardTimers();
  const { claimChestReward } = useDailyRewardsClaim();
  const { playSound, vibrate } = useSound();
  const [isClaiming, setIsClaiming] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [showFlyingGems, setShowFlyingGems] = useState(false);

  useEffect(() => {
    if (isOpen && canClaimChest) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FFD700", "#FFA500", "#A855F7"],
          zIndex: 9999,
        });
      }, 300);
    }
  }, [isOpen, canClaimChest]);

  const handleClaim = async () => {
    if (isClaiming || !canClaimChest) return;
    setIsClaiming(true);

    // Play success sound and vibrate
    playSound("reward");
    vibrate([50, 30, 50, 30, 50]);

    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      zIndex: 9999,
    });

    // Trigger flying currency animations
    setShowFlyingCoins(true);
    setTimeout(() => setShowFlyingGems(true), 300);

    // Mark chest as claimed
    await claimChestReward();

    const result = await recordChestReward(
      rewards.map(r => ({ type: r.type, value: r.value, label: r.label }))
    );

    if (result.success) {
      toast.success("ჯილდოები მიღებულია! 🎉");
    }

    // Refresh timers
    refreshTimers();

    // Reset flying animations
    setTimeout(() => {
      setShowFlyingCoins(false);
      setShowFlyingGems(false);
    }, 1500);

    setIsClaiming(false);
    onClaim(result.newPoints);
  };

  // Custom header icon for chest
  const chestIcon = (
    <img src={chestTabletIcon} alt="" className="w-20 h-20 object-contain" />
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="gold"
      icon={chestIcon}
      title={canClaimChest ? "განძი გახსნილია!" : "განძი"}
      subtitle={canClaimChest ? "გილოცავ! მიიღე შენი ჯილდოები" : "მალე მზად იქნება!"}
      showSparkles={canClaimChest}
      showStars={canClaimChest}
    >
      {canClaimChest ? (
        <>
          {/* Rewards list */}
          <div className="space-y-2 mb-4">
            {rewards.map((reward, index) => (
              <motion.div
                key={reward.label}
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r ${reward.gradient} text-white`}
                style={{
                  boxShadow: "0 4px 0 rgba(0,0,0,0.15)",
                }}
              >
                <motion.span 
                  className="text-3xl flex items-center justify-center"
                  animate={{ 
                    rotate: [-5, 5, -5],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
                >
                  {reward.isImage ? (
                    <img src={reward.icon as string} alt="" className="w-8 h-8" />
                  ) : (
                    reward.icon
                  )}
                </motion.span>
                <span className="font-bold text-lg">{reward.label}</span>
              </motion.div>
            ))}
          </div>

          <GameModalFooter
            primaryLabel={isClaiming ? "იტვირთება..." : "მიღება"}
            onPrimary={handleClaim}
            primaryIcon={<Gift className="w-5 h-5" />}
            isLoading={isClaiming}
          />
        </>
      ) : (
        <ChestTimer timeLeft={chestTimeLeft} />
      )}

      {/* Flying Currency Animations */}
      <FlyingCurrency type="coins" amount={REWARDS.CHEST_COINS} isActive={showFlyingCoins} />
      <FlyingCurrency type="gems" amount={REWARDS.CHEST_GEMS} isActive={showFlyingGems} />
    </GameModal>
  );
}
