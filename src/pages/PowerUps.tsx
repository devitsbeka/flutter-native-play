import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus, VipDuration } from "@/hooks/useVipStatus";
import { useAvatarFrames, AVATAR_FRAMES } from "@/hooks/useAvatarFrames";
import { useSound } from "@/contexts/SoundContext";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationModal } from "@/hooks/useNotificationModal";

import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";
import { PowerUpShopModal } from "@/components/map/PowerUpShopModal";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopPromoSection } from "@/components/shop/ShopPromoSection";
import { PurchaseSuccessModal } from "@/components/shop/PurchaseSuccessModal";
import { CurrencyExchangeModal } from "@/components/shop/CurrencyExchangeModal";
import { CurrencyActionModal, CurrencyType } from "@/components/shop/CurrencyActionModal";
import { BuyCurrencyModal } from "@/components/shop/BuyCurrencyModal";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";

import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import iconStarterPack from "@/assets/icons/icon-starter-pack.png";
import iconVipCrown from "@/assets/icons/icon-vip-crown.png";
import iconPowersBottle from "@/assets/icons/icon-powers-bottle.png";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "gems" | "coins";
  icon: React.ReactNode;
  gradient: string;
  badge?: "popular" | "best-value" | "limited" | "new" | null;
  savings?: number;
  vipDuration?: VipDuration;
  powerType?: PowerUpType;
  amount?: number;
  value?: number;
  frameId?: string;
}

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

// === SECTION DATA ===

// Hot Deals - Starter Pack Section (rebalanced prices)
const STARTER_PACK_ITEMS: ShopItem[] = [
  {
    id: "starter_bundle",
    name: "სტარტერ პაკეტი",
    description: "2x ყველა ძალა + 200 მონეტა",
    price: 6,
    currency: "gems",
    icon: <img src={iconStarterPack} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    badge: "new",
  },
  {
    id: "starter_bundle_medium",
    name: "საშუალო პაკეტი",
    description: "5x ყველა ძალა + 500 მონეტა",
    price: 12,
    currency: "gems",
    icon: <img src={iconStarterPack} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    badge: "popular",
    savings: 20,
  },
  {
    id: "starter_bundle_large",
    name: "დიდი პაკეტი",
    description: "10x ყველა ძალა + 1000 მონეტა",
    price: 22,
    currency: "gems",
    icon: <img src={iconStarterPack} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    badge: "best-value",
    savings: 30,
  },
];

// Hot Deals - Mega Powers Section (rebalanced prices)
const MEGA_POWERS_ITEMS: ShopItem[] = [
  {
    id: "power_bundle_small",
    name: "მცირე პაკეტი",
    description: "2x ყველა ძალა",
    price: 5,
    currency: "gems",
    icon: <img src={iconPowersBottle} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
  },
  {
    id: "mega_power_bundle",
    name: "მეგა ძალების პაკეტი",
    description: "5x ყველა ძალა",
    price: 10,
    currency: "gems",
    icon: <img src={iconPowersBottle} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    badge: "popular",
    savings: 20,
  },
  {
    id: "power_bundle_large",
    name: "დიდი პაკეტი",
    description: "10x ყველა ძალა",
    price: 18,
    currency: "gems",
    icon: <img src={iconPowersBottle} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    badge: "best-value",
    savings: 30,
  },
];

// Hot Deals - VIP Week Section (rebalanced prices)
const VIP_PROMO_ITEMS: ShopItem[] = [
  {
    id: "vip_day",
    name: "VIP დღე",
    description: "ყველა VIP ბენეფიტი 1 დღე",
    price: 3,
    currency: "gems",
    icon: <img src={iconVipCrown} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    vipDuration: "day",
  },
  {
    id: "vip_week_deal",
    name: "VIP კვირა",
    description: "2x XP • უსასრულო სპინი",
    price: 12,
    currency: "gems",
    icon: <img src={iconVipCrown} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    badge: "popular",
    savings: 25,
    vipDuration: "week",
  },
  {
    id: "vip_month",
    name: "VIP თვე",
    description: "ყველა VIP ბენეფიტი 30 დღე",
    price: 35,
    currency: "gems",
    icon: <img src={iconVipCrown} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    badge: "best-value",
    savings: 30,
    vipDuration: "month",
  },
];

