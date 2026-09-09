import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
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
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";

import { PowerUpTutorialModal } from "@/components/game/PowerUpTutorialModal";
import { PowerUpShopModal } from "@/components/map/PowerUpShopModal";
import { WalletPills } from "@/components/shop/ShopHeader";
import { BalanceStripRow } from "@/components/shared/BalanceStrip";
import { PageHeader } from "@/components/shared/PageHeader";
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
import { NotEnoughGemsModal } from "@/components/home/NotEnoughGemsModal";

export default function PowerUps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Get initial scroll section from URL query param
  const initialScrollSection = searchParams.get("section") || undefined;
  
  // Use consolidated shop data hook for faster loading
  const { data: shopData } = useShopPageData();
  
  const { buyPowerUp, refetch } = useUserPowerUps();
  const { gems, coins, spendCoins, canAffordCoins, purchaseShopItem } = useCurrency();
  const { refresh: refreshVipStatus } = useVipStatus();
  const { refetch: refetchFrames } = useAvatarFrames();
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
  const [successItem, setSuccessItem] = useState({ name: "", quantity: 1 });
  const [showNotEnoughGemsModal, setShowNotEnoughGemsModal] = useState(false);
  const [requiredGems, setRequiredGems] = useState(0);

  const [showAuthModal, setShowAuthModal] = useState(false);

  const handlePowerCardClick = (type: PowerUpType) => {
    // Signed out the row's price pill is already dimmed, because the balance
    // it is compared against is zero — but the tap still opened the power
    // shop, which then had nothing to sell and no way to buy it. Every other
    // buy path on this page (handlePurchase, handleSinglePowerPurchase)
    // already answers this with the sign-in prompt; this one was the gap.
    if (!user) {
      setShowAuthModal(true);
      return;
    }
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
      // The price the button showed is REWARDS.POWER_UP_PRICES; the price
      // CHARGED is economy_config's, read server-side. The retry-once dance
      // that used to be here existed because the coins were already gone by
      // the time the grant was attempted — one transaction, so it cannot
      // happen.
      const bought = await buyPowerUp(powerType, 1);
      await refetch();

      if (!bought) {
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
      // ONE call. This used to be a debit followed by a separate grant —
      // `spendGems(price)`, then `addCoins` / `activateVip` / `addPowerUp` /
      // `unlockFrame` depending on what was bought — with the network in
      // between and a `grantFailed` flag to cope with the half that could
      // fail on its own.
      //
      // The half that mattered was the other one. Every grant call was
      // reachable without the debit: `grant_vip_days` took a duration and
      // nothing else, `credit_gameplay_reward('shop_grant', ...)` took an
      // amount, and both were granted to `authenticated`. Skipping
      // `spendGems` was the entire exploit, and no amount of retry logic on
      // this side could have closed it.
      //
      // `purchase_shop_item` reads the price and the contents from
      // `shop_catalog`, debits, grants and writes the receipt in one
      // transaction. There is no longer a state where the gems are gone and
      // the goods did not arrive, so there is nothing here to compensate for.
      const result = await purchaseShopItem(item.id);

      if (!result) {
        notify.error(t("shop.purchaseFailed"));
        setIsPurchasing(null);
        return;
      }

      // Only the caches the server just invalidated. Balances came back with
      // the receipt and are already applied.
      await refetch();
      if (item.vipDuration) refreshVipStatus();
      if (item.frameId) await refetchFrames();

      playSound("reward");
      trackShopItemPurchased({
        itemId: item.id,
        productType: item.value
          ? "coins"
          : item.vipDuration
            ? "vip"
            : item.frameId
              ? "frame"
              : isBundleId(item.id)
                ? "bundle"
                : "powerup",
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
        {/* The same header every other page uses — opaque, and pinned, so it
            does not shift or let content show through as the page scrolls
            under it. Its own pt-[env(safe-area-inset-top)] is gone: #root
            insets the page and PageHeader paints the status bar strip
            itself, so the manual one was a second inset on top of both. */}
        {/* Above md the balances ride here, beside the title: the row is
            already on screen and half empty, so spending a second full-width
            band on two numbers was the waste. The piggy stays behind on the
            phone band — at this width buying more is a tap away in the grid
            below, and the header is not where a purchase belongs. */}
        <PageHeader
          title={t("menu.shop")}
          showBack={false}
          // Signed out every figure is a zero, so the pills are hidden —
          // the strip below does the same for phones, from inside
          // BalanceStripRow itself.
          titleAccessory={user ? <WalletPills className="ml-3 hidden md:flex" /> : undefined}
          belowRow={<BalanceStripRow />}
        />

        {/* The shop's own phone wallet band used to sit here: a 56px lilac
            strip with the balances and a piggy bank. The balances are the
            shared strip in the header above now — the same row, the same
            pills, on explore and the rating board too — so the band was a
            second design for one job, and the piggy was decorative. */}

        <div className="flex flex-1 min-h-0">
          {/* Main content. No percentage cap: the scene beside it is capped
              instead, so every pixel past that width goes to the shop rather
              than stretching a video — which is what squeezed the product
              grid whenever the left menu was expanded. */}
          <div className="flex-1 min-w-0 relative pb-[calc(var(--bottom-nav-height)_+_var(--safe-bottom)_+_1rem)] md:pb-0 bg-transparent scroll-smooth scrollbar-hide overflow-y-auto">
            {/* GlobalSplineBackground is already mounted app-wide in App.tsx
                and /power-ups is one of the routes it paints, so this second
                instance drew the same four fixed inset-0 layers over the top
                of the first — including a second full-screen copy of the
                background video, decoding continuously behind the identical
                one in front of it. */}

            {/* Standard Shop Layout - Hero carousel + product grids.
                No top padding of its own: ShopStandardLayout already opens
                with some, and the reel under that opens with more of its
                own again — three paddings stacked into one gap nobody meant
                to draw, parking the PRO banner nearly a screen's-height
                below the balance row (owner: "reduce space between sticky
                header and banners"). */}
            <div>
              <ShopStandardLayout
                sections={SHOP_SECTIONS}
                gems={gems}
                purchasedItems={purchasedItems}
                isPurchasing={isPurchasing || (isStripeProcessing ? "stripe" : null)}
                isFrameUnlocked={isFrameUnlocked}
                onItemClick={handlePurchase}
                onSinglePowerPurchase={handleSinglePowerPurchase}
                initialScrollSection={initialScrollSection}
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
              <BackgroundVideo
                sources={[
                  { src: SHOP_SCENE_VIDEO_WEBM, type: "video/webm" },
                  { src: SHOP_SCENE_VIDEO, type: "video/mp4" },
                ]}
                still="/videos/shop-scene-still.jpg"
                className="absolute inset-0"
                videoClassName="object-[76%_center]"
              />
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
