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
  const [purchasedAmount, setPurchasedAmount] = useState(0);

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
      setPurchasedAmount(quantity);
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
            className="fixed inset-0 z-50 bg-black/60"
          />

          {/* Modal Card - New whitish 3D chunky style */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-24 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50"
          >
            <div 
              className="rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
                boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0, 0, 0, 0.18)",
                border: "3px solid rgba(255, 255, 255, 0.95)",
              }}
            >
              {/* Header */}
              <div className="relative px-6 pt-5 pb-3">
                <motion.button
                  onClick={onClose}
                  className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  style={{ boxShadow: "0 3px 0 #D1D5DB" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, y: 2 }}
                >
                  <X className="w-4 h-4 text-gray-600" />
                </motion.button>

                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <h2 className="text-xl font-display font-bold text-gray-900">
                      ⚡ ძალები
                    </h2>
                    <p className="text-gray-500 text-sm">
                      შეიძინე სუპერ ძალები
                    </p>
                  </div>
                  {/* Show coin balance */}
                  <div 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                      boxShadow: "0 2px 0 #F59E0B",
                    }}
                  >
                    <img src={coinIcon} alt="" className="w-5 h-5" />
                    <span className="font-bold text-amber-700">{coins.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Demo Preview Area */}
              <div className="px-4">
                <div 
                  className="rounded-2xl overflow-hidden"
                  style={{
                    boxShadow: "0 3px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
                  }}
                >
                  <PowerUpDemoPreview
                    type={selectedType}
                    animationKey={animationKey}
                  />
                </div>
                
                {/* Description */}
                <motion.p
                  key={selectedType}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-gray-600 text-sm mt-3 mb-4"
                >
                  <span className="font-semibold text-gray-800">{selectedInfo.name}</span>
                  {" — "}
                  {selectedInfo.description}
                </motion.p>
              </div>

              {/* Power-up Selector Buttons - 3D chunky style */}
              <div className="px-4 pb-4">
                <div className="flex justify-center gap-3 mb-4">
                  {POWER_UP_INFO.map((info) => {
                    const isSelected = selectedType === info.type;
                    const count = isLoading ? 0 : powerUps[info.type];
                    
                    return (
                      <motion.button
                        key={info.type}
                        onClick={() => handleSelectPowerUp(info.type)}
                        whileTap={{ scale: 0.95, y: 2 }}
                        className="relative p-2 rounded-2xl transition-all"
                        style={{
                          background: isSelected
                            ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                            : "#F3F4F6",
                          boxShadow: isSelected
                            ? "0 3px 0 #C4B5FD"
                            : "0 2px 0 #E5E7EB",
                          border: isSelected
                            ? "2px solid #A78BFA"
                            : "2px solid transparent",
                        }}
                      >
                        <PowerUpBadge
                          type={info.type === "5050" ? "fifty-fifty" : info.type}
                          size="sm"
                          count={count}
                          disabled={count === 0}
                        />
                        
                        {/* Selection indicator */}
                        {isSelected && (
                          <motion.div
                            layoutId="selector"
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-500"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Quantity Selector - 3D chunky style */}
                <div className="flex items-center justify-center gap-4 mb-3">
                  <motion.button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    whileTap={{ scale: 0.9, y: 2 }}
                    className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    style={{
                      background: "#F3F4F6",
                      boxShadow: "0 3px 0 #D1D5DB",
                    }}
                  >
                    <Minus className="w-5 h-5 text-gray-600" />
                  </motion.button>
                  
                  <motion.span 
                    key={quantity}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-3xl font-bold text-gray-800 w-12 text-center"
                  >
                    {quantity}
                  </motion.span>
                  
                  <motion.button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= 10}
                    whileTap={{ scale: 0.9, y: 2 }}
                    className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    style={{
                      background: "#F3F4F6",
                      boxShadow: "0 3px 0 #D1D5DB",
                    }}
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </motion.button>
                </div>

                {/* Price Display */}
                <motion.div 
                  key={totalPrice}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="flex items-center justify-center gap-2 mb-4 px-4 py-2 rounded-full mx-auto w-fit"
                  style={{
                    background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                    boxShadow: "0 2px 0 #F59E0B",
                  }}
                >
                  <img src={coinIcon} alt="coins" className="w-6 h-6" />
                  <span className="text-xl font-bold text-amber-700">{totalPrice}</span>
                  <span className="text-amber-600 text-sm">მონეტა</span>
                </motion.div>

                {/* Buy Button */}
                <ChunkyButton
                  variant={canAfford ? "success" : "secondary"}
                  size="lg"
                  className="w-full"
                  onClick={handlePurchase}
                  disabled={isPurchasing || !canAfford}
                >
                  <img src={coinIcon} alt="" className="w-5 h-5" />
                  <span>{canAfford ? "შეძენა" : "არ გაქვს საკმარისი"}</span>
                  <span className="opacity-80">({totalPrice})</span>
                </ChunkyButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
