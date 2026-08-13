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
import {
  ALL_POWER_TYPES,
  bundleValueReceived,
  getBundleContents,
  isBundleId,
} from "@/config/bundleContents";

import { trackPowerUpPurchased, trackShopItemPurchased } from "@/lib/analytics";
import { MainLayout } from "@/components/layout/MainLayout";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";

import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";
import { PowerUpShopModal } from "@/components/map/PowerUpShopModal";
import { ShopHeader } from "@/components/shop/ShopHeader";
// Served from public/ - not bundled, streams straight from the CDN
const SHOP_SCENE_VIDEO = "/videos/shop-scene.mp4";
const SHOP_SCENE_VIDEO_WEBM = "/videos/shop-scene.webm";

// Dissolves the pinned scene into the page on every side it can meet it:
// to the left, where the shop content sits, and along the top and bottom.
// Both spellings ship — Safari below 15.4 only knows the -webkit- one, and
// there an ignored mask would put back the hard edge this exists to remove.
const SHOP_SCENE_FADE_LAYERS = [
  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 22%, rgba(0,0,0,0.8) 42%, #000 62%)",
  "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
].join(", ");
const SHOP_SCENE_FADE: React.CSSProperties = {
  maskImage: SHOP_SCENE_FADE_LAYERS,
  WebkitMaskImage: SHOP_SCENE_FADE_LAYERS,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

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
  const { gems, coins, spendGems, spendCoins, canAffordCoins, addCoins, addGems } = useCurrency();
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
        // Coins already spent — retry a failed grant once instead of silent loss
        const granted =
          (await addPowerUp(powerType, 1)) || (await addPowerUp(powerType, 1));
        await refetch();
        if (!granted) {
          notify.error(t("shop.purchaseFailed"));
          return;
        }
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
      } else if (isBundleId(item.id)) {
        valueReceived = bundleValueReceived(item.id);
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

      // Gems are already spent past this point — retry a failed power grant once
      // rather than silently losing the purchase
      const grantPowerUp = async (type: PowerUpType, amount: number): Promise<boolean> =>
        (await addPowerUp(type, amount)) || (await addPowerUp(type, amount));

      let grantFailed = false;

      if (item.value) {
        if (!(await addCoins(item.value, "shop_grant", item.id))) grantFailed = true;
      } else if (item.vipDuration) {
        await activateVip(item.vipDuration);
      } else if (item.frameId) {
        await unlockFrame(item.frameId);
      } else if (item.powerType && item.amount) {
        if (!(await grantPowerUp(item.powerType, item.amount))) grantFailed = true;
        await refetch();
      } else if (isBundleId(item.id)) {
        const { powers, coins: coinAmount, gems: gemAmount = 0, vip } = getBundleContents(item.id);
        for (const type of ALL_POWER_TYPES) {
          if (!(await grantPowerUp(type, powers))) grantFailed = true;
        }
        if (coinAmount > 0) {
          if (!(await addCoins(coinAmount, "shop_grant", item.id))) grantFailed = true;
        }
        if (gemAmount > 0) {
          if (!(await addGems(gemAmount, "shop_grant", item.id))) grantFailed = true;
        }
        if (vip) {
          await activateVip(vip);
        }
        await refetch();
      }

      if (grantFailed) {
        notify.error(t("shop.purchaseFailed"));
        setIsPurchasing(null);
        return;
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
          {/* Main content. No percentage cap: the scene beside it is capped
              instead, so every pixel past that width goes to the shop rather
              than stretching a video — which is what squeezed the product
              grid whenever the left menu was expanded. */}
          <div className="flex-1 min-w-0 relative pb-24 md:pb-0 bg-transparent scroll-smooth scrollbar-hide overflow-y-auto">
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

          {/* Right column (lg+): the looping shop scene, pinned to the
              viewport — it never scrolls, only the shop content does.
              The clip is 1470x630, far wider than this tall column, so
              object-cover keeps under a fifth of its width: anchor that
              slice at 76% across, where the shopkeeper stands, instead of
              the centre, which would show the empty shelves beside him. */}
          <div className="hidden lg:block lg:w-[34%] lg:max-w-[460px] lg:min-w-[280px] sticky top-0 self-start h-[100dvh] md:h-screen">
            {/* The column dissolves into the page rather than being painted
                over it. It used to be covered by gradients of a fixed colour,
                which could only ever guess at the wash behind it — they
                started on #f7ebfb where the page was #f6dcfe, so the "fade"
                opened with a hard step. Fading the column's own alpha instead
                lets the real background show through, whatever it is doing. */}
            <div className="absolute inset-0 overflow-hidden" style={SHOP_SCENE_FADE}>
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover object-[76%_center]"
              >
                <source src={SHOP_SCENE_VIDEO_WEBM} type="video/webm" />
                <source src={SHOP_SCENE_VIDEO} type="video/mp4" />
              </video>
            </div>
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
        message={t("extra.signInForPurchase")}
      />
    </MainLayout>
  );
}
