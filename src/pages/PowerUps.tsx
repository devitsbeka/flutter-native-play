import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, Sparkles, Check, Frame } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus, VipDuration } from "@/hooks/useVipStatus";
import { useAvatarFrames, AVATAR_FRAMES } from "@/hooks/useAvatarFrames";
import { useSound } from "@/contexts/SoundContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";
import { PowerUpShopModal } from "@/components/map/PowerUpShopModal";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopFeaturedCarousel } from "@/components/shop/ShopFeaturedCarousel";
import { MyPowersBar } from "@/components/shop/MyPowersBar";
import { ShopTabBar, ShopTab } from "@/components/shop/ShopTabBar";
import { ShopItemCard, ShopItemBadge } from "@/components/shop/ShopItemCard";
import { ShopBundleCard } from "@/components/shop/ShopBundleCard";
import { PurchaseSuccessModal } from "@/components/shop/PurchaseSuccessModal";

import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import powerBottleIcon from "@/assets/icons/icon-power-bottle.png";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "gems" | "coins";
  icon: React.ReactNode;
  gradient: string;
  category: "hot" | "powers" | "coins" | "vip" | "frames";
  badge?: ShopItemBadge;
  savings?: number;
  vipDuration?: VipDuration;
  powerType?: PowerUpType;
  amount?: number;
  value?: number;
  frameId?: string;
}

