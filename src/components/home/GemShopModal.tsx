import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Zap, Star, Check } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { useVipStatus, VipDuration, VIP_PRICES } from "@/hooks/useVipStatus";
import { useUserPowerUps } from "@/hooks/useUserPowerUps";
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
}

const SHOP_ITEMS: ShopItem[] = [
  // Coin Packs
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
  // Premium Power-ups
  {
    id: "power_bundle",
    name: "ძალების პაკეტი",
    description: "5x ყველა ძალა",
    price: 15,
    icon: <Zap className="w-8 h-8 text-blue-500" />,
    category: "powerup",
    gradient: "from-blue-400 to-cyan-500",
  },
  // VIP Features
  {
    id: "vip_week",
    name: "VIP კვირა",
    description: "2x XP, +3 სპინი, ექსკლუზიური აქსესუარები",
    price: VIP_PRICES.week,
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
    price: VIP_PRICES.month,
    icon: <Star className="w-8 h-8 text-amber-400 fill-amber-400" />,
    category: "vip",
    gradient: "from-amber-400 to-pink-500",
    vipDuration: "month",
  },
];

const CATEGORIES = [
  { id: "all", name: "ყველა", icon: "🛒" },
  { id: "coins", name: "მონეტები", icon: "🪙" },
  { id: "powerup", name: "ძალები", icon: "⚡" },
  { id: "vip", name: "VIP", icon: "👑" },
  { id: "frames", name: "ჩარჩოები", icon: "🎨" },
];

export function GemShopModal({ isOpen, onClose, defaultCategory }: GemShopModalProps) {
  const { gems, spendGems, addCoins } = useCurrency();
  const { playSound } = useSound();
  const { activateVip, isVip, getDaysRemaining } = useVipStatus();
  const { addPowerUp } = useUserPowerUps();
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory || "all");
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());

  // Reset category when modal opens with a default
  useEffect(() => {
    if (isOpen && defaultCategory) {
      setSelectedCategory(defaultCategory);
    }
  }, [isOpen, defaultCategory]);

  const filteredItems = selectedCategory === "all" 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === selectedCategory);

  const handlePurchase = async (item: ShopItem) => {
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

      // Handle different item types
      if (item.category === "coins" && item.value) {
        await addCoins(item.value);
      } else if (item.category === "vip" && item.vipDuration) {
        await activateVip(item.vipDuration);
      } else if (item.category === "powerup") {
        // Add 5 of each power-up for the bundle
        await addPowerUp("5050", 5);
        await addPowerUp("freeze", 5);
        await addPowerUp("replace", 5);
        await addPowerUp("time-drain", 5);
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
      toast.success(`${item.name} შეძენილია! 🎉`);
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("შეძენა ვერ მოხერხდა");
    } finally {
      setIsPurchasing(null);
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
            className="fixed inset-0 z-[100] bg-black/60"
          />

          {/* Modal - New whitish 3D chunky style */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:max-w-lg z-[100] max-h-[85vh] flex flex-col"
          >
            <div 
              className="rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col max-h-[85vh]"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
                boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0, 0, 0, 0.18)",
                border: "3px solid rgba(255, 255, 255, 0.95)",
              }}
            >
              {/* Header */}
              <div className="relative px-6 pt-5 pb-3 flex-shrink-0">
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
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
                      <span>💎</span> ლალების მაღაზია
                    </h2>
                    <p className="text-gray-500 text-sm">პრემიუმ აითემები ლალებით</p>
                  </div>
                  
                  {/* Gem Balance */}
                  <motion.div 
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)",
                      boxShadow: "0 3px 0 #C4B5FD",
                      border: "2px solid #A78BFA",
                    }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <img src={gemIcon} alt="" className="w-6 h-6" />
                    <span className="font-bold text-purple-700 text-lg">{gems}</span>
                  </motion.div>
                </div>

                {/* VIP Status Banner */}
                {isVip && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 px-4 py-2 rounded-xl flex items-center justify-between"
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

                {/* Category Tabs - 3D chunky style */}
                <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
                  {CATEGORIES.map((category) => (
                    <motion.button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                      style={{
                        background: selectedCategory === category.id
                          ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                          : "#F3F4F6",
                        boxShadow: selectedCategory === category.id
                          ? "0 2px 0 #C4B5FD"
                          : "0 2px 0 #E5E7EB",
                        color: selectedCategory === category.id
                          ? "#7C3AED"
                          : "#6B7280",
                      }}
                      whileTap={{ scale: 0.95, y: 2 }}
                    >
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
                {selectedCategory === "frames" ? (
                  <AvatarFrameShop />
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {filteredItems.map((item, index) => {
                      const canAfford = gems >= item.price;
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
                            onClick={() => !isPurchased && !isLoading && handlePurchase(item)}
                            disabled={isPurchased || isLoading}
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
                              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 mx-auto`}
                              style={{ boxShadow: "0 4px 0 rgba(0,0,0,0.15)" }}
                            >
                              {isPurchased ? (
                                <Check className="w-8 h-8 text-white" />
                              ) : (
                                item.icon
                              )}
                            </div>

                            {/* Name & Description */}
                            <h3 className="font-bold text-gray-800 text-sm text-center mb-1">
                              {item.name}
                            </h3>
                            <p className="text-gray-500 text-xs text-center mb-3 line-clamp-2">
                              {item.description}
                            </p>

                            {/* Price */}
                            <div className="flex items-center justify-center gap-1.5">
                              <img src={gemIcon} alt="" className="w-5 h-5" />
                              <span className={`font-bold ${canAfford ? "text-gray-800" : "text-red-500"}`}>
                                {isPurchased ? "შეძენილია" : isVipActive ? "გაახანგრძლივე" : item.price}
                              </span>
                            </div>
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Safe Area */}
              <div className="h-6 flex-shrink-0 md:hidden" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
