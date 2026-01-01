import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import confetti from "canvas-confetti";
import { useRewards } from "@/hooks/useRewards";
import { toast } from "sonner";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

interface ChestRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (newPoints?: number) => void;
}

const rewards = [
  { icon: coinIcon, isImage: true, label: `${REWARDS.CHEST_COINS} მონეტა`, type: "coins", value: REWARDS.CHEST_COINS, gradient: "from-amber-400 to-yellow-500" },
  { icon: gemIcon, isImage: true, label: `${REWARDS.CHEST_GEMS} ლალი`, type: "gems", value: REWARDS.CHEST_GEMS, gradient: "from-purple-400 to-pink-500" },
  { icon: "⭐", isImage: false, label: `${REWARDS.CHEST_XP} XP`, type: "xp", value: REWARDS.CHEST_XP, gradient: "from-blue-400 to-cyan-500" },
];

export function ChestRewardModal({ isOpen, onClose, onClaim }: ChestRewardModalProps) {
  const { recordChestReward } = useRewards();
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  const handleClaim = async () => {
    if (isClaiming) return;
    setIsClaiming(true);

    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      zIndex: 9999,
    });

    const result = await recordChestReward(
      rewards.map(r => ({ type: r.type, value: r.value, label: r.label }))
    );

    if (result.success) {
      toast.success("ჯილდოები მიღებულია! 🎉");
    }

    setIsClaiming(false);
    onClaim(result.newPoints);
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="gold"
      iconEmoji="🎁"
      title="სკივრი გახსნილია!"
      subtitle="გილოცავ! მიიღე შენი ჯილდოები"
      showSparkles
      showStars
    >
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
    </GameModal>
  );
}