const SHOP_ITEMS: ShopItem[] = [
  // Hot Deals
  {
    id: "starter_bundle",
    name: "სტარტერ პაკეტი",
    description: "2x ყველა ძალა + 200 მონეტა",
    price: 8,
    currency: "gems",
    icon: <Sparkles className="w-8 h-8 text-sky-200" />,
    gradient: "linear-gradient(135deg, hsl(200 80% 55%) 0%, hsl(180 70% 45%) 100%)",
    category: "hot",
    badge: "new",
  },
  {
    id: "mega_power_bundle",
    name: "მეგა ძალების პაკეტი",
    description: "5x ყველა ძალა",
    price: 15,
    currency: "gems",
    icon: <Zap className="w-8 h-8 text-purple-200" />,
    gradient: "linear-gradient(135deg, hsl(263 60% 55%) 0%, hsl(280 70% 50%) 100%)",
    category: "hot",
    badge: "popular",
    savings: 25,
  },
  {
    id: "vip_week_deal",
    name: "VIP კვირა",
    description: "2x XP • უსასრულო სპინი",
    price: 15,
    currency: "gems",
    icon: <Crown className="w-8 h-8 text-amber-200" />,
    gradient: "linear-gradient(135deg, hsl(45 90% 55%) 0%, hsl(340 80% 55%) 100%)",
    category: "hot",
    badge: "best-value",
    savings: 30,
    vipDuration: "week",
  },
  // Power-Ups
  {
    id: "power_5050_3",
    name: "50/50 ×3",
    description: "წაშლის 2 არასწორ პასუხს",
    price: 8,
    currency: "gems",
    icon: <img src={fiftyFiftyIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(350 80% 60%) 0%, hsl(330 75% 55%) 100%)",
    category: "powers",
    powerType: "5050",
    amount: 3,
  },
  {
    id: "power_freeze_3",
    name: "გაყინვა ×3",
    description: "დრო გაიყინება 10 წამით",
    price: 8,
    currency: "gems",
    icon: <img src={freezeIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(190 90% 55%) 0%, hsl(210 80% 55%) 100%)",
    category: "powers",
    powerType: "freeze",
    amount: 3,
  },
  {
    id: "power_replace_3",
    name: "შეცვლა ×3",
    description: "შეცვლის კითხვას ახლით",
    price: 8,
    currency: "gems",
    icon: <img src={replaceIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(150 75% 50%) 0%, hsl(140 70% 45%) 100%)",
    category: "powers",
    powerType: "replace",
    amount: 3,
  },
  {
    id: "power_timedrain_3",
    name: "დრო+ ×3",
    description: "ამატებს 10 წამს",
    price: 8,
    currency: "gems",
    icon: <img src={timeDrainIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(270 70% 60%) 0%, hsl(280 65% 55%) 100%)",
    category: "powers",
    powerType: "time-drain",
    amount: 3,
  },
  {
    id: "power_bundle_small",
    name: "მცირე პაკეტი",
    description: "2x ყველა ძალა",
    price: 8,
    currency: "gems",
    icon: <img src={powerBottleIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(200 80% 55%) 0%, hsl(220 70% 50%) 100%)",
    category: "powers",
  },
  {
    id: "power_bundle_medium",
    name: "საშუალო პაკეტი",
    description: "5x ყველა ძალა",
    price: 15,
    currency: "gems",
    icon: <img src={powerBottleIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(240 70% 55%) 0%, hsl(260 65% 50%) 100%)",
    category: "powers",
    badge: "popular",
  },
  {
    id: "power_bundle_large",
    name: "დიდი პაკეტი",
    description: "10x ყველა ძალა",
    price: 25,
    currency: "gems",
    icon: <img src={powerBottleIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(270 70% 55%) 0%, hsl(290 65% 50%) 100%)",
    category: "powers",
    badge: "best-value",
    savings: 20,
  },
  // Coins
  {
    id: "coins_100",
    name: "100 მონეტა",
    description: "მცირე პაკეტი",
    price: 2,
    currency: "gems",
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(45 90% 60%) 0%, hsl(40 85% 50%) 100%)",
    category: "coins",
    value: 100,
  },
  {
    id: "coins_500",
    name: "500 მონეტა",
    description: "საშუალო პაკეტი",
    price: 5,
    currency: "gems",
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(40 90% 55%) 0%, hsl(35 85% 48%) 100%)",
    category: "coins",
    value: 500,
  },
  {
    id: "coins_1500",
    name: "1500 მონეტა",
    description: "დიდი პაკეტი +20% ბონუსი",
    price: 12,
    currency: "gems",
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(35 90% 52%) 0%, hsl(25 85% 45%) 100%)",
    category: "coins",
    value: 1500,
    badge: "popular",
    savings: 20,
  },
  {
    id: "coins_5000",
    name: "5000 მონეტა",
    description: "მეგა პაკეტი +50% ბონუსი",
    price: 35,
    currency: "gems",
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(25 90% 50%) 0%, hsl(15 85% 45%) 100%)",
    category: "coins",
    value: 5000,
    badge: "best-value",
    savings: 50,
  },
  // VIP
  {
    id: "vip_day",
    name: "VIP დღე",
    description: "ყველა VIP ბენეფიტი 1 დღე",
    price: 5,
    currency: "gems",
    icon: <Crown className="w-8 h-8 text-amber-200" />,
    gradient: "linear-gradient(135deg, hsl(45 85% 55%) 0%, hsl(40 80% 48%) 100%)",
    category: "vip",
    vipDuration: "day",
  },
  {
    id: "vip_week",
    name: "VIP კვირა",
    description: "2x XP, +3 სპინი, ექსკლუზიური აქსესუარები",
    price: 15,
    currency: "gems",
    icon: <Crown className="w-8 h-8 text-amber-200" />,
    gradient: "linear-gradient(135deg, hsl(280 70% 55%) 0%, hsl(330 75% 50%) 100%)",
    category: "vip",
    badge: "popular",
    vipDuration: "week",
  },
  {
    id: "vip_month",
    name: "VIP თვე",
    description: "ყველა VIP ბენეფიტი 30 დღე",
    price: 40,
    currency: "gems",
    icon: <Crown className="w-8 h-8 text-amber-200" />,
    gradient: "linear-gradient(135deg, hsl(45 90% 55%) 0%, hsl(25 85% 50%) 100%)",
    category: "vip",
    badge: "best-value",
    savings: 35,
    vipDuration: "month",
  },
];

// Helper function to get frame data by ID
const getFrameById = (frameId: string) => AVATAR_FRAMES.find(f => f.id === frameId);

// Frame Preview Component for shop
const FramePreviewIcon = ({ frameId }: { frameId: string }) => {
  const frame = getFrameById(frameId);
  return (
    <AvatarWithFrame
      emoji="👤"
      size="sm"
      showVipBadge={false}
      frameOverride={frame}
    />
  );
};

// Frame shop items - generated from AVATAR_FRAMES
const FRAME_SHOP_ITEMS: ShopItem[] = AVATAR_FRAMES.map((frame, index) => ({
  id: `frame_${frame.id}`,
  name: frame.name,
  description: frame.description,
  price: frame.price,
  currency: "gems" as const,
  icon: <FramePreviewIcon frameId={frame.id} />,
  gradient: "transparent", // Frame preview shows the actual frame, no need for gradient
  category: "frames" as const,
  frameId: frame.id,
  badge: index === 0 ? "new" as const : index === 1 ? "popular" as const : frame.rarity === "legendary" ? "best-value" as const : null,
}));

