import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { CurrencyType } from "./CurrencyActionModal";

interface BuyCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyType: CurrencyType;
}

// Coin packages (buy coins with gems)
const COIN_PACKAGES = [
  { gems: 2, coins: 100, bonus: 0 },
  { gems: 5, coins: 275, bonus: 10 },
  { gems: 10, coins: 600, bonus: 20 },
  { gems: 25, coins: 1750, bonus: 40 },
];

export function BuyCurrencyModal({
  isOpen,
  onClose,
  currencyType,
}: BuyCurrencyModalProps) {
  const { gems, spendGems, addCoins } = useCurrency();
  const { playSound } = useSound();
  const [isPurchasing, setIsPurchasing] = useState<number | null>(null);

  const isCoins = currencyType === "coins";

  const handlePurchase = async (packageIndex: number) => {
    const pkg = COIN_PACKAGES[packageIndex];
    
    if (gems < pkg.gems) {
      toast.error("არ გაქვს საკმარისი ალმასი!");
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(packageIndex);

    try {
      const spent = await spendGems(pkg.gems);
      if (!spent) {
        setIsPurchasing(null);
        return;
      }

      await addCoins(pkg.coins);
      
      playSound("reward");
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 },
        colors: ["#fbbf24", "#f59e0b", "#d97706"],
      });
      
      toast.success(`მიიღე ${pkg.coins} მონეტა!`, {
        icon: "🪙",
      });
      
      onClose();
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("შეძენა ვერ მოხერხდა");
    } finally {
      setIsPurchasing(null);
    }
  };

  // Gems purchase - placeholder for future real money purchases
  if (!isCoins) {
    return (
      <GameModal
        isOpen={isOpen}
        onClose={onClose}
        title="ალმასების შეძენა"
        icon={<img src={gemIcon} alt="" className="w-10 h-10" />}
        variant="primary"
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-violet-500" />
          </div>
          <p className="text-center text-muted-foreground">
            ალმასების შეძენა მალე იქნება ხელმისაწვდომი!
          </p>
        </div>
      </GameModal>
    );
  }

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title="მონეტების შეძენა"
      icon={<img src={coinIcon} alt="" className="w-10 h-10" />}
      variant="primary"
    >
      <div className="space-y-2 pt-2">
        {COIN_PACKAGES.map((pkg, index) => {
          const canAfford = gems >= pkg.gems;
          const isPurchasingThis = isPurchasing === index;
          
          return (
            <motion.button
              key={index}
              onClick={() => handlePurchase(index)}
              disabled={!canAfford || isPurchasing !== null}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                canAfford
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 hover:border-amber-300"
                  : "bg-muted/50 border-2 border-transparent opacity-60"
              }`}
              whileHover={canAfford ? { scale: 1.01 } : {}}
              whileTap={canAfford ? { scale: 0.99 } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <img src={coinIcon} alt="" className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-foreground">
                    {pkg.coins.toLocaleString()} მონეტა
                  </div>
                  {pkg.bonus > 0 && (
                    <div className="text-xs text-green-600 font-medium">
                      +{pkg.bonus}% ბონუსი
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 bg-violet-100 px-3 py-1.5 rounded-full">
                <img src={gemIcon} alt="" className="w-4 h-4" />
                <span className="font-bold text-violet-700">{pkg.gems}</span>
              </div>
            </motion.button>
          );
        })}
        
        {/* Current balance */}
        <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
          <img src={gemIcon} alt="" className="w-4 h-4" />
          <span>ბალანსი: {gems}</span>
        </div>
      </div>
    </GameModal>
  );
}
