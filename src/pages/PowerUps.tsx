import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Crown, Zap, Star, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus, VipDuration } from "@/hooks/useVipStatus";
import { useSound } from "@/contexts/SoundContext";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";

interface PowerUpInfo {
  type: PowerUpType;
  name: string;
  description: string;
  icon: string;
  gradient: string;
}

const POWER_UP_INFO: PowerUpInfo[] = [
  {
    type: "5050",
    name: "50/50",
    description: "წაშალე 2 არასწორი პასუხი",
    icon: fiftyFiftyIcon,
    gradient: "from-rose-400 to-pink-500",
  },
  {
    type: "freeze",
    name: "გაყინვა",
    description: "გააყინე დრო 10 წამით",
    icon: freezeIcon,
    gradient: "from-cyan-400 to-blue-500",
  },
  {
    type: "replace",
    name: "შეცვლა",
    description: "შეცვალე კითხვა ახლით",
    icon: replaceIcon,
    gradient: "from-emerald-400 to-green-500",
  },
  {
    type: "time-drain",
    name: "დრო+",
    description: "დაამატე 10 წამი დროს",
    icon: timeDrainIcon,
    gradient: "from-violet-400 to-purple-500",
  },
];

interface ShopItem {
  id: string;
  name: string;
  description: string;
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

const SHOP_ITEMS: ShopItem[] = [
  // Coin Packs
  {
    id: "coins_100",
    name: "100 მონეტა",
    description: "მცირე პაკეტი",
    price: 2,
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    category: "coins",
    value: 100,
    gradient: "from-yellow-300 to-amber-400",
  },
  {
    id: "coins_500",
    name: "500 მონეტა",
    description: "საშუალო პაკეტი",
    price: 5,
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    category: "coins",
    value: 500,
    gradient: "from-amber-400 to-yellow-500",
  },
  {
    id: "coins_1500",
    name: "1500 მონეტა",
    description: "დიდი პაკეტი +20% ბონუსი",
    price: 12,
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    category: "coins",
    value: 1500,
    gradient: "from-amber-500 to-orange-500",
    popular: true,
  },
  {
    id: "coins_5000",
    name: "5000 მონეტა",
    description: "მეგა პაკეტი +50% ბონუსი",
    price: 35,
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    category: "coins",
    value: 5000,
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: "coins_10000",
    name: "10000 მონეტა",
    description: "უზარმაზარი +70% ბონუსი",
    price: 60,
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    category: "coins",
    value: 10000,
    gradient: "from-red-500 to-rose-600",
  },
  // Individual Power-Ups
  {
    id: "power_5050",
    name: "50/50 ×3",
    description: "წაშალე 2 არასწორი პასუხი",
    price: 8,
    icon: <img src={fiftyFiftyIcon} alt="" className="w-8 h-8" />,
    category: "powerup",
    gradient: "from-rose-400 to-pink-500",
    powerType: "5050",
    amount: 3,
  },
  {
    id: "power_freeze",
    name: "გაყინვა ×3",
    description: "გააყინე დრო 10 წამით",
    price: 8,
    icon: <img src={freezeIcon} alt="" className="w-8 h-8" />,
    category: "powerup",
    gradient: "from-cyan-400 to-blue-500",
    powerType: "freeze",
    amount: 3,
  },
  {
    id: "power_replace",
    name: "შეცვლა ×3",
    description: "შეცვალე კითხვა ახლით",
    price: 8,
    icon: <img src={replaceIcon} alt="" className="w-8 h-8" />,
    category: "powerup",
    gradient: "from-emerald-400 to-green-500",
    powerType: "replace",
    amount: 3,
  },
  {
    id: "power_timedrain",
    name: "დრო+ ×3",
    description: "დაამატე 10 წამი დროს",
    price: 8,
    icon: <img src={timeDrainIcon} alt="" className="w-8 h-8" />,
    category: "powerup",
    gradient: "from-violet-400 to-purple-500",
    powerType: "time-drain",
    amount: 3,
  },
  // Power Bundles
  {
    id: "power_bundle_small",
    name: "მცირე პაკეტი",
    description: "2x ყველა ძალა",
    price: 8,
    icon: <Zap className="w-8 h-8 text-blue-400" />,
    category: "powerup",
    gradient: "from-sky-300 to-blue-400",
  },
  {
    id: "power_bundle",
    name: "საშუალო პაკეტი",
    description: "5x ყველა ძალა",
    price: 15,
    icon: <Zap className="w-8 h-8 text-blue-500" />,
    category: "powerup",
    gradient: "from-blue-400 to-cyan-500",
    popular: true,
  },
  {
    id: "power_bundle_large",
    name: "დიდი პაკეტი",
    description: "10x ყველა ძალა",
    price: 25,
    icon: <Zap className="w-8 h-8 text-indigo-500" />,
    category: "powerup",
    gradient: "from-indigo-500 to-purple-600",
  },
  // VIP Features
  {
    id: "vip_day",
    name: "VIP დღე",
    description: "ყველა VIP ბენეფიტი 1 დღე",
    price: 5,
    icon: <Crown className="w-8 h-8 text-amber-400" />,
    category: "vip",
    gradient: "from-amber-300 to-yellow-500",
    vipDuration: "day",
  },
  {
    id: "vip_week",
    name: "VIP კვირა",
    description: "2x XP, +3 სპინი, ექსკლუზიური აქსესუარები",
    price: 15,
    icon: <Crown className="w-8 h-8 text-amber-500" />,
    category: "vip",
    gradient: "from-purple-500 to-pink-500",
    popular: true,
    vipDuration: "week",
  },
  {
    id: "vip_month",
    name: "VIP თვე",
    description: "ყველა VIP ბენეფიტი 30 დღე",
    price: 40,
    icon: <Star className="w-8 h-8 text-amber-400 fill-amber-400" />,
    category: "vip",
    gradient: "from-amber-400 to-pink-500",
    vipDuration: "month",
  },
];

const TABS = [
  { id: "my-powers", name: "ჩემი ძალები", icon: "⚡" },
  { id: "coins", name: "მონეტები", icon: "🪙" },
  { id: "powerup", name: "ძალები", icon: "🎯" },
  { id: "vip", name: "VIP", icon: "👑" },
];

export default function PowerUps() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { powerUps, isLoading: powerUpsLoading, addPowerUp, refetch } = useUserPowerUps();
  const { gems, spendGems, addCoins } = useCurrency();
  const { activateVip, isVip, getDaysRemaining } = useVipStatus();
  const { playSound } = useSound();
  
