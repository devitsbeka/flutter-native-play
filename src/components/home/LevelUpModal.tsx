import { useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Gift } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { getLevelRewards } from "@/utils/levelCalculation";
import { useCurrency } from "@/hooks/useCurrency";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  previousLevel: number;
}

export function LevelUpModal({ isOpen, onClose, newLevel, previousLevel }: LevelUpModalProps) {
  const rewards = getLevelRewards(newLevel);
  const { addCurrency } = useCurrency();

  // Calculate level-up coins and gems
  const levelUpCoins = newLevel * REWARDS.LEVEL_UP_COINS_PER_LEVEL;
  const levelUpGems = newLevel >= REWARDS.LEVEL_UP_GEMS_THRESHOLD && newLevel % REWARDS.LEVEL_UP_GEMS_THRESHOLD === 0 
    ? Math.floor(newLevel / REWARDS.LEVEL_UP_GEMS_THRESHOLD) 
    : 0;

  useEffect(() => {
    if (isOpen) {
      // Credit level-up rewards
      addCurrency(levelUpCoins, levelUpGems);
    }
  }, [isOpen, addCurrency, levelUpCoins, levelUpGems]);

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title="დონე აიწია! 🎉"
      showSparkles
      showStars
      hideCloseButton
      disableBackdropClick
    >
      {/* Level Badge Animation */}
      <motion.div
        className="relative mx-auto mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
      >
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-40 blur-xl"
          style={{
            background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
          }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Level badge - 3D chunky style */}
        <div 
          className="relative w-28 h-28 mx-auto flex flex-col items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)",
            boxShadow: "0 6px 0 #F59E0B, inset 0 2px 8px rgba(255,255,255,0.8)",
            border: "4px solid #FBBF24",
          }}
        >
          <motion.span
            className="text-5xl font-display font-bold text-amber-600"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.5, stiffness: 200 }}
          >
            {newLevel}
          </motion.span>
          <span className="text-sm font-bold text-amber-700">დონე</span>
        </div>

        {/* Stars around badge */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.6 + i * 0.1, type: "spring" }}
            style={{
              left: `${50 + Math.cos((i * 2 * Math.PI) / 3 - Math.PI / 2) * 55}%`,
              top: `${50 + Math.sin((i * 2 * Math.PI) / 3 - Math.PI / 2) * 55}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Star className="w-6 h-6 text-amber-500 fill-amber-400 drop-shadow-lg" />
          </motion.div>
        ))}
      </motion.div>

      {/* Previous level info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-gray-600 text-base font-medium mb-4"
      >
        დონე {previousLevel} → დონე {newLevel}
      </motion.p>

      {/* Rewards section - 3D chunky card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
          boxShadow: "0 4px 0 #F59E0B, inset 0 1px 2px rgba(255,255,255,0.8)",
          border: "2px solid #FBBF24",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-amber-700" />
          <span className="font-bold text-lg text-amber-800">ჯილდოები</span>
        </div>
        <div className="flex justify-center gap-4 flex-wrap">
          <div className="text-center">
            <img src={coinIcon} alt="" className="w-8 h-8 mx-auto" />
            <p className="font-bold text-lg text-amber-800">+{levelUpCoins}</p>
            <p className="text-sm font-medium text-amber-700">მონეტა</p>
          </div>
          {levelUpGems > 0 && (
            <div className="text-center">
              <img src={gemIcon} alt="" className="w-8 h-8 mx-auto" />
              <p className="font-bold text-lg text-amber-800">+{levelUpGems}</p>
              <p className="text-sm font-medium text-amber-700">ლალი</p>
            </div>
          )}
          <div className="text-center">
            <span className="text-2xl">👑</span>
            <p className="font-bold text-lg text-amber-800">+{rewards.xpBonus}</p>
            <p className="text-sm font-medium text-amber-700">XP ბონუსი</p>
          </div>
          {rewards.powerUps > 0 && (
            <div className="text-center">
              <span className="text-2xl">⚡</span>
              <p className="font-bold text-lg text-amber-800">+{rewards.powerUps}</p>
              <p className="text-sm font-medium text-amber-700">ძალები</p>
            </div>
          )}
        </div>
      </motion.div>

      <GameModalFooter
        primaryLabel="გაგრძელება"
        onPrimary={onClose}
        primaryVariant="success"
      />
    </GameModal>
  );
}
