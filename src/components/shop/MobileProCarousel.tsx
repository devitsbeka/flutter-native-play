import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { PRICES } from "@/config/pricing";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import { useStorePrice } from "@/hooks/useStorePrice";
import { useLanguage } from "@/contexts/LanguageContext";
import crownIcon from "@/assets/crown-icon.png";
import friendsIcon from "@/assets/group-of-people.png";
import gamepadIcon from "@/assets/pro-banner/banner-gamepad.webp";
import wheelIcon from "@/assets/pro-banner/banner-wheel.webp";
import noAdsIcon from "@/assets/pro-banner/banner-no-ads.webp";
import { dealToShopItem, useLiveDeals, DealBannerCard } from "./DailyDealsRow";
import { SubscriptionTerms } from "@/components/shared/SubscriptionTerms";
import {
  ProTierBanner,
  HEADER_SOLO,
  HEADER_FAMILY,
  SKIN_WHITE,
} from "./ProBannerCard";
import type { ShopItem } from "@/hooks/useShopData";

type SimplifiedTier = "solo" | "family";

const SIDEBAR_TO_STRIPE_TIER: Record<SimplifiedTier, ProTierId> = {
  solo: "pro",
  family: "pro_plus",
};

/** gap-3 between banners, in px — the reel needs the number to page by. */
const REEL_GAP = 12;

/**
 * Does the player's subscription already cover this tier?
 *
 * Friends PRO contains solo, so it answers for both cards; solo answers only
 * for its own. Lifted out of getButtonText because the shop needs the same
 * answer before the slide is built, and a `const` arrow declared further down
 * the component cannot be read from a useMemo above it.
 */
function ownsTier(tierId: SimplifiedTier, currentTier: string | undefined): boolean {
  const normalized = currentTier === "standard" ? "solo" : currentTier;
  if (normalized === "family" || normalized === "pro_plus") return true;
  if (normalized === "solo" || normalized === "pro") return tierId === "solo";
  return false;
}

// "pro" is the solo tier's slide type — the two subscription slides, which
// `slides: "pro"` keeps and everything else drops.
type SlideType = "pro" | "family" | "deal";

// Frame 636:169 — the artwork for each promise a PRO tier makes, at the
// size the frame draws it. Not a uniform set, so each carries its own.
interface ProBenefitArt {
  icon: string;
  size: number;
  top: number;
}
const BENEFIT_PLAY: ProBenefitArt = { icon: gamepadIcon, size: 66, top: 138 };
const BENEFIT_FEATURES: ProBenefitArt = { icon: wheelIcon, size: 67, top: 139 };
const BENEFIT_NO_ADS: ProBenefitArt = { icon: noAdsIcon, size: 69, top: 137 };

interface ProBannerReelProps {
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  onItemClick: (item: ShopItem) => void;
  /**
   * "pro" keeps the two subscription tiers and drops the timed package
   * deals. Packages are the shop's business; carrying them on the profile
   * made a two-offer reel look like a four-offer one.
   */
  slides?: "all" | "pro";
}

