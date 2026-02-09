import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Crown, Users, Sparkles, Check, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import shopBgVideo from "@/assets/shopbg.mp4";
import shopBgVideoWebm from "@/assets/shopbg.webm";

const PRO_TIERS = [
  {
    id: "solo" as const,
    nameKa: "სოლო PRO",
    price: 9.99,
    icon: Crown,
    benefits: [
      "უფასო თამაშში",
      "ყველა PRO ფუნქცია",
      "რეკლამის გარეშე",
    ],
    gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)",
    shadow: "#9D174D",
  },
  {
    id: "family" as const,
    nameKa: "სამეგობრო PRO",
    price: 19.99,
    icon: Users,
    benefits: [
      "ყველა Solo PRO ფუნქცია + 5 მეგობრის მოწვევა",
      "უფასო თამაში",
      "რეკლამის გარეშე",
    ],
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #5B21B6 100%)",
    shadow: "#4C1D95",
    popular: true,
  },
];

// Helper function to determine button text and state
const getButtonText = (tierId: SimplifiedTier, currentTier: string | undefined) => {
  // Normalize tier: "standard" from DB maps to "solo" in UI
  const normalizedTier = currentTier === "standard" ? "solo" : currentTier;
  
  // User has Family PRO (top tier) - both cards show active
  if (normalizedTier === "family" || normalizedTier === "pro_plus") {
    return { text: "აქტიური", isActive: true };
  }
  
  // User has Solo PRO (or "standard" from old system)
  if (normalizedTier === "solo" || normalizedTier === "pro") {
    if (tierId === "solo") return { text: "აქტიური", isActive: true };
    if (tierId === "family") return { text: "შეძენა", isActive: false };
  }
  
  // No subscription - show "შეძენა" for all
  return { text: "შეძენა", isActive: false };
};

type SimplifiedTier = typeof PRO_TIERS[number]["id"];

const SIDEBAR_TO_STRIPE_TIER: Record<SimplifiedTier, ProTierId> = {
  solo: "pro",
  family: "pro_plus",
};

export function MobileProCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { subscription } = useVipStatus();
  const { initiateProCheckout, isProcessing } = useProPurchase();
  const navigate = useNavigate();
  const currentTier = subscription?.vip_tier;

  // Auto-rotate every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PRO_TIERS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSwipe = useCallback((_: any, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      setCurrentIndex((prev) => Math.min(prev + 1, PRO_TIERS.length - 1));
    } else if (info.offset.x > swipeThreshold) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  }, []);

  const handleCardClick = () => {
    navigate('/profile?tab=PRO');
  };

  const handleUpgrade = async (tierId: SimplifiedTier) => {
    const stripeTierId = SIDEBAR_TO_STRIPE_TIER[tierId];
    await initiateProCheckout(stripeTierId);
  };

  const tier = PRO_TIERS[currentIndex];
  const TierIcon = tier.icon;

  return (
    <div className="px-4 pt-4 pb-2 md:pb-4">
      {/* Combined PRO Card with Mascot */}
      <div className="relative overflow-hidden rounded-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl overflow-hidden flex min-h-[280px] md:min-h-[300px]"
            style={{
              background: tier.gradient,
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            {/* Popular Badge */}
            {tier.popular && currentTier !== "family" && (
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                <Sparkles className="w-3 h-3" />
                TOP
              </div>
            )}

            {/* Active Badge */}
            {getButtonText(tier.id, currentTier).isActive && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                <Check className="w-3 h-3" />
                აქტიური
              </div>
            )}

            {/* Left: Content */}
            <div className="w-[65%] p-5 z-10 flex flex-col">
              {/* Top Content */}
              <div>
                {/* Header - Icon + Title (+ Price on md+) */}
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: "rgba(255,255,255,0.2)",
                      boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)",
                    }}
                  >
                    <TierIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-white">
                    {tier.nameKa}
                  </h3>
                  {/* Price - md+: inline with header */}
                  <div className="hidden md:flex items-baseline gap-1 ml-auto">
                    <span className="text-2xl font-black text-white">₾{tier.price}</span>
                    <span className="text-sm text-white/70">/თვე</span>
                  </div>
                </div>
                {/* Price - mobile only: below title */}
                <div className="flex md:hidden items-baseline gap-1 mb-2">
                  <span className="text-xl font-black text-white">₾{tier.price}</span>
                  <span className="text-xs text-white/70">/თვე</span>
                </div>
              </div>

              {/* Benefits - add mt-5 (20px) for spacing */}
              <ul className="flex flex-col gap-1.5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-2 mt-5 mb-auto">
                {tier.benefits.map((benefit, i) => (
                  <li 
                    key={i} 
                    className="flex items-start gap-2 text-white/90"
                  >
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/80 flex-shrink-0 mt-0.5" />
                    <span className="text-xs md:text-sm leading-tight">{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button - mt-4 keeps spacing from benefits */}
              {(() => {
                const buttonState = getButtonText(tier.id, currentTier);
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!buttonState.isActive && !isProcessing) {
                        handleUpgrade(tier.id);
                      }
                    }}
                    disabled={buttonState.isActive || isProcessing}
                    className="w-full py-3 md:py-4 px-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-4"
                    style={{
                      background: buttonState.isActive 
                        ? "rgba(255,255,255,0.15)" 
                        : "rgba(255,255,255,0.95)",
                      color: buttonState.isActive ? "rgba(255,255,255,0.6)" : tier.shadow,
                      boxShadow: buttonState.isActive 
                        ? "none" 
                        : "0 3px 0 rgba(0,0,0,0.15)",
                    }}
                  >
                    {buttonState.isActive ? (
                      <>
                        <Check className="w-4 h-4" />
                        {buttonState.text}
                      </>
                    ) : isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        მუშავდება...
                      </>
                    ) : (
                      <>
                        {buttonState.text}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* Right: Video Background */}
            <div className="w-[35%] flex-shrink-0 relative overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: "70% 20%" }}
              >
                <source src={shopBgVideoWebm} type="video/webm" />
                <source src={shopBgVideo} type="video/mp4" />
              </video>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-2">
        {PRO_TIERS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? "bg-purple-500 w-6" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
