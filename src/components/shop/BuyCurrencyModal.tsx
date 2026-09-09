import { toastIcon, ICON_URLS } from "@/lib/toast-icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Clock } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { useCurrency } from "@/hooks/useCurrency";
import { STARTER_BUNDLES } from "@/config/shopValue";
import { ALL_POWER_TYPES } from "@/config/bundleContents";
import { useUserPowerUps } from "@/hooks/useUserPowerUps";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/lib/toast";
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
  const { gems, purchaseShopItem } = useCurrency();
  const { refetch: refetchPowerUps } = useUserPowerUps();
  const { playSound } = useSound();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isPurchasing, setIsPurchasing] = useState<number | null>(null);

  const isCoins = currencyType === "coins";

  // The "not enough coins" modal sells the shop's own starter packs.
  //
  // It had a FOURTH catalogue of its own — 5 gems for 250 coins, 12 for 600,
  // 25 for 1500 — which is 50 to 60 coins per gem against an exchange rate of
  // 500 and a shop that sells 625. Ten times the price, on the screen a player
  // reaches when they have just run out, with "+10%" and "+20%" bonus flags
  // measured against nothing. The power-ups bundled alongside did not come
  // close to covering the gap: the smallest pack was still about twice its
  // contents' worth.
  //
  // This is the same fix the "not enough gems" modal already got — read the
  // canonical prices instead of carrying a second set — and STARTER_BUNDLES is
  // where they live, with both prices derived from the contents.
  const LABELS = [t("shop.smallPackage"), t("shop.mediumPackage"), t("shop.largePackage")];
  const COIN_PACKAGES = STARTER_BUNDLES.map((bundle, i) => ({
    id: bundle.id,
    gems: bundle.price,
    coins: bundle.contents.coins,
    powers: Object.fromEntries(
      ALL_POWER_TYPES.map((type) => [type, bundle.contents.powers]),
    ) as Record<string, number>,
    label: LABELS[i] ?? bundle.id,
    bonus: bundle.savings > 0 ? `-${bundle.savings}%` : undefined,
  }));

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
      // One call: coins and power-ups arrive with the debit or not at all.
      // The retry-once-per-power-type loop that used to be here existed
      // because the grant was a separate trip that could fail after the gems
      // were gone. It cannot any more.
      const result = await purchaseShopItem(pkg.id);
      if (!result) {
        setIsPurchasing(null);
        return;
      }

      await refetchPowerUps();

      playSound("reward");
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 },
        colors: ["#fbbf24", "#f59e0b", "#d97706"],
      });

      // One branch now. The "powers didn't land" message existed because the
      // power grant was a separate call that could fail after the gems were
      // taken; the purchase is one transaction, so there is no such state.
      {
        toast.success(t("shop.receivedCoinsAndPowers").replace("{coins}", String(pkg.coins)), {
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
