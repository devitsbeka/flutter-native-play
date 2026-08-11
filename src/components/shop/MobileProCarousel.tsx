import { siteUrl } from "@/config/site";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Crown, Users, Sparkles, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import { useFriendInvites } from "@/hooks/useFriendInvites";
import { getPriceDisplay } from "@/utils/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import crownIcon from "@/assets/crown-icon.png";
import friendsIcon from "@/assets/group-of-people.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import powersIcon from "@/assets/icons/icon-powers-bottle.png";
import gamepadIcon from "@/assets/pro-banner/banner-gamepad.webp";
import wheelIcon from "@/assets/pro-banner/banner-wheel.webp";
import noAdsIcon from "@/assets/pro-banner/banner-no-ads.webp";
import discountIcon from "@/assets/pro-banner/banner-discount.webp";
import timerIcon from "@/assets/pro-banner/banner-timer.webp";
import { dealToShopItem, useLiveDeals } from "./DailyDealsRow";
import {
  ProTierBanner,
  InviteBanner,
  DealBanner,
  HEADER_SOLO,
  HEADER_FAMILY,
  SKIN_SOLO,
  SKIN_FAMILY,
  SKIN_INVITE,
  SKIN_DEAL_DAILY,
  SKIN_DEAL_HOURLY,
} from "./ProBannerCard";
import type { ShopItem } from "@/hooks/useShopData";
import type { ShopDeal } from "@/config/shopDeals";
import { dealSavings } from "@/config/shopDeals";

type SimplifiedTier = "solo" | "family";

const SIDEBAR_TO_STRIPE_TIER: Record<SimplifiedTier, ProTierId> = {
  solo: "pro",
  family: "pro_plus",
};

type SlideType = "invite" | "solo" | "family" | "deal";

interface MobileProCarouselProps {
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  onItemClick: (item: ShopItem) => void;
}

