import { toastIcon, ICON_URLS } from "@/lib/toast-icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Clock } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { useCurrency } from "@/hooks/useCurrency";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
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

export function BuyCurrencyModal({
  isOpen,
  onClose,
  currencyType,
}: BuyCurrencyModalProps) {
  const { gems, spendGems, addCoins } = useCurrency();
  const { addPowerUp } = useUserPowerUps();
  const { playSound } = useSound();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isPurchasing, setIsPurchasing] = useState<number | null>(null);

  const isCoins = currencyType === "coins";

  // Enhanced coin packages with power-ups
  const COIN_PACKAGES = [
    { 
      gems: 5, 
      coins: 250, 
      powers: { "5050": 1, freeze: 1 },
      label: t("shop.smallPackage")
    },
    { 
      gems: 12, 
      coins: 600, 
      powers: { "5050": 2, freeze: 2, replace: 2 },
      label: t("shop.mediumPackage"),
      bonus: "+10%"
    },
    { 
      gems: 25, 
      coins: 1500, 
      powers: { "5050": 5, freeze: 5, replace: 5, "time-drain": 3 },
      label: t("shop.largePackage"),
      bonus: "+20%"
    },
  ];

  const POWER_ICONS: Record<string, string | null> = {
    "5050": fiftyFiftyIcon,
    freeze: freezeIcon,
    replace: replaceIcon,
    "time-drain": null, // Uses Clock icon
  };

  const handlePurchase = async (packageIndex: number) => {
    const pkg = COIN_PACKAGES[packageIndex];
    
    if (gems < pkg.gems) {
      toast.error(t("shop.notEnoughGems"));
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(packageIndex);

    try {
      const spent = await spendGems(pkg.gems, {
        productId: `coin_pack_${pkg.coins}`,
        productType: "coins",
        valueReceived: { coins: pkg.coins, ...pkg.powers },
      });
      if (!spent) {
        setIsPurchasing(null);
        return;
      }

      await addCoins(pkg.coins);

      // Grant the advertised power-ups (retry once on failure)
      let allPowersGranted = true;
      for (const [type, count] of Object.entries(pkg.powers)) {
        const powerType = type as PowerUpType;
        const granted =
          (await addPowerUp(powerType, count)) || (await addPowerUp(powerType, count));
        if (!granted) allPowersGranted = false;
      }

      playSound("reward");
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 },
        colors: ["#fbbf24", "#f59e0b", "#d97706"],
      });

      if (allPowersGranted) {
        toast.success(t("shop.receivedCoinsAndPowers").replace("{coins}", String(pkg.coins)), {
          icon: toastIcon(ICON_URLS.gift),
        });
      } else {
        // Powers didn't land — only advertise what was actually granted
        toast.success(t("shop.plusCoins").replace("{amount}", String(pkg.coins)), {
          icon: toastIcon(ICON_URLS.gift),
        });
        toast.error(t("shop.purchaseFailed"));
      }

      onClose();
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error(t("shop.purchaseFailed"));
    } finally {
      setIsPurchasing(null);
    }
  };

  // Gems are bought with real money — send the user to the live gem
  // packages section of the shop (previously this was a "coming soon"
  // dead end even though Stripe gem checkout already works).
  if (!isCoins) {
    return (
      <GameModal
        isOpen={isOpen}
        onClose={onClose}
        title={t("shop.buyGems")}
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <button
            onClick={() => {
              onClose();
              navigate("/power-ups?section=gems-lari");
            }}
            className="px-6 py-3 rounded-full font-bold text-primary-foreground"
            style={{
              background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.9) 100%)",
              boxShadow: "0 2px 0 hsl(var(--primary)/0.3), 0 2px 8px hsl(var(--primary)/0.2)",
            }}
          >
            {t("shop.buyGems")}
          </button>
        </div>
      </GameModal>
    );
  }

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("shop.buyPackages")}
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
                  ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-800"
                  : "bg-muted/50 border-2 border-transparent opacity-60"
              }`}
              whileHover={canAfford ? { scale: 1.01 } : {}}
            >
              {/* Package Label */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-foreground">{pkg.label}</span>
                {pkg.bonus && (
                  <span className="text-xs font-semibold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    {pkg.bonus}
                  </span>
                )}
              </div>

              {/* Contents */}
              <div className="space-y-2 mb-4">
                {/* Coins row */}
                <div className="flex items-center gap-2">
                  <img src={coinIcon} alt="" className="w-5 h-5" />
                  <span className="font-semibold text-amber-700 dark:text-amber-400">{pkg.coins.toLocaleString()} {t("shop.coin")}</span>
                </div>
                
                {/* Powers row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Object.entries(pkg.powers).map(([type, count]) => (
                    <div 
                      key={type}
                      className="flex items-center gap-1 bg-background/80 px-2 py-1 rounded-lg border border-border/50"
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
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-white disabled:opacity-50"
                style={{
                  background: canAfford 
                    ? "linear-gradient(180deg, hsl(45 93% 58%) 0%, hsl(37 91% 55%) 100%)"
                    : "hsl(var(--muted-foreground))",
                  boxShadow: canAfford 
                    ? "0 4px 0 hsl(28 80% 35%)"
                    : "0 3px 0 hsl(var(--border))",
                }}
                whileHover={canAfford ? { y: -2 } : {}}
                whileTap={canAfford ? { y: 2, boxShadow: "0 0 0 hsl(28 80% 35%)" } : {}}
              >
                <img src={gemIcon} alt="" className="w-5 h-5" />
                <span>{isPurchasingThis ? "..." : t("shop.buyFor").replace("{price}", String(pkg.gems))}</span>
              </motion.button>
            </motion.div>
          );
        })}
        
        {/* Current balance */}
        <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
          <img src={gemIcon} alt="" className="w-4 h-4" />
          <span>{t("shop.balance")}: {gems}</span>
        </div>
      </div>
    </GameModal>
  );
}
