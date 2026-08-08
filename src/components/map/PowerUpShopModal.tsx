import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PowerUpDemoPreview } from "./PowerUpDemoPreview";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";

import { GameModal } from "@/components/ui/game-modal";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import coinIcon from "@/assets/icons/icon-coin.png";
import { formatCompactNumber } from "@/lib/utils";
import { REWARDS } from "@/config/rewardConfig";

// Power icon for header
import powerIcon from "@/assets/icons/icon-powers.png";

interface PowerUpShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedType?: PowerUpType;
}

interface PowerUpInfo {
  type: PowerUpType;
  name: string;
  description: string;
}

const POWER_UP_TYPES: PowerUpType[] = ["5050", "freeze", "replace", "time-drain"];

const POWER_UP_PRICES: Record<PowerUpType, number> = REWARDS.POWER_UP_PRICES as Record<PowerUpType, number>;

export function PowerUpShopModal({ isOpen, onClose, initialSelectedType }: PowerUpShopModalProps) {
  const { powerUps, isLoading, addPowerUp } = useUserPowerUps();
  const { coins, spendCoins, canAffordCoins } = useCurrency();
  const { playSound, vibrate } = useSound();
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = useState<PowerUpType>(initialSelectedType || "5050");
  const [animationKey, setAnimationKey] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get translated power-up info
  const getPowerUpInfo = (type: PowerUpType) => {
    const names: Record<PowerUpType, string> = {
      "5050": "50/50",
      "freeze": t('extra.powerFreeze'),
      "replace": t('extra.powerReplace'),
      "time-drain": t('extra.powerTimeDrain'),
    };
    const descriptions: Record<PowerUpType, string> = {
      "5050": t('shop.deletesWrongAnswers'),
      "freeze": t('shop.freezesTime'),
      "replace": t('shop.replacesQuestion'),
      "time-drain": t('shop.addsTime'),
    };
    return { type, name: names[type], description: descriptions[type], displayName: names[type] };
  };

  // Restart animation when switching power-ups
  const handleSelectPowerUp = (type: PowerUpType) => {
    setSelectedType(type);
    setAnimationKey((prev) => prev + 1);
    setQuantity(1);
  };

  // Auto-loop animation every 4 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setAnimationKey((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, selectedType]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setShowSuccess(false);
      if (initialSelectedType) {
        setSelectedType(initialSelectedType);
      }
    }
  }, [isOpen, initialSelectedType]);

  const selectedInfo = getPowerUpInfo(selectedType);
  const unitPrice = POWER_UP_PRICES[selectedType] || 100;
  const totalPrice = unitPrice * quantity;
  const canAfford = canAffordCoins(totalPrice);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(10, prev + delta)));
  };

  const handlePurchase = async () => {
    if (!canAfford) {
      toast.error(t('shop.notEnoughCoins'));
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(true);
    try {
      const spent = await spendCoins(totalPrice, {
        productId: selectedType,
        productType: "powerup",
        valueReceived: { [selectedType]: quantity },
      });
      if (!spent) {
        setIsPurchasing(false);
        return;
      }

      await addPowerUp(selectedType, quantity);
      
      playSound("reward");
      vibrate([50, 30, 50]);
      setShowSuccess(true);
      
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6, x: 0.5 },
        colors: ["#7C5CFC", "#A855F7", "#FFD700", "#22C55E"],
        zIndex: 9999,
      });
      
      toast.success(t('shop.purchasedPower').replace('{count}', String(quantity)).replace('{name}', selectedInfo.displayName));
      
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error(t('shop.purchaseFailed'));
      playSound("wrong-answer");
    } finally {
      setIsPurchasing(false);
    }
  };

  // Coin balance pill in header right side (like main page)
  const headerRight = (
    <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5">
      <img src={coinIcon} alt="coins" className="w-4 h-4" />
      <span className="text-sm font-bold text-foreground">
        {formatCompactNumber(coins)}
      </span>
    </div>
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('shop.powerShop')}
      titleIcon={<img src={powerIcon} alt="" className="w-6 h-6 object-contain" />}
      subtitle={t('shop.buyPowers')}
      showSparkles
      headerActions={headerRight}
    >
      <div className="relative">
        {/* Power-up preview */}
        <div className="bg-muted/30 rounded-2xl border border-border p-3 mb-3">
          <PowerUpDemoPreview
            type={selectedType}
            animationKey={animationKey}
          />
        </div>

        {/* Power-up selector */}
        <div className="flex justify-center gap-3 mt-5 mb-6">
          {POWER_UP_TYPES.map((type) => {
            const isSelected = selectedType === type;
            const count = isLoading ? 0 : powerUps[type];

            return (
              <motion.button
                key={type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectPowerUp(type)}
                className={`relative rounded-2xl p-1 transition-all ${
                  isSelected
                    ? "ring-2 ring-primary bg-primary/10"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <PowerUpBadge 
                  type={type === "5050" ? "fifty-fifty" : type} 
                  size="xs" 
                  count={count}
                />
              </motion.button>
            );
          })}
        </div>

        {/* Quantity selector */}
        <div className="flex items-center justify-center gap-4 mt-[30px] mb-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center disabled:opacity-40"
            style={{ boxShadow: "0 2px 0 hsl(var(--border))" }}
          >
            <Minus className="w-5 h-5 text-foreground" />
          </motion.button>

          <div className="text-center min-w-[60px]">
            <span className="text-3xl font-bold text-foreground">{quantity}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= 10}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center disabled:opacity-40"
            style={{ boxShadow: "0 2px 0 hsl(var(--border))" }}
          >
            <Plus className="w-5 h-5 text-foreground" />
          </motion.button>
        </div>

        {/* Total price - clickable golden button to purchase */}
        <div className="text-center">
          <motion.button
            onClick={handlePurchase}
            disabled={isPurchasing || !canAfford}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: canAfford
                ? "linear-gradient(180deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)"
                : "linear-gradient(180deg, #D1D5DB 0%, #9CA3AF 100%)",
              boxShadow: canAfford
                ? "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 #CA8A04, 0 4px 8px rgba(234,179,8,0.3)"
                : "inset 0 2px 4px rgba(255,255,255,0.2), 0 3px 0 #6B7280",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
          >
            {isPurchasing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <img src={coinIcon} alt="coins" className="w-5 h-5" />
            )}
            <span className="text-xl font-bold text-amber-900 drop-shadow-sm">
              {totalPrice.toLocaleString()} {t('shop.buy')}
            </span>
          </motion.button>
          <p className="text-xs text-muted-foreground mt-2">
            {POWER_UP_PRICES[selectedType]} × {quantity}
          </p>
        </div>

        {/* Success animation overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-background/95 rounded-2xl z-20 overflow-hidden"
            >
              {/* Animated rings */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.3, opacity: 0.6 }}
                  animate={{ scale: 2.5 + i * 0.5, opacity: 0 }}
                  transition={{
                    duration: 1.2,
                    delay: i * 0.2,
                    ease: "easeOut",
                    repeat: 1,
                  }}
                  className="absolute rounded-full border-4 border-primary/40"
                  style={{ width: 80, height: 80 }}
                />
              ))}
              
              <div className="text-center relative z-10">
                {/* Bouncing emoji */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: [0, 1.3, 1], rotate: 0 }}
                  transition={{ 
                    duration: 0.6,
                    times: [0, 0.6, 1],
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="text-7xl mb-3"
                >
                  ⚡
                </motion.div>
                
                {/* Success text */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-bold text-foreground"
                >
                  {t('shop.purchasedSuccess')}
                </motion.p>
                
                {/* Quantity badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10"
                >
                  <span className="text-lg font-bold text-primary">
                    +{quantity}x {selectedInfo.displayName}
                  </span>
                </motion.div>

                {/* Floating particles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    initial={{ 
                      opacity: 0, 
                      x: 0, 
                      y: 0,
                      scale: 0,
                    }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      x: Math.cos((i * 45 * Math.PI) / 180) * 80,
                      y: Math.sin((i * 45 * Math.PI) / 180) * 80,
                      scale: [0, 1, 0.5],
                    }}
                    transition={{ 
                      duration: 1,
                      delay: 0.2 + i * 0.05,
                      ease: "easeOut",
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl"
                  >
                    ✨
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameModal>
  );
}