  const [selectedTab, setSelectedTab] = useState("my-powers");
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());

  const filteredItems = SHOP_ITEMS.filter(item => item.category === selectedTab);

  const handlePurchase = async (item: ShopItem) => {
    // Check authentication
    if (!user) {
      toast.error("შესვლა საჭიროა შეძენისთვის!");
      navigate("/auth");
      return;
    }

    if (gems < item.price) {
      toast.error("არ გაქვს საკმარისი ალმასი!");
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(item.id);

    try {
      const spent = await spendGems(item.price);
      if (!spent) {
        setIsPurchasing(null);
        return;
      }

      if (item.category === "coins" && item.value) {
        await addCoins(item.value);
      } else if (item.category === "vip" && item.vipDuration) {
        await activateVip(item.vipDuration);
      } else if (item.category === "powerup") {
        if (item.powerType && item.amount) {
          await addPowerUp(item.powerType, item.amount);
        } else {
          const bundleAmount = item.id.includes("small") ? 2 : item.id.includes("large") ? 10 : 5;
          await addPowerUp("5050", bundleAmount);
          await addPowerUp("freeze", bundleAmount);
          await addPowerUp("replace", bundleAmount);
          await addPowerUp("time-drain", bundleAmount);
        }
        // Refetch power-ups to update counts
        await refetch();
      }

      playSound("reward");
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#A855F7", "#EC4899", "#8B5CF6"],
        zIndex: 9999,
      });

      setPurchasedItems(prev => new Set([...prev, item.id]));
      toast.success(`${item.name} შეძენილია! 🎉`);
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("შეძენა ვერ მოხერხდა");
    } finally {
      setIsPurchasing(null);
    }
  };

  const getGradientColors = (gradient: string) => {
    if (gradient.includes("rose")) return "#FB7185, #EC4899";
    if (gradient.includes("cyan")) return "#22D3EE, #3B82F6";
    if (gradient.includes("emerald")) return "#34D399, #22C55E";
    if (gradient.includes("violet")) return "#A78BFA, #8B5CF6";
    if (gradient.includes("yellow")) return "#FDE047, #F59E0B";
    if (gradient.includes("amber")) return "#FBBF24, #F97316";
    if (gradient.includes("orange")) return "#FB923C, #EF4444";
    if (gradient.includes("red")) return "#F87171, #E11D48";
    if (gradient.includes("sky")) return "#7DD3FC, #60A5FA";
    if (gradient.includes("blue")) return "#60A5FA, #06B6D4";
    if (gradient.includes("indigo")) return "#818CF8, #A855F7";
    if (gradient.includes("purple")) return "#A855F7, #EC4899";
    return "#A78BFA, #8B5CF6";
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
      }}
    >
      {/* Sticky Header + Tabs */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            {/* Title - Left */}
            <h1 className="text-xl font-display font-bold text-gray-900">
              მაღაზია
            </h1>

            {/* Right side: Help + Gems */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setShowTutorialModal(true)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                style={{ boxShadow: "0 3px 0 #D1D5DB" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </motion.button>
              
              <motion.div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)",
                  boxShadow: "0 3px 0 #C4B5FD",
                  border: "2px solid #A78BFA",
                }}
              >
                <img src={gemIcon} alt="" className="w-5 h-5" />
                <span className="font-bold text-purple-700">{gems}</span>
              </motion.div>
            </div>
          </div>

          {/* VIP Status Banner */}
          {isVip && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 px-4 py-2 rounded-xl flex items-center justify-between"
              style={{
                background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                boxShadow: "0 2px 0 #F59E0B",
                border: "2px solid #FBBF24",
              }}
            >
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <span className="text-amber-800 font-semibold">VIP აქტიური</span>
              </div>
              <span className="text-amber-700 text-sm font-bold">
                {getDaysRemaining()} დღე დარჩენილი
              </span>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                style={{
                  background: selectedTab === tab.id
                    ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                    : "#F3F4F6",
                  boxShadow: selectedTab === tab.id
                    ? "0 3px 0 #C4B5FD"
                    : "0 2px 0 #E5E7EB",
                  color: selectedTab === tab.id
                    ? "#7C3AED"
                    : "#6B7280",
                }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3">
        <AnimatePresence mode="wait">
          {selectedTab === "my-powers" ? (
            /* My Powers Tab */
            <motion.div
              key="my-powers"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-2 gap-3"
            >
              {powerUpsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 rounded-2xl animate-pulse"
                    style={{ background: "#F3F4F6" }}
                  />
                ))
              ) : (
                POWER_UP_INFO.map((powerUp, index) => {
                  const count = powerUps[powerUp.type] || 0;
                  const isEmpty = count === 0;
                  
                  return (
                    <motion.div
                      key={powerUp.type}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative p-4 rounded-2xl"
                      style={{
                        background: isEmpty 
                          ? "#F9FAFB" 
                          : "linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)",
                        boxShadow: isEmpty 
                          ? "0 2px 0 #E5E7EB" 
                          : "0 4px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
                        opacity: isEmpty ? 0.6 : 1,
                        border: "2px solid transparent",
                      }}
                    >
                      {/* Count Badge */}
                      <div 
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{
                          background: isEmpty 
                            ? "#9CA3AF" 
                            : `linear-gradient(135deg, ${getGradientColors(powerUp.gradient)})`,
                          boxShadow: "0 2px 0 rgba(0,0,0,0.2)",
                        }}
                      >
                        {count}
                      </div>

                      {/* Icon */}
                      <div className="flex justify-center mb-3">
                        <img 
                          src={powerUp.icon} 
                          alt={powerUp.name}
                          className="w-14 h-14 object-contain"
                          style={{ filter: isEmpty ? "grayscale(1)" : "none" }}
                        />
                      </div>

                      {/* Name */}
                      <h3 className="text-gray-900 font-bold text-base mb-1 text-center">
                        {powerUp.name}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-500 text-xs text-center">
                        {powerUp.description}
                      </p>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          ) : (
            /* Shop Tabs */
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-2 gap-3"
            >
              {filteredItems.map((item, index) => {
                const canAfford = gems >= item.price;
                const isPurchased = purchasedItems.has(item.id);
                const isItemLoading = isPurchasing === item.id;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                  >
                    {/* Popular badge */}
                    {item.popular && (
                      <motion.div 
                        className="absolute -top-1.5 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white z-10"
                        style={{ 
                          background: "linear-gradient(135deg, #EC4899 0%, #F97316 100%)",
                          boxShadow: "0 2px 0 #BE185D",
                        }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        პოპულარული
                      </motion.div>
                    )}

                    <motion.button
                      onClick={() => !isPurchased && !isItemLoading && handlePurchase(item)}
                      disabled={isPurchased || isItemLoading}
                      className="w-full p-4 rounded-2xl text-left transition-all"
                      style={{
                        background: isPurchased 
                          ? "linear-gradient(180deg, #D1FAE5 0%, #A7F3D0 100%)" 
                          : canAfford 
                            ? "#F9FAFB" 
                            : "#F3F4F6",
                        boxShadow: isPurchased
                          ? "0 3px 0 #6EE7B7"
                          : canAfford
                            ? "0 3px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)"
                            : "0 2px 0 #E5E7EB",
                        border: isPurchased 
                          ? "2px solid #34D399" 
                          : "2px solid transparent",
                        opacity: !canAfford && !isPurchased ? 0.6 : 1,
                      }}
                      whileHover={!isPurchased && canAfford ? { scale: 1.02, y: -2 } : {}}
                      whileTap={!isPurchased && canAfford ? { scale: 0.98 } : {}}
                    >
                      {/* Icon */}
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
                        style={{
                          background: `linear-gradient(135deg, ${getGradientColors(item.gradient)})`,
                          boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        {item.icon}
                      </div>

                      {/* Name */}
                      <h3 className="text-gray-900 font-bold text-sm text-center mb-1">
                        {item.name}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-500 text-xs text-center mb-3 line-clamp-2">
                        {item.description}
                      </p>

                      {/* Price / Status */}
                      <div className="flex justify-center">
                        {isPurchased ? (
                          <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                            <Check className="w-4 h-4" />
                            <span>შეძენილი</span>
                          </div>
                        ) : isItemLoading ? (
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                            style={{
                              background: canAfford 
                                ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                                : "#E5E7EB",
                              boxShadow: canAfford ? "0 2px 0 #C4B5FD" : "none",
                            }}
                          >
                            <img src={gemIcon} alt="" className="w-4 h-4" />
                            <span className={`font-bold text-sm ${canAfford ? "text-purple-700" : "text-gray-500"}`}>
                              {item.price}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tutorial Modal */}
      <PowerUpTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      {/* Bottom Navigation */}
      <UniversalBottomNav />
    </div>
  );
}
