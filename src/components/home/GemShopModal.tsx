import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Crown, Zap, Star, Check } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { useVipStatus, VipDuration } from "@/hooks/useVipStatus";
import { useShopData } from "@/hooks/useShopData";
import { REWARDS } from "@/config/rewardConfig";
import { useUserPowerUps } from "@/hooks/useUserPowerUps";
import { useLanguage } from "@/contexts/LanguageContext";
import { AvatarFrameShop } from "@/components/home/AvatarFrameShop";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";

interface GemShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
}

import powerIcon5050 from "@/assets/powers/5050.png";
import powerIconFreeze from "@/assets/powers/freeze.png";
import powerIconReplace from "@/assets/powers/replace.png";
import { PowerUpType } from "@/hooks/useUserPowerUps";
import { TimeIcon } from "@/components/shared/TimeIcon";

interface ShopItem {
  id: string;
  nameKey: string;
  descriptionKey: string;
  price: number;
  icon: React.ReactNode;
  category: "powerup" | "vip" | "coins";
  value?: number;
  gradient: string;
  popular?: boolean;
  vipDuration?: VipDuration;
  powerType?: PowerUpType;
  amount?: number;
}

// NOTE: `price` values below are fallbacks only — the effective price is resolved
// at render/purchase time from useShopData / rewardConfig (see getItemPrice).
const SHOP_ITEMS: ShopItem[] = [
  // Coin Packs (1 gem = 500 coins, REWARDS.GEM_TO_COINS_RATE)
  {
    id: "coins_500",
    nameKey: "500",
    descriptionKey: "smallPackage",
    price: 1,
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    category: "coins",
    value: 500,
    gradient: "from-amber-400 to-yellow-500",
  },
  {
    id: "coins_1500",
    nameKey: "1500",
    descriptionKey: "mediumPackage",
    price: 3,
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    category: "coins",
    value: 1500,
    gradient: "from-amber-500 to-orange-500",
    popular: true,
  },
  {
    id: "coins_5000",
    nameKey: "5000",
    descriptionKey: "largePackage",
    price: 9,
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    category: "coins",
    value: 5000,
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: "coins_10000",
    nameKey: "10000",
    descriptionKey: "hugePackage",
    price: 20,
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    category: "coins",
    value: 10000,
    gradient: "from-red-500 to-rose-600",
  },
  // Individual Power-Ups
  {
    id: "power_5050",
    nameKey: "5050x3",
    descriptionKey: "deletesWrongAnswers",
    price: 3,
    icon: <img src={powerIcon5050} alt="" className="w-8 h-8" />,
    category: "powerup",
    gradient: "from-rose-400 to-pink-500",
    powerType: "5050",
    amount: 3,
  },
  {
    id: "power_freeze",
    nameKey: "freezex3",
    descriptionKey: "freezesTime",
    price: 3,
    icon: <img src={powerIconFreeze} alt="" className="w-8 h-8" />,
    category: "powerup",
    gradient: "from-cyan-400 to-blue-500",
    powerType: "freeze",
    amount: 3,
  },
  {
    id: "power_replace",
    nameKey: "replacex3",
    descriptionKey: "replacesQuestion",
    price: 3,
    icon: <img src={powerIconReplace} alt="" className="w-8 h-8" />,
    category: "powerup",
    gradient: "from-emerald-400 to-green-500",
    powerType: "replace",
    amount: 3,
  },
  {
    id: "power_timedrain",
    nameKey: "timePlusx3",
    descriptionKey: "addsTime",
    price: 3,
    icon: <TimeIcon size={32} />,
    category: "powerup",
    gradient: "from-violet-400 to-purple-500",
    powerType: "time-drain",
    amount: 3,
  },
  // Power Bundles
  {
    id: "power_bundle_small",
    nameKey: "smallPackage",
    descriptionKey: "allPowers2x",
    price: 7,
    icon: <Zap className="w-8 h-8 text-blue-400" />,
    category: "powerup",
    gradient: "from-sky-300 to-blue-400",
  },
  {
    id: "power_bundle",
    nameKey: "mediumPackage",
    descriptionKey: "allPowers5x",
    price: 16,
    icon: <Zap className="w-8 h-8 text-blue-500" />,
    category: "powerup",
    gradient: "from-blue-400 to-cyan-500",
    popular: true,
  },
  {
    id: "power_bundle_large",
    nameKey: "largePackage",
    descriptionKey: "allPowers10x",
    price: 28,
    icon: <Zap className="w-8 h-8 text-indigo-500" />,
    category: "powerup",
    gradient: "from-indigo-500 to-purple-600",
  },
  // VIP Features
  {
    id: "vip_day",
    nameKey: "vipDay",
    descriptionKey: "vipBenefitsDay",
    price: 30,
    icon: <Crown className="w-8 h-8 text-amber-400" />,
    category: "vip",
    gradient: "from-amber-300 to-yellow-500",
    vipDuration: "day",
  },
  {
    id: "vip_week",
    nameKey: "vipWeek",
    descriptionKey: "vipBenefitsWeek",
    price: 100,
    icon: <Crown className="w-8 h-8 text-amber-500" />,
    category: "vip",
    gradient: "from-purple-500 to-pink-500",
    popular: true,
    vipDuration: "week",
  },
  {
    id: "vip_month",
    nameKey: "vipMonth",
    descriptionKey: "vipBenefitsMonth",
    price: 250,
    icon: <Star className="w-8 h-8 text-amber-400 fill-amber-400" />,
    category: "vip",
    gradient: "from-amber-400 to-pink-500",
    vipDuration: "month",
  },
];

