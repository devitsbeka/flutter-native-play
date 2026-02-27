import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Crown, Users, Sparkles, Check, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import { getPriceDisplay } from "@/utils/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import shopBgVideo from "@/assets/shopbg.mp4";
import shopBgVideoWebm from "@/assets/shopbg.webm";

type SimplifiedTier = "solo" | "family";

const SIDEBAR_TO_STRIPE_TIER: Record<SimplifiedTier, ProTierId> = {
  solo: "pro",
  family: "pro_plus",
};

export function MobileProCarousel() {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { subscription, isVip } = useVipStatus();
  const { initiateProCheckout, isProcessing } = useProPurchase();
  const navigate = useNavigate();
  const currentTier = isVip ? subscription?.vip_tier : undefined;

  const PRO_TIERS = useMemo(() => [
    {
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

  // Helper function to determine button text and state
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
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PRO_TIERS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [PRO_TIERS.length]);

  const handleSwipe = useCallback((_: any, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      setCurrentIndex((prev) => Math.min(prev + 1, PRO_TIERS.length - 1));
    } else if (info.offset.x > swipeThreshold) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  }, [PRO_TIERS.length]);

  const handleCardClick = () => { navigate('/profile?tab=PRO'); };
  const handleUpgrade = async (tierId: SimplifiedTier) => {
    await initiateProCheckout(SIDEBAR_TO_STRIPE_TIER[tierId]);
  };

  const tier = PRO_TIERS[currentIndex];
  const TierIcon = tier.icon;

  return (
    <div className="px-4 pt-4 pb-2 md:pb-4">
      <div className="relative overflow-hidden rounded-3xl cursor-pointer" onClick={handleCardClick}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleSwipe}
            className="relative rounded-2xl overflow-hidden flex min-h-[280px] md:min-h-[300px]"
            style={{ background: tier.gradient, opacity: isProcessing ? 0.7 : 1, touchAction: "pan-y" }}
          >
            {tier.popular && currentTier !== "family" && (
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                <Sparkles className="w-3 h-3" /> TOP
              </div>
            )}

            {getButtonText(tier.id, currentTier).isActive && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                <Check className="w-3 h-3" /> {t("extra.activeStatus")}
              </div>
            )}

            <div className="w-[65%] p-5 z-10 flex flex-col">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)", boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)" }}>
                    <TierIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-white">{tier.name}</h3>
                  <div className="hidden md:flex items-baseline gap-1 ml-auto">
                    <span className="text-2xl font-black text-white">{getPriceDisplay(tier.price).symbol}{getPriceDisplay(tier.price).value}{getPriceDisplay(tier.price).suffix}</span>
                    <span className="text-sm text-white/70">{getPriceDisplay(tier.price).monthLabel}</span>
                  </div>
                </div>
                <div className="flex md:hidden items-baseline gap-1 mb-2">
                  <span className="text-xl font-black text-white">{getPriceDisplay(tier.price).symbol}{getPriceDisplay(tier.price).value}{getPriceDisplay(tier.price).suffix}</span>
                  <span className="text-xs text-white/70">{getPriceDisplay(tier.price).monthLabel}</span>
                </div>
              </div>

              <ul className="flex flex-col gap-1.5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-2 mt-5 mb-auto">
                {tier.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/90">
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/80 flex-shrink-0 mt-0.5" />
                    <span className="text-xs md:text-sm leading-tight">{benefit}</span>
                  </li>
                ))}
              </ul>

              {(() => {
                const buttonState = getButtonText(tier.id, currentTier);
                return (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (!buttonState.isActive && !isProcessing) handleUpgrade(tier.id); }}
                    disabled={buttonState.isActive || isProcessing}
                    className="w-full py-3 md:py-4 px-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-4"
                    style={{
                      background: buttonState.isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.95)",
                      color: buttonState.isActive ? "rgba(255,255,255,0.6)" : tier.shadow,
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
            </div>

            <div className="w-[35%] flex-shrink-0 relative overflow-hidden">
              <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "70% 20%" }}>
                <source src={shopBgVideoWebm} type="video/webm" />
                <source src={shopBgVideo} type="video/mp4" />
              </video>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-1 mt-2">
        <div className="flex justify-center gap-2">
          {PRO_TIERS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "bg-purple-500 w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{currentIndex + 1} / {PRO_TIERS.length}</span>
      </div>
    </div>
  );
}
