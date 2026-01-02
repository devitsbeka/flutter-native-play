import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import chestBoxIcon from "@/assets/icons/icon-chest-box.png";
import confetti from "canvas-confetti";
import { useRewards } from "@/hooks/useRewards";
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

export function ChestRewardModal({ isOpen, onClose, onClaim }: ChestRewardModalProps) {
  const { recordChestReward } = useRewards();
  const { playSound, vibrate } = useSound();
  const [isClaiming, setIsClaiming] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [showFlyingGems, setShowFlyingGems] = useState(false);

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

    const result = await recordChestReward(
      rewards.map(r => ({ type: r.type, value: r.value, label: r.label }))
    );

    if (result.success) {
      toast.success("ჯილდოები მიღებულია! 🎉");
    }

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
    <motion.div
      className="relative w-16 h-16 rounded-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #EDE9FE 0%, #C4B5FD 100%)",
        boxShadow: "0 4px 0 #A78BFA, inset 0 2px 4px rgba(255, 255, 255, 0.6)",
      }}
      animate={{ rotate: [-5, 5, -5], y: [0, -2, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <img src={chestBoxIcon} alt="" className="w-10 h-10 object-contain" />
    </motion.div>
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="gold"
      icon={chestIcon}
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

      {/* Flying Currency Animations */}
      <FlyingCurrency type="coins" amount={REWARDS.CHEST_COINS} isActive={showFlyingCoins} />
      <FlyingCurrency type="gems" amount={REWARDS.CHEST_GEMS} isActive={showFlyingGems} />
    </GameModal>
  );
}