// Helper function to get item display name
function getItemDisplayName(item: ShopItem, t: (key: string) => string): string {
  if (item.category === "coins") {
    return `${item.nameKey} ${t('shop.coin')}`;
  }
  if (item.nameKey.includes("x3")) {
    const powerName = item.nameKey.replace("x3", "");
    if (powerName === "5050") return "50/50 ×3";
    if (powerName === "freeze") return `${t('shop.freeze')} ×3`;
    if (powerName === "replace") return `${t('shop.replace')} ×3`;
    if (powerName === "timePlus") return `${t('shop.timePlus')} ×3`;
  }
  return t(`shop.${item.nameKey}`);
}

// Helper function to get item description
function getItemDescription(item: ShopItem, t: (key: string) => string): string {
  if (item.descriptionKey === "allPowers2x") return `2x ${t('shop.allPowers')}`;
  if (item.descriptionKey === "allPowers5x") return `5x ${t('shop.allPowers')}`;
  if (item.descriptionKey === "allPowers10x") return `10x ${t('shop.allPowers')}`;
  return t(`shop.${item.descriptionKey}`);
}

const CATEGORY_KEYS = [
  { id: "all", nameKey: "tabAll", icon: "🛒" },
  { id: "coins", nameKey: "tabCoins", icon: "🪙" },
  { id: "powerup", nameKey: "tabPowers", icon: "⚡" },
  { id: "vip", nameKey: "tabVip", icon: "👑" },
  { id: "frames", nameKey: "tabFrames", icon: "🎨" },
];

// Local item ids whose canonical price lives under a different id in useShopData
const CANONICAL_PRICE_IDS: Record<string, string> = {
  power_5050: "power_5050_3",
  power_freeze: "power_freeze_3",
  power_replace: "power_replace_3",
  power_timedrain: "power_timedrain_3",
  power_bundle: "mega_power_bundle",
  vip_week: "vip_week_deal",
};

