import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Crown, Users, Sparkles, Check, ChevronRight, Loader2, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import { useFriendInvites } from "@/hooks/useFriendInvites";
import { getPriceDisplay } from "@/utils/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import shopBgVideo from "@/assets/shopbg.mp4";
import shopBgVideoWebm from "@/assets/shopbg.webm";
import crownIcon from "@/assets/crown-icon.png";

type SimplifiedTier = "solo" | "family";

const SIDEBAR_TO_STRIPE_TIER: Record<SimplifiedTier, ProTierId> = {
  solo: "pro",
  family: "pro_plus",
};

type SlideType = "invite" | "solo" | "family";

export function MobileProCarousel() {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { subscription, isVip } = useVipStatus();
  const { initiateProCheckout, isProcessing } = useProPurchase();
  const { createLinkInvite } = useFriendInvites();
  const [sharing, setSharing] = useState(false);
  const navigate = useNavigate();
  const currentTier = isVip ? subscription?.vip_tier : undefined;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
      type: "invite" as SlideType,
      id: "invite" as const,
      name: t("extra.inviteMiniTitle"),
      icon: Share2,
      gradient: "linear-gradient(135deg, #EC4899 0%, #9333EA 100%)",
      shadow: "#7C3AED",
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

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [SLIDES.length, isActive]);

  const handleSwipe = useCallback((_: any, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      setCurrentIndex((prev) => Math.min(prev + 1, SLIDES.length - 1));
    } else if (info.offset.x > swipeThreshold) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  }, [SLIDES.length]);

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
        const link = `${window.location.origin}/auth?ref=${referralCode}`;
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

  const slide = SLIDES[currentIndex];
  const SlideIcon = slide.icon;
  const isInviteSlide = slide.type === "invite";

  // slide.id in deps: the keyed <video> remounts on every slide change
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive, slide.id]);

  return (
    <div ref={containerRef} className="px-4 pt-4 pb-2 md:pb-4">
      <div className="relative overflow-hidden rounded-3xl cursor-pointer" onClick={handleCardClick}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleSwipe}
            className="relative rounded-2xl overflow-hidden flex min-h-[280px] md:min-h-[300px]"
            style={{ background: slide.gradient, opacity: isProcessing ? 0.7 : 1, touchAction: "pan-y" }}
          >
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

            <div className="w-[65%] p-5 z-10 flex flex-col">
              {isInviteSlide ? (
                /* Invite slide content */
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)", boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)" }}>
                      <Share2 className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <p className="text-sm md:text-base font-bold text-white leading-tight mb-3">
                    {t("extra.inviteMiniTitle")}
                  </p>

                  <span
                    className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full text-xs font-bold text-white mb-auto"
                    style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}
                  >
                    <img src={crownIcon} alt="" className="w-4 h-4" />
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
                          <span className="text-2xl font-black text-white">{getPriceDisplay(slide.price!).symbol}{getPriceDisplay(slide.price!).value}{getPriceDisplay(slide.price!).suffix}</span>
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

            <div className="w-[35%] flex-shrink-0 relative overflow-hidden">
              <video ref={videoRef} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "70% 20%" }}>
                <source src={shopBgVideoWebm} type="video/webm" />
                <source src={shopBgVideo} type="video/mp4" />
              </video>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-1 mt-2">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "bg-purple-500 w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{currentIndex + 1} / {SLIDES.length}</span>
      </div>
    </div>
  );
}
