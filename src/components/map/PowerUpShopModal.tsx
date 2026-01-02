import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PowerUpDemoPreview } from "./PowerUpDemoPreview";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { GameModal } from "@/components/ui/game-modal";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import coinIcon from "@/assets/icons/icon-coin.png";
import { REWARDS } from "@/config/rewardConfig";

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

const POWER_UP_INFO: PowerUpInfo[] = [
  {
    type: "5050",
    name: "50/50",
    description: "წაშლის 2 არასწორ პასუხს",
  },
  {
    type: "freeze",
    name: "გაყინვა",
    description: "აყინებს მოწინააღმდეგეს 5 წამით",
  },
  {
    type: "replace",
    name: "შეცვლა",
    description: "ცვლის ერთ არასწორ პასუხს",
  },
  {
    type: "time-drain",
    name: "დრო+",
    description: "ამატებს 3 წამს",
  },
];

const POWER_UP_PRICES: Record<PowerUpType, number> = REWARDS.POWER_UP_PRICES as Record<PowerUpType, number>;

export function PowerUpShopModal({ isOpen, onClose, initialSelectedType }: PowerUpShopModalProps) {
  const { powerUps, isLoading, addPowerUp } = useUserPowerUps();
  const { coins, spendCoins, canAffordCoins } = useCurrency();
  const { playSound, vibrate } = useSound();
  const [selectedType, setSelectedType] = useState<PowerUpType>(initialSelectedType || "5050");
  const [animationKey, setAnimationKey] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const selectedInfo = POWER_UP_INFO.find((p) => p.type === selectedType)!;
  const unitPrice = POWER_UP_PRICES[selectedType] || 100;
  const totalPrice = unitPrice * quantity;
  const canAfford = canAffordCoins(totalPrice);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(10, prev + delta)));
  };

  const handlePurchase = async () => {
    if (!canAfford) {
      toast.error("არ გაქვს საკმარისი მონეტა!");
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(true);
    try {
      const spent = await spendCoins(totalPrice);
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
      
      toast.success(`შეძენილია ${quantity}x ${selectedInfo.name}! ⚡`);
      
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("შეძენა ვერ მოხერხდა");
      playSound("wrong-answer");
    } finally {
      setIsPurchasing(false);
    }
  };

  // Custom header icon with coin balance
  const headerIcon = (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
          boxShadow: "0 4px 0 #C4B5FD, inset 0 2px 4px rgba(255, 255, 255, 0.6)",
        }}
        animate={{ rotate: [-5, 5, -5], y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-3xl">⚡</span>
      </motion.div>
      <div className="flex items-center gap-1.5 bg-amber-100 rounded-full px-3 py-1">
        <img src={coinIcon} alt="coins" className="w-4 h-4" />
        <span className="text-sm font-bold text-amber-700">
          {coins.toLocaleString()}
        </span>
      </div>
    </div>
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      icon={headerIcon}
      title="ძალები"
      subtitle="შეიძინე სუპერ ძალები"
      showSparkles
      footer={
        <ChunkyButton
          onClick={handlePurchase}
          disabled={isPurchasing || !canAfford}
          variant={canAfford ? "success" : "secondary"}
          className="w-full"
        >
          {isPurchasing ? (
            "იძენება..."
          ) : !canAfford ? (
            "არ გაქვს საკმარისი მონეტები"
          ) : (
            <>
              <img src={coinIcon} alt="" className="w-5 h-5 mr-2" />
              შეიძინე
            </>
          )}
        </ChunkyButton>
      }
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
        <div className="flex justify-center gap-3 mb-4">
          {POWER_UP_INFO.map((info) => {
            const isSelected = selectedType === info.type;
            const count = isLoading ? 0 : powerUps[info.type];

            return (
              <motion.button
                key={info.type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectPowerUp(info.type)}
                className={`relative rounded-2xl p-1 transition-all ${
                  isSelected
                    ? "ring-2 ring-primary bg-primary/10"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <PowerUpBadge 
                  type={info.type === "5050" ? "fifty-fifty" : info.type} 
                  size="sm" 
                  count={count}
                />
              </motion.button>
            );
          })}
        </div>

        {/* Quantity selector */}
        <div className="flex items-center justify-center gap-4 mb-4">
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

        {/* Total price with chunky coin badge */}
        <div className="text-center">
          <div 
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full"
            style={{
              background: "linear-gradient(180deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)",
              boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 #CA8A04, 0 4px 8px rgba(234,179,8,0.3)",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
          >
            <img src={coinIcon} alt="coins" className="w-5 h-5" />
            <span className="text-xl font-bold text-white drop-shadow-sm">
              {totalPrice.toLocaleString()}
            </span>
          </div>
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
              className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-2xl z-20"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: 2, duration: 0.3 }}
                  className="text-6xl mb-2"
                >
                  ✨
                </motion.div>
                <p className="text-lg font-bold text-foreground">წარმატებით შეიძინე!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameModal>
  );
}