export default function PowerUps() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPowerUp, refetch } = useUserPowerUps();
  const { gems, spendGems, addCoins } = useCurrency();
  const { activateVip } = useVipStatus();
  const { unlockFrame, isFrameUnlocked } = useAvatarFrames();
  const { playSound } = useSound();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ShopTab>(() => {
    const tabParam = searchParams.get("tab");
    return (tabParam === "powers" || tabParam === "coins" || tabParam === "vip" || tabParam === "frames") 
      ? tabParam 
      : "hot";
  });
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showPowerShopModal, setShowPowerShopModal] = useState(false);
  const [selectedPowerType, setSelectedPowerType] = useState<PowerUpType>("5050");
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState(false);
  const [successItem, setSuccessItem] = useState({ name: "", quantity: 1 });

  // Combine shop items with frame items
  const allItems = [...SHOP_ITEMS, ...FRAME_SHOP_ITEMS];
  const filteredItems = allItems.filter((item) => item.category === activeTab);

  const handlePowerClick = (type: PowerUpType) => {
    setSelectedPowerType(type);
    setShowPowerShopModal(true);
  };

  const handleDealClick = (dealId: string) => {
    const item = allItems.find((i) => i.id === dealId);
    if (item) handlePurchase(item);
  };

  const handlePurchase = async (item: ShopItem) => {
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

      if (item.value) {
        await addCoins(item.value);
      } else if (item.vipDuration) {
        await activateVip(item.vipDuration);
      } else if (item.frameId) {
        await unlockFrame(item.frameId);
      } else if (item.powerType && item.amount) {
        await addPowerUp(item.powerType, item.amount);
        await refetch();
      } else if (item.id.includes("bundle")) {
        const bundleAmount = item.id.includes("small") ? 2 : item.id.includes("large") ? 10 : 5;
        await addPowerUp("5050", bundleAmount);
        await addPowerUp("freeze", bundleAmount);
        await addPowerUp("replace", bundleAmount);
        await addPowerUp("time-drain", bundleAmount);
        if (item.id === "starter_bundle") {
          await addCoins(200);
        }
        await refetch();
      }

      playSound("reward");
      setPurchasedItems((prev) => new Set([...prev, item.id]));
      setSuccessItem({ name: item.name, quantity: item.amount || 1 });
      setShowSuccess(true);
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("შეძენა ვერ მოხერხდა");
    } finally {
      setIsPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <GlobalSplineBackground />
      {/* Sticky Header */}
      <ShopHeader
        onHelpClick={() => setShowTutorialModal(true)}
        onBuyGemsClick={() => toast.info("ალმასების შეძენა მალე!")}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Featured Carousel */}
        <ShopFeaturedCarousel onDealClick={handleDealClick} />

        {/* My Powers Bar */}
        <MyPowersBar onPowerClick={handlePowerClick} />

        {/* Tab Navigation */}
        <ShopTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Shop Grid */}
        <div className="px-4 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 gap-4"
            >
              {filteredItems.map((item, index) => {
                const canAfford = gems >= item.price;
                const isPurchased = purchasedItems.has(item.id);
                const isFrameOwned = item.frameId ? isFrameUnlocked(item.frameId) : false;
                const isOwned = isPurchased || isFrameOwned;

                return (
                  <ShopItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    description={item.description}
                    price={item.price}
                    currency={item.currency}
                    icon={item.icon}
                    gradient={item.gradient}
                    badge={item.badge}
                    savings={item.savings}
                    isPurchased={isOwned}
                    isLoading={isPurchasing === item.id}
                    canAfford={canAfford}
                    index={index}
                    onClick={() => !isOwned && handlePurchase(item)}
                  />
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <PowerUpTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      <PowerUpShopModal
        isOpen={showPowerShopModal}
        onClose={() => setShowPowerShopModal(false)}
        initialSelectedType={selectedPowerType}
      />

      <PurchaseSuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        itemName={successItem.name}
        quantity={successItem.quantity}
      />

      {/* Bottom Navigation */}
      <UniversalBottomNav />
    </div>
  );
}