// Powers Section
const POWERS_ITEMS: ShopItem[] = [
  {
    id: "power_5050_3",
    name: "50/50 ×3",
    description: "წაშლის 2 არასწორ პასუხს",
    price: 8,
    currency: "gems",
    icon: <img src={fiftyFiftyIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(350 80% 60%) 0%, hsl(330 75% 55%) 100%)",
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
    powerType: "time-drain",
    amount: 3,
  },
];

// Frames Section - generated from AVATAR_FRAMES
const FRAMES_ITEMS: ShopItem[] = AVATAR_FRAMES.slice(0, 4).map((frame, index) => ({
  id: `frame_${frame.id}`,
  name: frame.name,
  description: frame.description,
  price: frame.price,
  currency: "gems" as const,
  icon: <FramePreviewIcon frameId={frame.id} />,
  gradient: "transparent",
  frameId: frame.id,
  badge: index === 0 ? "new" as const : index === 1 ? "popular" as const : frame.rarity === "legendary" ? "best-value" as const : null,
}));

// Coins Section (rebalanced: 1 gem ≈ 50 coins)
const COINS_ITEMS: ShopItem[] = [
  {
    id: "coins_100",
    name: "100 მონეტა",
    description: "მცირე პაკეტი",
    price: 2,
    currency: "gems",
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(45 90% 60%) 0%, hsl(40 85% 50%) 100%)",
    value: 100,
  },
  {
    id: "coins_500",
    name: "500 მონეტა",
    description: "საშუალო პაკეტი",
    price: 8,
    currency: "gems",
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(40 90% 55%) 0%, hsl(35 85% 48%) 100%)",
    value: 500,
  },
  {
    id: "coins_1500",
    name: "1500 მონეტა",
    description: "დიდი პაკეტი +20% ბონუსი",
    price: 20,
    currency: "gems",
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(35 90% 52%) 0%, hsl(25 85% 45%) 100%)",
    value: 1500,
    badge: "popular",
    savings: 20,
  },
  {
    id: "coins_5000",
    name: "5000 მონეტა",
    description: "მეგა პაკეტი +40% ბონუსი",
    price: 60,
    currency: "gems",
    icon: <img src={coinIcon} alt="" className="w-8 h-8" />,
    gradient: "linear-gradient(135deg, hsl(25 90% 50%) 0%, hsl(15 85% 45%) 100%)",
    value: 5000,
    badge: "best-value",
    savings: 40,
  },
];

// Section definitions with appropriate video backgrounds
const SHOP_SECTIONS = [
  {
    id: "starter",
    title: "სტარტერ პაკეტი",
    description: "დამწყებთათვის",
    videoSrc: "/videos/starter.mp4",
    items: STARTER_PACK_ITEMS,
  },
  {
    id: "mega-powers",
    title: "მეგა ძალები",
    description: "მოიგე მეტი თამაში",
    videoSrc: "/videos/mega-powers-2.mp4",
    items: MEGA_POWERS_ITEMS,
  },
  {
    id: "vip",
    title: "VIP სტატუსი",
    description: "2x XP + ბონუსები",
    videoSrc: "/videos/vip.mp4",
    items: VIP_PROMO_ITEMS,
  },
  {
    id: "powers",
    title: "ძალები",
    description: "უპირატესობა თამაშში",
    videoSrc: "/videos/powers.mp4",
    items: POWERS_ITEMS,
  },
  {
    id: "frames",
    title: "ჩარჩოები",
    description: "უნიკალური პროფილი",
    videoSrc: "/videos/art.mp4",
    items: FRAMES_ITEMS,
  },
  {
    id: "coins",
    title: "მონეტები",
    description: "ბონუსებით",
    videoSrc: "/videos/coins.mp4",
    items: COINS_ITEMS,
  },
];