export function ProBannerReel({ purchasedItems, isPurchasing, onItemClick, slides = "all" }: ProBannerReelProps) {
  const { t } = useLanguage();
  const resolvePrice = useStorePrice();
  // The web helper supplied this alongside the price; StoreKit's string
  // carries only the amount, so the period label comes from i18n.
  const monthLabel = t("extra.perMonthShort");
  const { dailyDeal, hourlyDeal, dailyRemaining, hourlyRemaining } = useLiveDeals();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { subscription, isVip } = useVipStatus();
  const { initiateProCheckout, isProcessing } = useProPurchase();
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

  const ALL_SLIDES = useMemo(() => [
    {
      type: "deal" as SlideType,
      id: "deal-daily" as const,
    },
    {
      type: "deal" as SlideType,
      id: "deal-hourly" as const,
    },
    {
      type: "pro" as SlideType,
      id: "solo" as const,
      name: t("extra.soloPro"),
      price: PRICES.pro_monthly.USD,
      header: HEADER_SOLO(crownIcon),
      skin: SKIN_WHITE,
      benefits: [
        { art: BENEFIT_PLAY, label: t("extra.mobileSoloBenefit1") },
        { art: BENEFIT_FEATURES, label: t("extra.mobileSoloBenefit2") },
        { art: BENEFIT_NO_ADS, label: t("extra.mobileSoloBenefit3") },
      ],
    },
    {
      type: "family" as SlideType,
      id: "family" as const,
      name: t("extra.familyPro"),
      price: PRICES.pro_plus_monthly.USD,
      header: HEADER_FAMILY(friendsIcon),
      skin: SKIN_WHITE,
      benefits: [
        // Family leads with the PRO bundle, then play — the opposite of solo.
        // Same order as solo above — play, features, no ads — so the two
        // tiers read as the same offer at two sizes rather than two
        // different lists. Art follows meaning, not position.
        { art: BENEFIT_PLAY, label: t("extra.mobileFamilyBenefit1") },
        { art: BENEFIT_FEATURES, label: t("extra.mobileFamilyBenefit2") },
        { art: BENEFIT_NO_ADS, label: t("extra.mobileFamilyBenefit3") },
      ],
    },
  ], [t]);

  const SLIDES = useMemo(() => {
    // The profile's PRO tab keeps every tier: it is where a subscriber goes
    // to see what they are on, and dropping the one they own would leave a
    // subscriber's own plan page showing only the tier above it.
    if (slides === "pro") return ALL_SLIDES.filter((s) => s.type !== "deal");
    // The shop is a list of things to buy. A tier the player is already on is
    // not one, and it was taking a full-width slide — with a gold button —
    // to say so.
    return ALL_SLIDES.filter(
      (s) => s.type === "deal" || !ownsTier(s.id as SimplifiedTier, currentTier),
    );
  }, [ALL_SLIDES, slides, currentTier]);

  // Captions sit on their tile's true centre, not the frame's own values,
  // which drift a few px off and read as misaligned once the captions all
  // occupy the same box. 124 wide keeps them inside the tile and lets the
  // longer ones wrap rather than run to the edges.
  const PRO_COLUMNS = [
    { left: 43, labelCenter: 118 },
    { left: 213, labelCenter: 288 },
    { left: 382, labelCenter: 457 },
  ];

  // Build the three tiles for a tier. The icon is chosen by what the benefit
  // promises, never by which column it lands in: the two tiers list their
  // benefits in different orders, and keying off position put the prize
  // wheel on "free play" and a joystick on "PRO features". Each icon keeps
  // its own size from the frame and is centred on its column.
  const proTiles = (benefits: { art: ProBenefitArt; label: string }[]) =>
    benefits.map(({ art, label }, i) => ({
      icon: art.icon,
      iconSize: art.size,
      iconLeft: PRO_COLUMNS[i].labelCenter - art.size / 2,
      iconTop: art.top,
      label,
      labelTop: 218,
      labelWidth: 124,
      labelCenter: PRO_COLUMNS[i].labelCenter,
    }));

  const getButtonText = (tierId: SimplifiedTier, currentTierVal: string | undefined) =>
    ownsTier(tierId, currentTierVal)
      ? { text: t("extra.activeStatus"), isActive: true }
      : { text: t("extra.purchaseBtn"), isActive: false };

  // Native scroll-snap reel: swiping is the browser's own smooth scrolling.
  // Auto-advance only steps in after 8s without the user touching the reel.
  const reelRef = useRef<HTMLDivElement | null>(null);
  const lastInteraction = useRef(0);

  // How many banners fit at once. Measured from the reel, not the viewport,
  // so an expanding sidebar drops it from three to two without a breakpoint
  // knowing the sidebar exists. 360 is the width below which a banner's
  // captions stop being readable.
  const [perView, setPerView] = useState(1);
  // One banner's width, which is what decides whether the three benefits fit
  // side by side or have to become a list. Measured rather than guessed from
  // the viewport: the same reel is narrower on the shop page than on the
  // profile at the same screen width.
  const [bannerWidth, setBannerWidth] = useState(0);
  useEffect(() => {
    const el = reelRef.current;
    if (!el) return;
    const measure = () => {
      const pv = Math.max(1, Math.min(3, Math.floor(el.clientWidth / 360)));
      setPerView(pv);
      setBannerWidth((el.clientWidth - REEL_GAP * (pv - 1)) / pv);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A page is one banner's width, so the arrows step by one rather than
  // jumping a whole screenful past what the player was looking at.
  const pageWidth = useCallback(() => {
    const el = reelRef.current;
    if (!el) return 1;
    return Math.max(1, (el.clientWidth - REEL_GAP * (perView - 1)) / perView + REEL_GAP);
  }, [perView]);

  const lastIndex = Math.max(0, SLIDES.length - perView);

  const scrollToIndex = useCallback((index: number) => {
    const el = reelRef.current;
    if (!el) return;
    el.scrollTo({ left: index * pageWidth(), behavior: "smooth" });
  }, [pageWidth]);

  const onReelScroll = useCallback(() => {
    const el = reelRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / pageWidth());
    setCurrentIndex(Math.min(SLIDES.length - 1, Math.max(0, idx)));
  }, [SLIDES.length, pageWidth]);

  // Mouse drag. Touch already drags the reel natively; a pointer without
  // touch does not, and on desktop the reel is the main way to browse.
  const drag = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    lastInteraction.current = Date.now();
    if (e.pointerType === "touch") return;
    const el = reelRef.current;
    if (!el) return;
    drag.current = { startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = reelRef.current;
    if (!drag.current || !el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => { drag.current = null; };
  // A drag that moved must not also fire the banner underneath it.
  const swallowClickAfterDrag = (e: React.MouseEvent) => {
    if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); }
  };

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (Date.now() - lastInteraction.current < 8000) return;
      const el = reelRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollLeft / pageWidth());
      scrollToIndex(idx >= lastIndex ? 0 : idx + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, [lastIndex, isActive, scrollToIndex]);

  const handleCardClick = () => { navigate('/profile?tab=PRO'); };
  const handleUpgrade = async (tierId: SimplifiedTier) => {
    await initiateProCheckout(SIDEBAR_TO_STRIPE_TIER[tierId]);
  };


  return (
    <div ref={containerRef} className="relative px-4 pt-4 pb-2 md:pb-4">
      <div
        ref={reelRef}
        onScroll={onReelScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={swallowClickAfterDrag}
        onTouchStart={() => { lastInteraction.current = Date.now(); }}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide gap-3 rounded-3xl"
        // The browser picks the axis at the start of the gesture and keeps
        // it, so a horizontal swipe still moves only the reel. Pinning this
        // to pan-x alone also swallowed vertical drags, and the banner is
        // most of a phone screen — so the page could not be scrolled at all
        // while the finger was on it.
        style={{ touchAction: "pan-x pan-y" }}
      >
        {SLIDES.map((slide) => {
          const isDealSlide = slide.type === "deal";
          const activeDeal = slide.id === "deal-daily" ? dailyDeal : hourlyDeal;
          return (
          <div
            key={slide.id}
            // Centred, because the slides are not all the same height: a
            // tier card with its benefits stacked into a list is taller than
            // the invite card beside it. Top-aligned, the shorter one hung
            // from the ceiling with the difference below it.
            className="flex shrink-0 snap-center items-center"
            style={{ width: `calc((100% - ${REEL_GAP * (perView - 1)}px) / ${perView})` }}
          >
            {isDealSlide ? (
              <DealBannerCard
                deal={activeDeal}
                label={slide.id === "deal-daily" ? t("shop.dailyDeal") : t("shop.hourlyDeal")}
                remainingLabel={slide.id === "deal-daily" ? dailyRemaining : hourlyRemaining}
                daily={slide.id === "deal-daily"}
                isPurchased={purchasedItems.has(activeDeal.id)}
                isLoading={isPurchasing === activeDeal.id}
                onBuy={() => onItemClick(dealToShopItem(activeDeal, t(activeDeal.nameKey)))}
              />
            ) : (
              (() => {
                const state = getButtonText(slide.id as SimplifiedTier, currentTier);
                // StoreKit's own localized string on native — a price compiled
                // into the bundle is wrong in every storefront but one.
                const price = resolvePrice(slide.id as string, slide.price!);
                return (
                  <ProTierBanner
                    skin={slide.skin!}
                    header={slide.header!}
                    name={slide.name}
                    price={price.display}
                    month={monthLabel}
                    tiles={proTiles(slide.benefits!)}
                    // Three tiles need roughly 420px of banner to stay
                    // readable; below that they become a list.
                    //
                    // Only where this reel is showing the tiers alone. In
                    // the shop it sits beside deal and invite banners built
                    // to the frame's height, and a taller card there would
                    // leave every other slide with a gap under it.
                    stacked={slides === "pro" && bannerWidth > 0 && bannerWidth < 420}
                    onClick={handleCardClick}
                    dimmed={isProcessing}
                    actionLabel={isProcessing ? <Loader2 className="size-5 animate-spin" /> : state.text}
                    actionDisabled={state.isActive || isProcessing}
                    actionActive={state.isActive && !isProcessing}
                    onAction={() => handleUpgrade(slide.id as SimplifiedTier)}
                  />
                );
              })()
            )}
          </div>
          );
        })}
      </div>

      {/* Arrows, shown once there is a pointer to use them with. They step
          one banner at a time and hide at each end rather than sitting there
          dead. */}
      {[-1, 1].map((dir) => {
        const atEnd = dir < 0 ? currentIndex <= 0 : currentIndex >= lastIndex;
        return (
          <button
            key={dir}
            type="button"
            aria-label={dir < 0 ? t("common.back") : t("common.next")}
            onClick={() => {
              lastInteraction.current = Date.now();
              scrollToIndex(Math.min(lastIndex, Math.max(0, currentIndex + dir)));
            }}
            // z-[15], deliberately below the sticky header stack (z-20): these used
            // to share z-20 and sit later in the DOM, so equal z-index resolved by
            // document order and the arrows scrolled OVER the page header instead
            // of under it. 15 keeps them above the carousel cards, which are all
            // z-auto or z-10.
            className={`absolute top-1/2 z-[15] flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(64,38,102,0.1)] bg-white/90 text-[#402666] shadow-[0_4px_14px_rgba(64,38,102,0.18)] backdrop-blur transition-opacity ${
              atEnd || lastIndex === 0 ? "pointer-events-none opacity-0" : "opacity-100 hover:bg-white"
            } ${dir < 0 ? "left-1" : "right-1"}`}
          >
            {dir < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        );
      })}

      {/* relative z-10: the background blob layer paints over plain
          (non-stacking-context) elements and was swallowing the dots */}
      <div className="relative z-10 flex flex-col items-center gap-1 mt-2">
        <div className="flex justify-center gap-2">
          {Array.from({ length: lastIndex + 1 }, (_, index) => (
            <button
              key={index}
              onClick={() => { lastInteraction.current = Date.now(); scrollToIndex(index); }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "bg-purple-500 w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
            />
          ))}
        </div>
      </div>

      {/* Required beside any surface that can start a subscription purchase
          (guideline 3.1.2) — this reel always carries the two PRO tiers. */}
      <SubscriptionTerms className="relative z-10 mt-3 px-6 text-center" />
    </div>
  );
}