export function MobileProCarousel({ purchasedItems, isPurchasing, onItemClick }: MobileProCarouselProps) {
  const { t } = useLanguage();
  const { dailyDeal, hourlyDeal, dailyRemaining, hourlyRemaining } = useLiveDeals();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { subscription, isVip } = useVipStatus();
  const { initiateProCheckout, isProcessing } = useProPurchase();
  const { createLinkInvite } = useFriendInvites();
  const [sharing, setSharing] = useState(false);
  const navigate = useNavigate();
  const currentTier = isVip ? subscription?.vip_tier : undefined;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const isActive = isInView && isPageVisible;

  // Pause video + auto-advance while scrolled offscreen or tab hidden
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const SLIDES = useMemo(() => [
    {
      type: "deal" as SlideType,
      id: "deal-daily" as const,
    },
    {
      type: "deal" as SlideType,
      id: "deal-hourly" as const,
    },
    {
      type: "invite" as SlideType,
      id: "invite" as const,
      name: t("extra.inviteMiniTitle"),
      skin: SKIN_INVITE,
    },
    {
      type: "pro" as SlideType,
      id: "solo" as const,
      name: t("extra.soloPro"),
      price: 3.99,
      header: HEADER_SOLO(crownIcon),
      skin: SKIN_SOLO,
      benefits: [
        t("extra.mobileSoloBenefit1"),
        t("extra.mobileSoloBenefit2"),
        t("extra.mobileSoloBenefit3"),
      ],
    },
    {
      type: "family" as SlideType,
      id: "family" as const,
      name: t("extra.familyPro"),
      price: 7.99,
      header: HEADER_FAMILY(friendsIcon),
      skin: SKIN_FAMILY,
      benefits: [
        t("extra.mobileFamilyBenefit1"),
        t("extra.mobileFamilyBenefit2"),
        t("extra.mobileFamilyBenefit3"),
      ],
    },
  ], [t]);

  // Frame 636:169 — the three benefit tiles on a PRO card. Each icon has its
  // own size and offset in the design; they are not a uniform set.
  // Captions sit on their tile's true centre (left + 75), not the frame's
  // own values, which drift a few px off and read as misaligned once the
  // captions all occupy the same box. 124 wide keeps them inside the tile
  // and lets the longer ones wrap rather than run to the edges.
  const PRO_TILES = [
    { left: 43, icon: gamepadIcon, iconSize: 66, iconLeft: 85, iconTop: 138, labelWidth: 124, labelCenter: 118 },
    { left: 213, icon: wheelIcon, iconSize: 67, iconLeft: 254, iconTop: 139, labelWidth: 124, labelCenter: 288 },
    { left: 382, icon: noAdsIcon, iconSize: 69, iconLeft: 423, iconTop: 137, labelWidth: 124, labelCenter: 457 },
  ];

  // Frame 637:352 — a deal card's tiles: PRO time, powers, coins.
  const dealTiles = (deal: ShopDeal) => [
    {
      left: 43,
      icon: crownIcon,
      iconSize: 64.785,
      iconLeft: 85.24,
      iconTop: 152.24,
      label: deal.contents.vip === "week" ? t("shop.vipWeek") : t("shop.vipDay"),
      labelTop: 231,
      labelWidth: 124,
      labelCenter: 118,
    },
    {
      left: 213,
      icon: powersIcon,
      iconSize: 58,
      iconLeft: 257,
      iconTop: 159,
      label: t("shop.allPowersTimes").replace("{count}", String(deal.contents.powers)),
      labelTop: 230,
      labelWidth: 124,
      labelCenter: 288,
    },
    {
      left: 382,
      icon: coinIcon,
      iconSize: 67,
      iconLeft: 423,
      iconTop: 154,
      label: `${deal.contents.coins.toLocaleString()} ${t("shop.coin")}`,
      labelTop: 233,
      labelWidth: 124,
      labelCenter: 457,
    },
  ];

  const getButtonText = (tierId: SimplifiedTier, currentTierVal: string | undefined) => {
    const normalizedTier = currentTierVal === "standard" ? "solo" : currentTierVal;
    if (normalizedTier === "family" || normalizedTier === "pro_plus") {
      return { text: t("extra.activeStatus"), isActive: true };
    }
    if (normalizedTier === "solo" || normalizedTier === "pro") {
      if (tierId === "solo") return { text: t("extra.activeStatus"), isActive: true };
      if (tierId === "family") return { text: t("extra.purchaseBtn"), isActive: false };
    }
    return { text: t("extra.purchaseBtn"), isActive: false };
  };

  // Native scroll-snap reel: swiping is the browser's own smooth scrolling.
  // Auto-advance only steps in after 8s without the user touching the reel.
  const reelRef = useRef<HTMLDivElement | null>(null);
  const lastInteraction = useRef(0);

  const scrollToIndex = useCallback((index: number) => {
    const el = reelRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, []);

  const onReelScroll = useCallback(() => {
    const el = reelRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    setCurrentIndex(Math.min(SLIDES.length - 1, Math.max(0, idx)));
  }, [SLIDES.length]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (Date.now() - lastInteraction.current < 8000) return;
      const el = reelRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      scrollToIndex((idx + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [SLIDES.length, isActive, scrollToIndex]);

  const handleCardClick = () => { navigate('/profile?tab=PRO'); };
  const handleUpgrade = async (tierId: SimplifiedTier) => {
    await initiateProCheckout(SIDEBAR_TO_STRIPE_TIER[tierId]);
  };

  // The banner's own button already stops propagation, so the event is
  // optional here — other call sites still pass one.
  const handleShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (sharing) return;
    setSharing(true);
    try {
      const referralCode = await createLinkInvite("friend_pro");
      if (referralCode) {
        const link = siteUrl(`/auth?mode=signup&ref=${referralCode}`);
        const shareText = t("extra.getProFree");
        if (navigator.share) {
          try {
            await navigator.share({ title: "My Trivia", text: shareText, url: link });
          } catch { /* cancelled */ }
        } else {
          await navigator.clipboard.writeText(link);
          toast.success(t("extra.linkCopiedInvite"));
        }
      }
    } finally {
      setSharing(false);
    }
  };


  return (
    <div ref={containerRef} className="px-4 pt-4 pb-2 md:pb-4">
      <div
        ref={reelRef}
        onScroll={onReelScroll}
        onPointerDown={() => { lastInteraction.current = Date.now(); }}
        onTouchStart={() => { lastInteraction.current = Date.now(); }}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide gap-3 rounded-3xl"
      >
        {SLIDES.map((slide) => {
          const isDealSlide = slide.type === "deal";
          const activeDeal = slide.id === "deal-daily" ? dailyDeal : hourlyDeal;
          return (
          <div key={slide.id} className="w-full shrink-0 snap-center">
            {isDealSlide ? (
              <DealBanner
                skin={slide.id === "deal-daily" ? SKIN_DEAL_DAILY : SKIN_DEAL_HOURLY}
                title={t(activeDeal.nameKey)}
                savings={dealSavings(activeDeal)}
                stripIcon={discountIcon}
                stripLabel={slide.id === "deal-daily" ? t("shop.dailyDeal") : t("shop.hourlyDeal")}
                remainingIcon={timerIcon}
                remaining={slide.id === "deal-daily" ? dailyRemaining : hourlyRemaining}
                tiles={dealTiles(activeDeal)}
                price={activeDeal.price}
                wasPrice={activeDeal.wasPrice}
                gemIcon={gemIcon}
                actionLabel={
                  isPurchasing === activeDeal.id
                    ? <Loader2 className="size-5 animate-spin" />
                    : t("extra.purchaseBtn")
                }
                actionDisabled={purchasedItems.has(activeDeal.id) || isPurchasing === activeDeal.id}
                onAction={() => onItemClick(dealToShopItem(activeDeal, t(activeDeal.nameKey)))}
              />
            ) : slide.type === "invite" ? (
              <InviteBanner
                skin={SKIN_INVITE}
                art={friendsIcon}
                crown={crownIcon}
                headline={t("extra.inviteMiniTitle")}
                reward={t("extra.tenDayPro")}
                onClick={handleCardClick}
                actionLabel={sharing ? <Loader2 className="size-5 animate-spin" /> : t("extra.inviteBtn")}
                actionDisabled={sharing}
                onAction={() => handleShare()}
              />
            ) : (
              (() => {
                const state = getButtonText(slide.id as SimplifiedTier, currentTier);
                const price = getPriceDisplay(slide.price!);
                return (
                  <ProTierBanner
                    skin={slide.skin!}
                    header={slide.header!}
                    name={slide.name}
                    price={`${price.symbol}${price.value}${price.suffix}`}
                    month={price.monthLabel}
                    tiles={PRO_TILES.map((tile, i) => ({
                      ...tile,
                      label: slide.benefits![i],
                      labelTop: 218,
                    }))}
                    onClick={handleCardClick}
                    dimmed={isProcessing}
                    actionLabel={isProcessing ? <Loader2 className="size-5 animate-spin" /> : state.text}
                    actionDisabled={state.isActive || isProcessing}
                    onAction={() => handleUpgrade(slide.id as SimplifiedTier)}
                  />
                );
              })()
            )}
          </div>
          );
        })}
      </div>

      {/* relative z-10: the background blob layer paints over plain
          (non-stacking-context) elements and was swallowing the dots */}
      <div className="relative z-10 flex flex-col items-center gap-1 mt-2">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => { lastInteraction.current = Date.now(); scrollToIndex(index); }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "bg-purple-500 w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{currentIndex + 1} / {SLIDES.length}</span>
      </div>
    </div>
  );
}

// Desktop (md+): the two PRO tiers as side-by-side hero cards under the
// შეთავაზებები title — same gradients and checkout flow as the phone reel.
export function DesktopProBanners() {
  const { t } = useLanguage();
  const { subscription, isVip } = useVipStatus();
  const { initiateProCheckout, isProcessing } = useProPurchase();
  const currentTier = isVip ? subscription?.vip_tier : undefined;

  const tiers = [
    {
      id: "solo" as SimplifiedTier,
      name: t("extra.soloPro"),
      price: 3.99,
      icon: Crown,
      benefits: [t("extra.mobileSoloBenefit1"), t("extra.mobileSoloBenefit2"), t("extra.mobileSoloBenefit3")],
      gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)",
      shadow: "#9D174D",
      popular: false,
    },
    {
      id: "family" as SimplifiedTier,
      name: t("extra.familyPro"),
      price: 7.99,
      icon: Users,
      benefits: [t("extra.mobileFamilyBenefit1"), t("extra.mobileFamilyBenefit2"), t("extra.mobileFamilyBenefit3")],
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #5B21B6 100%)",
      shadow: "#4C1D95",
      popular: true,
    },
  ];

  const buttonState = (tierId: SimplifiedTier) => {
    const normalized = currentTier === "standard" ? "solo" : currentTier;
    if (normalized === "family" || normalized === "pro_plus") return { text: t("extra.activeStatus"), isActive: true };
    if ((normalized === "solo" || normalized === "pro") && tierId === "solo") return { text: t("extra.activeStatus"), isActive: true };
    return { text: t("extra.purchaseBtn"), isActive: false };
  };

  return (
    /* pro-banner-row is a container query context: the pair stacks when the
       row itself gets narrow (an expanded sidebar shrinks it without the
       viewport changing), so a card is never squeezed to the point where its
       contents collide. See .pro-banner-grid in index.css. */
    <div className="pro-banner-row mx-3 sm:mx-4 mb-6">
      <div className="pro-banner-grid grid grid-cols-2 gap-2">
      {tiers.map((tier) => {
        const TierIcon = tier.icon;
        const state = buttonState(tier.id);
        const price = getPriceDisplay(tier.price);
        return (
          <div
            key={tier.id}
            className="relative flex min-h-[251px] min-w-0 flex-col overflow-hidden rounded-[24px] p-5 text-white"
            style={{ background: tier.gradient, opacity: isProcessing ? 0.7 : 1 }}
          >
            {tier.popular && !state.isActive && (
              <div className="absolute top-0 right-0 z-10 flex items-center gap-1 rounded-bl-xl bg-yellow-400 px-2.5 py-0.5 text-[10px] font-bold text-yellow-900 shadow-lg">
                <Sparkles className="h-3 w-3" /> TOP
              </div>
            )}
            {state.isActive && (
              <div className="absolute top-0 right-0 z-10 flex items-center gap-1 rounded-bl-xl bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg">
                <Check className="h-3 w-3" /> {t("extra.activeStatus")}
              </div>
            )}
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            {/* One vertical stack: icon, then title, then price. Nothing
                competes for room on a shared row, and pr-16 keeps the first
                line clear of the TOP / აქტიური badge in the corner. */}
            <div className="relative pr-16">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.2)", boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)" }}
              >
                <TierIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-2 break-words text-lg font-bold leading-tight">{tier.name}</h3>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-1">
                <span className="text-2xl font-black">{price.symbol}{price.value}{price.suffix}</span>
                <span className="text-sm text-white/70">{price.monthLabel}</span>
              </div>
            </div>
            <ul className="relative mt-4 mb-auto flex flex-col gap-1.5">
              {tier.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-white/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                  <span className="min-w-0 break-words text-sm leading-tight">{benefit}</span>
                </li>
              ))}
            </ul>
            <div className="relative flex justify-end pt-3">
              <ProBuyButton
                state={state}
                isProcessing={isProcessing}
                onClick={() => { if (!state.isActive && !isProcessing) initiateProCheckout(SIDEBAR_TO_STRIPE_TIER[tier.id]); }}
                t={t}
              />
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// White chunky buy pill shared by the desktop PRO cards
function ProBuyButton({
  state,
  isProcessing,
  onClick,
  t,
}: {
  state: { text: string; isActive: boolean };
  isProcessing: boolean;
  onClick: () => void;
  t: (key: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state.isActive || isProcessing}
      className="rounded-full px-6 py-2.5 text-sm font-bold disabled:opacity-70"
      style={{
        background: state.isActive ? "rgba(255,255,255,0.15)" : "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
        color: state.isActive ? "rgba(255,255,255,0.7)" : "#402666",
        boxShadow: state.isActive ? "none" : "0 3px 0 #D8D0E8, 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 #FFFFFF",
        border: state.isActive ? "none" : "2px solid #E8E0F5",
      }}
    >
      {isProcessing ? t("extra.processingState") : state.text}
    </button>
  );
}