export default function PowerUps() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPowerUp, refetch } = useUserPowerUps();
  const { gems, spendGems, addCoins } = useCurrency();
  const { activateVip } = useVipStatus();
  const { unlockFrame, isFrameUnlocked } = useAvatarFrames();
  const { playSound } = useSound();
  const { notify } = useNotificationModal();

  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showPowerShopModal, setShowPowerShopModal] = useState(false);
  const [selectedPowerType, setSelectedPowerType] = useState<PowerUpType>("5050");
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("coins");
  const [successItem, setSuccessItem] = useState({ name: "", quantity: 1 });

  const handleCurrencyPlusClick = (currencyType: CurrencyType) => {
    setSelectedCurrency(currencyType);
    setShowActionModal(true);
  };

  const handleBuyClick = () => {
    setShowActionModal(false);
    setShowBuyModal(true);
  };

  const handleExchangeClick = () => {
    setShowActionModal(false);
    setShowExchangeModal(true);
  };
  const handlePurchase = async (item: ShopItem) => {
    if (!user) {
      notify.error("შესვლა საჭიროა შეძენისთვის!");
      navigate("/auth");
      return;
    }

    if (gems < item.price) {
      notify.error("არ გაქვს საკმარისი ალმასი!", { icon: "💎" });
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
        let bundleAmount = 2;
        let coinAmount = 0;
        
        if (item.id === "starter_bundle") {
          bundleAmount = 2;
          coinAmount = 200;
        } else if (item.id === "starter_bundle_medium") {
          bundleAmount = 5;
          coinAmount = 500;
        } else if (item.id === "starter_bundle_large") {
          bundleAmount = 10;
          coinAmount = 1000;
        } else if (item.id.includes("small")) {
          bundleAmount = 2;
        } else if (item.id.includes("large")) {
          bundleAmount = 10;
        } else {
          bundleAmount = 5;
        }
        
        await addPowerUp("5050", bundleAmount);
        await addPowerUp("freeze", bundleAmount);
        await addPowerUp("replace", bundleAmount);
        await addPowerUp("time-drain", bundleAmount);
        if (coinAmount > 0) {
          await addCoins(coinAmount);
        }
        await refetch();
      }

      playSound("reward");
      setPurchasedItems((prev) => new Set([...prev, item.id]));
      setSuccessItem({ name: item.name, quantity: item.amount || 1 });
      setShowSuccess(true);
    } catch (error) {
      console.error("Purchase failed:", error);
      notify.error("შეძენა ვერ მოხერხდა");
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
        onCurrencyPlusClick={handleCurrencyPlusClick}
      />

      {/* Scrollable Content - Section-based layout with scroll snap */}
      <div 
        className="flex-1 overflow-y-auto pt-4 pb-4"
        style={{
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
        }}
      >
        {SHOP_SECTIONS.filter(section => section.id !== "frames").map((section) => (
          <ShopPromoSection
            key={section.id}
            title={section.title}
            description={section.description}
            videoSrc={section.videoSrc}
            items={section.items}
            gems={gems}
            purchasedItems={purchasedItems}
            isPurchasing={isPurchasing}
            isFrameUnlocked={isFrameUnlocked}
            onItemClick={handlePurchase}
          />
        ))}
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

      <CurrencyExchangeModal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
      />

      <CurrencyActionModal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        currencyType={selectedCurrency}
        onBuyClick={handleBuyClick}
        onExchangeClick={handleExchangeClick}
      />

      <BuyCurrencyModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        currencyType={selectedCurrency}
      />

      {/* Bottom Navigation */}
      <UniversalBottomNav />
    </div>
  );
}
