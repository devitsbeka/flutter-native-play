import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Users, Sparkles, Check, ChevronRight, Loader2 } from "lucide-react";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import shopBgVideo from "@/assets/shopbg.mp4";

const PRO_TIERS = [
  {
    id: "solo" as const,
    nameKa: "სოლო PRO",
    price: 9.99,
    icon: Crown,
    benefits: [
      "2x XP ბონუსი ყველა თამაშში",
      "ექსკლუზიური VIP ბეჯი",
      "რეკლამების გარეშე",
      "პრიორიტეტული მხარდაჭერა",
    ],
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #5B21B6 100%)",
    shadow: "#4C1D95",
    ctaText: "გააქტიურება",
  },
  {
    id: "family" as const,
    nameKa: "სამეგობრო PRO",
    price: 19.99,
    icon: Users,
    benefits: [
      "Solo PRO + 5 მეგობარი",
      "საოჯახო ლიდერბორდი",
      "ყველა PRO ფუნქცია",
      "ერთობლივი გამოწვევები",
    ],
    gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)",
    shadow: "#9D174D",
    popular: true,
    ctaText: "შეძენა",
  },
];

type SimplifiedTier = typeof PRO_TIERS[number]["id"];

const SIDEBAR_TO_STRIPE_TIER: Record<SimplifiedTier, ProTierId> = {
  solo: "pro",
  family: "pro_plus",
};

export function MobileProCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { subscription } = useVipStatus();
  const { initiateProCheckout, isProcessing } = useProPurchase();
  const currentTier = subscription?.vip_tier as SimplifiedTier | undefined;

  // Auto-rotate every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PRO_TIERS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleUpgrade = async (tierId: SimplifiedTier) => {
    const stripeTierId = SIDEBAR_TO_STRIPE_TIER[tierId];
    await initiateProCheckout(stripeTierId);
  };

  const tier = PRO_TIERS[currentIndex];
  const isCurrentTier = currentTier === tier.id;
  const TierIcon = tier.icon;

  return (
    <div className="px-4 pt-4 pb-0">
      {/* Combined PRO Card with Mascot */}
      <div className="relative overflow-hidden rounded-3xl min-h-[280px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl overflow-hidden flex h-full"
            style={{
              background: tier.gradient,
              boxShadow: `0 6px 0 ${tier.shadow}, 0 10px 25px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.2)`,
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            {/* Popular Badge */}
            {tier.popular && !isCurrentTier && (
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                <Sparkles className="w-3 h-3" />
                TOP
              </div>
            )}

            {/* Active Badge */}
            {isCurrentTier && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                <Check className="w-3 h-3" />
                აქტიური
              </div>
            )}

            {/* Left: Content */}
            <div className="flex-1 p-5 z-10">
              {/* Header - Icon + Title + Price on same row */}
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: "rgba(255,255,255,0.2)",
                    boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)",
                  }}
                >
                  <TierIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white flex-1">
                  {tier.nameKa}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-white">₾{tier.price}</span>
                  <span className="text-xs text-white/70">/თვე</span>
                </div>
              </div>

              {/* Benefits - 2 column grid */}
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-4">
                {tier.benefits.map((benefit, i) => (
                  <li 
                    key={i} 
                    className="flex items-start gap-1.5 text-white/90"
                  >
                    <Check className="w-3 h-3 text-white/80 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight">{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isCurrentTier && !isProcessing) {
                    handleUpgrade(tier.id);
                  }
                }}
                disabled={isCurrentTier || isProcessing}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                style={{
                  background: isCurrentTier 
                    ? "rgba(255,255,255,0.15)" 
                    : "rgba(255,255,255,0.95)",
                  color: isCurrentTier ? "rgba(255,255,255,0.6)" : tier.shadow,
                  boxShadow: isCurrentTier 
                    ? "none" 
                    : "0 3px 0 rgba(0,0,0,0.15)",
                }}
              >
                {isCurrentTier ? (
                  <>
                    <Check className="w-4 h-4" />
                    აქტიურია
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    მუშავდება...
                  </>
                ) : (
                  <>
                    {tier.ctaText}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Right: Video Background */}
            <div className="w-[120px] flex-shrink-0 relative overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover object-center"
              >
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
