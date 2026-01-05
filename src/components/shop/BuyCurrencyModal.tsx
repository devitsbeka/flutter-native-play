import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Clock } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import { CurrencyType } from "./CurrencyActionModal";

interface BuyCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyType: CurrencyType;
}

// Enhanced coin packages with power-ups
const COIN_PACKAGES = [
  { 
    gems: 5, 
    coins: 250, 
    powers: { "5050": 1, freeze: 1 },
    label: "მცირე პაკეტი"
  },
  { 
    gems: 12, 
    coins: 600, 
    powers: { "5050": 2, freeze: 2, replace: 2 },
    label: "საშუალო პაკეტი",
    bonus: "+10%"
  },
  { 
    gems: 25, 
    coins: 1500, 
    powers: { "5050": 5, freeze: 5, replace: 5, "time-drain": 3 },
    label: "დიდი პაკეტი",
    bonus: "+20%"
  },
];

const POWER_ICONS: Record<string, string | null> = {
  "5050": fiftyFiftyIcon,
  freeze: freezeIcon,
  replace: replaceIcon,
  "time-drain": null, // Uses Clock icon
};

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
      
      toast.success(`მიიღე ${pkg.coins} მონეტა და ძალები!`, {
        icon: "🎁",
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
      title="პაკეტების შეძენა"
      icon={<img src={coinIcon} alt="" className="w-10 h-10" />}
      variant="primary"
    >
      <div className="space-y-3 pt-2">
        {COIN_PACKAGES.map((pkg, index) => {
          const canAfford = gems >= pkg.gems;
          const isPurchasingThis = isPurchasing === index;
          
          return (
            <motion.div
              key={index}
              className={`rounded-2xl p-4 transition-colors ${
                canAfford
                  ? "bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200"
                  : "bg-muted/50 border-2 border-transparent opacity-60"
              }`}
              whileHover={canAfford ? { scale: 1.01 } : {}}
            >
              {/* Package Label */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-foreground">{pkg.label}</span>
                {pkg.bonus && (
                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    {pkg.bonus}
                  </span>
                )}
              </div>

              {/* Contents */}
              <div className="space-y-2 mb-4">
                {/* Coins row */}
                <div className="flex items-center gap-2">
                  <img src={coinIcon} alt="" className="w-5 h-5" />
                  <span className="font-semibold text-amber-700">{pkg.coins.toLocaleString()} მონეტა</span>
                </div>
                
                {/* Powers row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Object.entries(pkg.powers).map(([type, count]) => (
                    <div 
                      key={type}
                      className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-lg border border-border/50"
                    >
                      {type === "time-drain" ? (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-b from-purple-300 to-purple-500 flex items-center justify-center">
                          <Clock className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <img src={POWER_ICONS[type]!} alt="" className="w-5 h-5" />
                      )}
                      <span className="text-xs font-bold text-foreground">×{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buy Button */}
              <motion.button
                onClick={() => handlePurchase(index)}
                disabled={!canAfford || isPurchasing !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-white"
                style={{
                  background: canAfford 
                    ? "linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%)"
                    : "hsl(var(--muted-foreground))",
                  boxShadow: canAfford 
                    ? "0 4px 0 #B45309, inset 0 1px 2px rgba(255,255,255,0.4)"
                    : "0 3px 0 hsl(var(--border))",
                }}
                whileHover={canAfford ? { y: -2 } : {}}
                whileTap={canAfford ? { y: 2, boxShadow: "0 0 0 #B45309" } : {}}
              >
                <img src={gemIcon} alt="" className="w-5 h-5" />
                <span>{isPurchasingThis ? "..." : `ყიდვა ${pkg.gems}`}</span>
              </motion.button>
            </motion.div>
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
