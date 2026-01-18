import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useAvatarFrames } from "@/hooks/useAvatarFrames";
import { useSound } from "@/contexts/SoundContext";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useShopData, ShopItem } from "@/hooks/useShopData";

import { MainLayout } from "@/components/layout/MainLayout";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";
import { PowerUpShopModal } from "@/components/map/PowerUpShopModal";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopPowerUpGuide } from "@/components/shop/ShopPowerUpGuide";
import { ShopCurrencyBar } from "@/components/shop/ShopCurrencyBar";
import { ShopStandardLayout } from "@/components/shop/ShopStandardLayout";
import { PurchaseSuccessModal } from "@/components/shop/PurchaseSuccessModal";
import { CurrencyExchangeModal } from "@/components/shop/CurrencyExchangeModal";
import { CurrencyActionModal, CurrencyType } from "@/components/shop/CurrencyActionModal";
import { BuyCurrencyModal } from "@/components/shop/BuyCurrencyModal";

export default function PowerUps() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPowerUp, refetch } = useUserPowerUps();
  const { gems, spendGems, addCoins } = useCurrency();
  const { activateVip } = useVipStatus();
  const { unlockFrame, isFrameUnlocked } = useAvatarFrames();
  const { playSound } = useSound();
  const { notify } = useNotificationModal();
  const { t } = useLanguage();
  const { SHOP_SECTIONS } = useShopData();

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
      notify.error(t("shop.loginRequired"));
      navigate("/auth");
      return;
    }

    if (gems < item.price) {
      notify.error(t("shop.notEnoughGems"), { icon: "💎" });
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
      notify.error(t("shop.purchaseFailed"));
    } finally {
      setIsPurchasing(null);
    }
  };

  return (
    <MainLayout showPlayButton={false}>
    <div className="min-h-screen flex flex-col pb-24">
      <GlobalSplineBackground />
      
      {/* Sticky Header - Title only */}
      <ShopHeader
        onHelpClick={() => setShowTutorialModal(true)}
        onCurrencyPlusClick={handleCurrencyPlusClick}
      />

      {/* Currency Bar - on video background */}
      <ShopCurrencyBar onCurrencyPlusClick={handleCurrencyPlusClick} />

      {/* Standard Shop Layout - Hero carousel + product grids */}
      <div className="flex-1 overflow-y-auto pt-4">
        <div className="xl:flex xl:gap-6 xl:px-6 xl:items-start">
          {/* Main Shop Content */}
          <div className="xl:flex-1">
            <ShopStandardLayout
              sections={SHOP_SECTIONS}
              gems={gems}
              purchasedItems={purchasedItems}
              isPurchasing={isPurchasing}
              isFrameUnlocked={isFrameUnlocked}
              onItemClick={handlePurchase}
            />
          </div>

          {/* Power-Up Guide Sidebar - Desktop only */}
          <div className="hidden xl:block xl:w-80 xl:flex-shrink-0 xl:pr-2 xl:pt-0">
            <ShopPowerUpGuide />
          </div>
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
    </div>
    </MainLayout>
  );
}