export function GemShopModal({ isOpen, onClose, defaultCategory }: GemShopModalProps) {
  const { gems, spendGems, addCoins } = useCurrency();
  const { playSound } = useSound();
  const { activateVip, isVip, getDaysRemaining } = useVipStatus();
  const { addPowerUp } = useUserPowerUps();
  const { SHOP_SECTIONS } = useShopData();
  const { t } = useLanguage();

  // Gem prices sourced from useShopData so this modal can't drift from the main shop
  const canonicalPrices = useMemo(() => {
    const map = new Map<string, number>();
    SHOP_SECTIONS.forEach((section) =>
      section.items.forEach((i) => {
        if (i.currency === "gems") map.set(i.id, i.price);
      })
    );
    return map;
  }, [SHOP_SECTIONS]);

  const getItemPrice = (item: ShopItem): number => {
    if (item.category === "vip" && item.vipDuration) {
      const vipPrice = (REWARDS.VIP_PRICES as Record<string, number>)[item.vipDuration];
      if (vipPrice !== undefined) return vipPrice;
    }
    const canonical = canonicalPrices.get(CANONICAL_PRICE_IDS[item.id] ?? item.id);
    if (canonical !== undefined) return canonical;
    if (item.category === "coins" && item.value) {
      return Math.max(1, Math.round(item.value / REWARDS.GEM_TO_COINS_RATE));
    }
    return item.price;
  };
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory || "all");
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());

  // Reset state when modal opens. The component stays mounted across
  // open/close, so without clearing purchasedItems a consumable bought once
  // (e.g. a coin pack) stayed marked "purchased" and unbuyable all session.
  useEffect(() => {
    if (isOpen) {
      if (defaultCategory) setSelectedCategory(defaultCategory);
      setPurchasedItems(new Set());
    }
  }, [isOpen, defaultCategory]);

  const filteredItems = selectedCategory === "all" 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === selectedCategory);

  const handlePurchase = async (item: ShopItem) => {
    const price = getItemPrice(item);
    if (gems < price) {
      toast.error(t("extra.notEnoughGems"));
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(item.id);

    try {
      // Build value received for transaction log
      let valueReceived: { [key: string]: number | string } = {};
      
      if (item.category === "coins" && item.value) {
        valueReceived = { coins: item.value };
      } else if (item.category === "vip" && item.vipDuration) {
        valueReceived = { vip_days: item.vipDuration };
      } else if (item.category === "powerup") {
        if (item.powerType && item.amount) {
          valueReceived = { [item.powerType]: item.amount };
        } else {
          const bundleAmount = item.id.includes("small") ? 2 : item.id.includes("large") ? 10 : 5;
          valueReceived = { 
            "5050": bundleAmount, 
            freeze: bundleAmount, 
            replace: bundleAmount, 
            "time-drain": bundleAmount 
          };
        }
      }

      const spent = await spendGems(price, {
        productId: item.id,
        productType: item.category,
        valueReceived,
      });
      
      if (!spent) {
        setIsPurchasing(null);
        return;
      }

      // Handle different item types
      if (item.category === "coins" && item.value) {
        await addCoins(item.value, "shop_grant", item.id);
      } else if (item.category === "vip" && item.vipDuration) {
        await activateVip(item.vipDuration);
      } else if (item.category === "powerup") {
        if (item.powerType && item.amount) {
          // Individual power-up
          await addPowerUp(item.powerType, item.amount);
        } else {
          // Bundle - determine amount based on bundle type
          const bundleAmount = item.id.includes("small") ? 2 : item.id.includes("large") ? 10 : 5;
          await addPowerUp("5050", bundleAmount);
          await addPowerUp("freeze", bundleAmount);
          await addPowerUp("replace", bundleAmount);
          await addPowerUp("time-drain", bundleAmount);
        }
      }

      // Success animation
      playSound("reward");
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#A855F7", "#EC4899", "#8B5CF6"],
        zIndex: 9999,
      });

      setPurchasedItems(prev => new Set([...prev, item.id]));
      const itemName = getItemDisplayName(item, t);
      toast.success(t('shop.itemPurchased').replace('{name}', itemName));
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error(t('shop.purchaseFailed'));
    } finally {
      setIsPurchasing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-gradient-to-b from-[#FDFAFF] to-[#F6E8FF] flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 sticky top-0 z-10 bg-background border-b border-border">
            <div className="flex items-center h-14 px-4">
              <motion.button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </motion.button>
              
              <h1 className="flex-1 text-center font-display text-lg font-bold text-foreground flex items-center justify-center gap-2">
                <span>💎</span> {t('shop.gemShop')}
              </h1>
              
              {/* Gem Balance */}
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: "linear-gradient(180deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--primary) / 0.2) 100%)",
                  border: "2px solid hsl(var(--primary) / 0.3)",
                }}
              >
                <img src={gemIcon} alt="" className="w-5 h-5" />
                <span className="font-bold text-primary text-sm">{gems}</span>
              </div>
            </div>

            {/* VIP Status Banner */}
            {isVip && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 mb-3 px-4 py-2 rounded-xl flex items-center justify-between bg-amber-100 border-2 border-amber-300"
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800 font-semibold">{t('shop.vipActive')}</span>
                </div>
                <span className="text-amber-700 text-sm font-bold">
                  {t('shop.daysRemaining').replace('{days}', String(getDaysRemaining()))}
                </span>
              </motion.div>
            )}

            {/* Category Tabs */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
              {CATEGORY_KEYS.map((category) => (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                  style={{
                    background: selectedCategory === category.id
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted))",
                    color: selectedCategory === category.id
                      ? "hsl(var(--primary-foreground))"
                      : "hsl(var(--muted-foreground))",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{category.icon}</span>
                  <span>{t(`shop.${category.nameKey}`)}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
            {selectedCategory === "frames" ? (
              <AvatarFrameShop />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredItems.map((item, index) => {
                  const price = getItemPrice(item);
                  const canAfford = gems >= price;
                  const isPurchased = purchasedItems.has(item.id);
                  const isLoading = isPurchasing === item.id;
                  const isVipItem = item.category === "vip";
                  const isVipActive = isVipItem && isVip;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative"
                    >
                      <motion.button
                        onClick={() => !isPurchased && !isLoading && handlePurchase(item)}
                        disabled={isPurchased || isLoading}
                        className="w-full p-4 rounded-2xl text-left transition-all bg-card border-2 border-border"
                        whileHover={canAfford && !isPurchased ? { scale: 1.02 } : {}}
                        whileTap={canAfford && !isPurchased ? { scale: 0.98 } : {}}
                      >
                        {/* Item Icon */}
                        <div className={`w-full aspect-square rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${item.gradient}`}>
                          {isPurchased ? (
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white" />
                            </div>
                          ) : isVipActive ? (
                            <div className="text-center">
                              <Crown className="w-8 h-8 text-white/80 mx-auto" />
                              <span className="text-[10px] text-white/80 font-bold">{t('shop.active')}</span>
                            </div>
                          ) : (
                            <div className="transform scale-125">{item.icon}</div>
                          )}
                        </div>

                        {/* Item Info */}
                        <div className="text-center">
                          <h3 className="font-bold text-foreground text-sm mb-0.5 truncate">
                            {getItemDisplayName(item, t)}
                          </h3>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {getItemDescription(item, t)}
                          </p>
                        </div>

                        {/* Price Tag */}
                        {!isPurchased && (
                          <div className={`mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg ${
                            canAfford ? "bg-primary/10" : "bg-muted"
                          }`}>
                            <img src={gemIcon} alt="" className="w-4 h-4" />
                            <span className={`font-bold text-sm ${
                              canAfford ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {isLoading ? "..." : price}
                            </span>
                          </div>
                        )}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
