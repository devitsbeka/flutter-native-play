import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useAvatarFrames, AVATAR_FRAMES } from "@/hooks/useAvatarFrames";
import { useSound } from "@/contexts/SoundContext";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useShopData, ShopItem } from "@/hooks/useShopData";
import { useShopPageData } from "@/hooks/useShopPageData";
import { useGemPurchase } from "@/hooks/useGemPurchase";
import { REWARDS } from "@/config/rewardConfig";

import { trackPowerUpPurchased, trackShopItemPurchased } from "@/lib/analytics";
import { MainLayout } from "@/components/layout/MainLayout";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";

import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";
import { PowerUpShopModal } from "@/components/map/PowerUpShopModal";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopRightSidebar } from "@/components/shop/ShopRightSidebar";

import { ShopStandardLayout } from "@/components/shop/ShopStandardLayout";
import { PurchaseSuccessModal } from "@/components/shop/PurchaseSuccessModal";
import { CurrencyExchangeModal } from "@/components/shop/CurrencyExchangeModal";
import { CurrencyActionModal, CurrencyType } from "@/components/shop/CurrencyActionModal";
import { BuyCurrencyModal } from "@/components/shop/BuyCurrencyModal";
import { NotEnoughGemsModal } from "@/components/home/NotEnoughGemsModal";

