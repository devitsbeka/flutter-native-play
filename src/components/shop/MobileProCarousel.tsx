import { siteUrl } from "@/config/site";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Crown, Users, Sparkles, Check, ChevronRight, Loader2, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import { useFriendInvites } from "@/hooks/useFriendInvites";
import { getPriceDisplay } from "@/utils/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import crownIcon from "@/assets/crown-icon.png";
import { DealCard, dealToShopItem, useLiveDeals, DAILY_DEAL_GRADIENT, HOURLY_DEAL_GRADIENT } from "./DailyDealsRow";
import type { ShopItem } from "@/hooks/useShopData";

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
      icon: Crown,
    },
    {
      type: "deal" as SlideType,
      id: "deal-hourly" as const,
      icon: Crown,
    },
    {
      type: "invite" as SlideType,
      id: "invite" as const,
      name: t("extra.inviteMiniTitle"),
      icon: Share2,
      gradient: "linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)",
      shadow: "#C2410C",
    },
    {
      type: "pro" as SlideType,
      id: "solo" as const,
      name: t("extra.soloPro"),
      price: 3.99,
      icon: Crown,
      benefits: [
        t("extra.mobileSoloBenefit1"),
        t("extra.mobileSoloBenefit2"),
        t("extra.mobileSoloBenefit3"),
      ],
      gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)",
      shadow: "#9D174D",
    },
    {
      type: "family" as SlideType,
      id: "family" as const,
      name: t("extra.familyPro"),
      price: 7.99,
      icon: Users,
      benefits: [
        t("extra.mobileFamilyBenefit1"),
        t("extra.mobileFamilyBenefit2"),
        t("extra.mobileFamilyBenefit3"),
      ],
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #5B21B6 100%)",
      shadow: "#4C1D95",
      popular: true,
    },
  ], [t]);

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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
          const SlideIcon = slide.icon;
          const isInviteSlide = slide.type === "invite";
          const isDealSlide = slide.type === "deal";
          const activeDeal = slide.id === "deal-daily" ? dailyDeal : hourlyDeal;
          return (
          <div
            key={slide.id}
            onClick={isDealSlide ? undefined : handleCardClick}
            className={`relative w-full shrink-0 snap-center rounded-2xl overflow-hidden flex min-h-[280px] md:min-h-[300px] ${isDealSlide ? "" : "cursor-pointer"}`}
            style={{ background: "gradient" in slide ? slide.gradient : "transparent", opacity: isProcessing ? 0.7 : 1 }}
          >
            {isDealSlide ? (
              <DealCard
                deal={activeDeal}
                label={slide.id === "deal-daily" ? t("shop.dailyDeal") : t("shop.hourlyDeal")}
                remainingLabel={slide.id === "deal-daily" ? dailyRemaining : hourlyRemaining}
                gradient={slide.id === "deal-daily" ? DAILY_DEAL_GRADIENT : HOURLY_DEAL_GRADIENT}
                chipClass="bg-white/25"
                urgent={slide.id === "deal-hourly"}
                isPurchased={purchasedItems.has(activeDeal.id)}
                isLoading={isPurchasing === activeDeal.id}
                onBuy={() => onItemClick(dealToShopItem(activeDeal, t(activeDeal.nameKey)))}
              />
            ) : (
            <>
            {/* Popular badge for family tier */}
            {'popular' in slide && slide.popular && currentTier !== "family" && (
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                <Sparkles className="w-3 h-3" /> TOP
              </div>
            )}

            {/* Active badge for pro tiers */}
            {!isInviteSlide && getButtonText(slide.id as SimplifiedTier, currentTier).isActive && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                <Check className="w-3 h-3" /> {t("extra.activeStatus")}
              </div>
            )}

            <div className="w-full p-5 z-10 flex flex-col">
              {isInviteSlide ? (
                /* Invite slide content */
                <>
                  <p className="text-sm md:text-base font-bold text-white leading-tight mb-3">
                    {t("extra.inviteMiniTitle")}
                  </p>

                  <span
                    className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-full text-sm font-bold mb-auto"
                    // Purple chip: the gold crown still reads on it, and it
                    // stays distinct from the white share button below
                    style={{
                      background: "linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)",
                      color: "#FFFFFF",
                      boxShadow: "0 3px 0 #5B21B6",
                    }}
                  >
                    <img src={crownIcon} alt="" className="w-6 h-6" />
                    {t("extra.tenDayPro")}
                  </span>

                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={sharing}
                    className="w-full py-3 md:py-4 px-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-4"
                    style={{
                      background: "rgba(255,255,255,0.95)",
                      color: "#7C3AED",
                      boxShadow: "0 3px 0 rgba(0,0,0,0.15)",
                    }}
                  >
                    {sharing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{t("extra.processingState")}</>
                    ) : (
                      <><Share2 className="w-4 h-4" />{t("extra.shareBtn")}</>
                    )}
                  </button>
                </>
              ) : (
                /* PRO tier slide content */
                <>
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)", boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)" }}>
                        <SlideIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-white">{slide.name}</h3>
                      {'price' in slide && (
                        <div className="hidden md:flex items-baseline gap-1 ml-auto">
                          <span className="text-2xl font-black text-white whitespace-nowrap">{getPriceDisplay(slide.price!).symbol}{getPriceDisplay(slide.price!).value}{getPriceDisplay(slide.price!).suffix}</span>
                          <span className="text-sm text-white/70">{getPriceDisplay(slide.price!).monthLabel}</span>
                        </div>
                      )}
                    </div>
                    {'price' in slide && (
                      <div className="flex md:hidden items-baseline gap-1 mb-2">
                        <span className="text-xl font-black text-white">{getPriceDisplay(slide.price!).symbol}{getPriceDisplay(slide.price!).value}{getPriceDisplay(slide.price!).suffix}</span>
                        <span className="text-xs text-white/70">{getPriceDisplay(slide.price!).monthLabel}</span>
                      </div>
                    )}
                  </div>

                  {'benefits' in slide && (
                    <ul className="flex flex-col gap-1.5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-2 mt-5 mb-auto">
                      {slide.benefits!.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-white/90">
                          <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/80 flex-shrink-0 mt-0.5" />
                          <span className="text-xs md:text-sm leading-tight">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {(() => {
                    const buttonState = getButtonText(slide.id as SimplifiedTier, currentTier);
                    return (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (!buttonState.isActive && !isProcessing) handleUpgrade(slide.id as SimplifiedTier); }}
                        disabled={buttonState.isActive || isProcessing}
                        className="w-full py-3 md:py-4 px-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-4"
                        style={{
                          background: buttonState.isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.95)",
                          color: buttonState.isActive ? "rgba(255,255,255,0.6)" : slide.shadow,
                          boxShadow: buttonState.isActive ? "none" : "0 3px 0 rgba(0,0,0,0.15)",
                        }}
                      >
                        {buttonState.isActive ? (
                          <><Check className="w-4 h-4" />{buttonState.text}</>
                        ) : isProcessing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />{t("extra.processingState")}</>
                        ) : (
                          <>{buttonState.text}<ChevronRight className="w-4 h-4" /></>
                        )}
                      </button>
                    );
                  })()}
                </>
              )}
            </div>
            </>
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
    <div className="mx-3 sm:mx-4 mb-6 grid grid-cols-2 gap-2">
      {tiers.map((tier) => {
        const TierIcon = tier.icon;
        const state = buttonState(tier.id);
        const price = getPriceDisplay(tier.price);
        return (
          <div
            key={tier.id}
            className="relative flex min-h-[251px] flex-col overflow-hidden rounded-[24px] p-5 text-white"
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
            {/* Title on its own line with the price beneath it, like the phone
                reel. Sharing one row meant the title had to shrink against a
                nowrap price, and once the sidebar expanded it collapsed to
                nothing and the words spilled across the price. */}
            <div className="relative flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.2)", boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)" }}
              >
                <TierIcon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold leading-tight">{tier.name}</h3>
                <div className="mt-1 flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-2xl font-black">{price.symbol}{price.value}{price.suffix}</span>
                  <span className="text-sm text-white/70">{price.monthLabel}</span>
                </div>
              </div>
            </div>
            <ul className="relative mt-5 mb-auto flex flex-col gap-1.5">
              {tier.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-white/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                  <span className="text-sm leading-tight">{benefit}</span>
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
