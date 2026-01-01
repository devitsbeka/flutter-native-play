import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus } from "lucide-react";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PowerUpDemoPreview } from "./PowerUpDemoPreview";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import coinIcon from "@/assets/icons/icon-coin.png";
import { REWARDS } from "@/config/rewardConfig";

interface PowerUpShopModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    name: "ჩანაცვლება",
    description: "ცვლის ერთ არასწორ პასუხს",
  },
  {
    type: "time-drain",
    name: "დრო+",
    description: "ამატებს 3 წამს",
  },
];

const POWER_UP_PRICES: Record<PowerUpType, number> = REWARDS.POWER_UP_PRICES as Record<PowerUpType, number>;

export function PowerUpShopModal({ isOpen, onClose }: PowerUpShopModalProps) {
  const { powerUps, isLoading, addPowerUp } = useUserPowerUps();
  const { coins, spendCoins, canAffordCoins } = useCurrency();
  const { playSound, vibrate } = useSound();
  const [selectedType, setSelectedType] = useState<PowerUpType>("5050");
  const [animationKey, setAnimationKey] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Restart animation when switching power-ups
  const handleSelectPowerUp = (type: PowerUpType) => {
    setSelectedType(type);
    setAnimationKey((prev) => prev + 1);
    setQuantity(1); // Reset quantity when switching
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
    }
  }, [isOpen]);

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
      // Spend coins first
      const spent = await spendCoins(totalPrice);
      if (!spent) {
        setIsPurchasing(false);
        return;
      }

      // Add power-ups
      await addPowerUp(selectedType, quantity);
      
      // Success feedback
      playSound("reward");
      vibrate([50, 30, 50]);
      setShowSuccess(true);
      
      // Confetti celebration
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6, x: 0.5 },
        colors: ["#7C5CFC", "#A855F7", "#FFD700", "#22C55E"],
        zIndex: 9999,
      });
      
      toast.success(`შეძენილია ${quantity}x ${selectedInfo.name}! ⚡`);
      
      // Close after short delay
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-card rounded-3xl border border-border shadow-2xl overflow-hidden relative">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-purple-500 to-indigo-500 px-6 pt-6 pb-8">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/30 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Title and coin balance */}
                <div className="pr-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">⚡</span>
                        <h2 className="text-xl font-bold text-white">ძალები</h2>
                      </div>
                      <p className="text-white/80 text-sm">შეიძინე სუპერ ძალები</p>
                    </div>
                    
                    {/* Coin balance */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5"
                    >
                      <img src={coinIcon} alt="coins" className="w-5 h-5" />
                      <span className="text-sm font-bold text-white">
                        {coins.toLocaleString()}
                      </span>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 -mt-4">
                {/* Power-up preview */}
                <div className="bg-muted/30 rounded-2xl border border-border p-4 mb-4">
                  <PowerUpDemoPreview
                    type={selectedType}
                    animationKey={animationKey}
                  />
                  
                  {/* Description */}
                  <motion.p
                    key={selectedType}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-muted-foreground text-sm mt-3"
                  >
                    <span className="font-semibold text-foreground">{selectedInfo.name}</span>
                    {" — "}
                    {selectedInfo.description}
                  </motion.p>
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
                  >
                    <Plus className="w-5 h-5 text-foreground" />
                  </motion.button>
                </div>

                {/* Total price */}
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <img src={coinIcon} alt="coins" className="w-6 h-6" />
                    <span className="text-2xl font-bold text-amber-500">
                      {totalPrice.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {POWER_UP_PRICES[selectedType]} × {quantity}
                  </p>
                </div>

                {/* Purchase button */}
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
              </div>

              {/* Success animation overlay */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-card/90 rounded-3xl z-20"
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}