export default function PowerUps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Get initial scroll section from URL query param
  const initialScrollSection = searchParams.get("section") || undefined;
  
  // Use consolidated shop data hook for faster loading
  const { data: shopData } = useShopPageData();
  
  const { addPowerUp, refetch } = useUserPowerUps();
  const { gems, coins, spendGems, spendCoins, canAffordCoins, addCoins } = useCurrency();
  const { activateVip } = useVipStatus();
  const { unlockFrame } = useAvatarFrames();
  const { playSound } = useSound();
  const { notify } = useNotificationModal();
  const { t } = useLanguage();
  const { SHOP_SECTIONS } = useShopData();
  const { initiateCheckout, isProcessing: isStripeProcessing } = useGemPurchase();
  
  // Use prefetched frame unlock check
  const isFrameUnlocked = (frameId: string) => shopData.unlockedFrames.has(frameId);

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
  const [showNotEnoughGemsModal, setShowNotEnoughGemsModal] = useState(false);
  const [requiredGems, setRequiredGems] = useState(0);

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

  const [showAuthModal, setShowAuthModal] = useState(false);

  const handlePowerCardClick = (type: PowerUpType) => {
    setSelectedPowerType(type);
    setShowPowerShopModal(true);
  };

  const handleSinglePowerPurchase = async (powerType: PowerUpType) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const price = REWARDS.POWER_UP_PRICES[powerType] ?? 100;

    if (!canAffordCoins(price)) {
      notify.error(t("shop.notEnoughCoins"));
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(`single_${powerType}`);

    try {
      const spent = await spendCoins(price, {
        productId: `single_${powerType}`,
        productType: "powerup",
        valueReceived: { [powerType]: 1 },
      });

      if (spent) {
        await addPowerUp(powerType, 1);
        await refetch();
        playSound("reward");
        trackPowerUpPurchased({
          powerUpType: powerType,
          quantity: 1,
          currency: "coins",
          price,
          isBundle: false,
        });
      }
    } catch (error) {
      console.error("Single power purchase failed:", error);
      notify.error(t("shop.purchaseFailed"));
    } finally {
      setIsPurchasing(null);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Handle Lari purchases via Stripe
    if (item.currency === "lari") {
      await initiateCheckout({
        id: item.id,
        name: item.name,
        gems: item.value || 0,
        priceGel: item.price,
      });
      return;
    }

    if (gems < item.price) {
      setRequiredGems(item.price);
      setShowNotEnoughGemsModal(true);
      playSound("wrong-answer");
      return;
    }

    setIsPurchasing(item.id);

    try {
      // Build value received for transaction log
      let valueReceived: { [key: string]: number | string } = {};
      let productType = "powerup";
      
      if (item.value) {
        valueReceived = { coins: item.value };
        productType = "coins";
      } else if (item.vipDuration) {
        valueReceived = { vip_days: item.vipDuration };
        productType = "vip";
      } else if (item.frameId) {
        valueReceived = { frame_id: item.frameId };
        productType = "frame";
      } else if (item.powerType && item.amount) {
        valueReceived = { [item.powerType]: item.amount };
      } else if (item.id === "power_combo_bundle") {
        valueReceived = { "5050": 3, freeze: 3, replace: 3, "time-drain": 3 };
        productType = "bundle";
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
        valueReceived = { 
          "5050": bundleAmount, 
          freeze: bundleAmount, 
          replace: bundleAmount, 
          "time-drain": bundleAmount,
          ...(coinAmount > 0 ? { coins: coinAmount } : {})
        };
        productType = "bundle";
      }

      const spent = await spendGems(item.price, {
        productId: item.id,
        productType,
        valueReceived,
      });
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
      } else if (item.id === "power_combo_bundle") {
        // All 4 powers × 3 each
        await addPowerUp("5050", 3);
        await addPowerUp("freeze", 3);
        await addPowerUp("replace", 3);
        await addPowerUp("time-drain", 3);
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
      trackShopItemPurchased({
        itemId: item.id,
        productType,
        currency: item.currency,
        price: item.price,
      });
      setPurchasedItems((prev) => new Set([...prev, item.id]));
      setSuccessItem({ name: item.name, quantity: item.amount || 1 });
      setShowSuccess(true);

      // Clear purchased state after 4 seconds so user can buy again
      setTimeout(() => {
        setPurchasedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      }, 4000);
    } catch (error) {
      console.error("Purchase failed:", error);
      notify.error(t("shop.purchaseFailed"));
    } finally {
      setIsPurchasing(null);
    }
  };

  return (
    <MainLayout showPlayButton={false}>
      {/* Main scrollable container */}
      <div className="min-h-full flex flex-col">
        {/* Sticky header - works within MainLayout's scrollable main */}
        <div className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
          <ShopHeader
            onHelpClick={() => setShowTutorialModal(true)}
            onCurrencyPlusClick={handleCurrencyPlusClick}
          />
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Main Content Area */}
          <div className="flex-1 relative pb-24 md:pb-0 bg-transparent scroll-smooth scrollbar-hide xl:mr-[320px] overflow-y-auto">
            <GlobalSplineBackground />

            {/* Standard Shop Layout - Hero carousel + product grids */}
            <div className="pt-4">
              <ShopStandardLayout
                sections={SHOP_SECTIONS}
                gems={gems}
                purchasedItems={purchasedItems}
                isPurchasing={isPurchasing || (isStripeProcessing ? "stripe" : null)}
                isFrameUnlocked={isFrameUnlocked}
                onItemClick={handlePurchase}
                onSinglePowerPurchase={handleSinglePowerPurchase}
                initialScrollSection={initialScrollSection}
                powerUps={shopData.powerUps}
                canAffordCoins={canAffordCoins}
                onPowerCardClick={handlePowerCardClick}
              />
            </div>
          </div>

          {/* Desktop Right Sidebar - Shows on xl screens only */}
          <ShopRightSidebar />
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
        onClose={() => {
          setShowSuccess(false);
          // Ensure body scroll is restored after modal closes
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.touchAction = '';
        }}
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

      <NotEnoughGemsModal
        isOpen={showNotEnoughGemsModal}
        onClose={() => setShowNotEnoughGemsModal(false)}
        currentGems={gems}
        requiredGems={requiredGems}
      />

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        returnToPath="/power-ups"
        message="შედი ანგარიშზე შესყიდვისთვის"
      />
    </MainLayout>
  );
}
