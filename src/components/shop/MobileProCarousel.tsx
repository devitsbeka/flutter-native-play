import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Users, Sparkles, Check, ChevronRight, Loader2 } from "lucide-react";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";

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

  // Auto-rotate every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PRO_TIERS.length);
    }, 4000);
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
    <div className="px-4 pt-4 pb-2">
      {/* Title */}
      <div className="text-center mb-3">
        <div className="inline-flex items-center gap-2 bg-background/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-border/30">
          <Crown className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-foreground">გახდი PRO</h2>
        </div>
      </div>

      {/* Carousel Card */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl overflow-hidden cursor-pointer"
            style={{
              background: tier.gradient,
              boxShadow: `0 6px 0 ${tier.shadow}, 0 10px 20px rgba(0,0,0,0.3)`,
              opacity: isProcessing ? 0.7 : 1,
              pointerEvents: isProcessing ? 'none' : 'auto',
            }}
            onClick={() => !isCurrentTier && !isProcessing && handleUpgrade(tier.id)}
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

            {/* Card Content */}
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: "rgba(255,255,255,0.2)",
                    boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)",
                  }}
                >
                  <TierIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{tier.nameKa}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">₾{tier.price}</span>
                    <span className="text-sm text-white/70">/თვე</span>
                  </div>
                </div>
              </div>

              {/* Benefits List */}
              <ul className="space-y-2 mb-3">
                {tier.benefits.slice(0, 3).map((benefit, i) => (
                  <li 
                    key={i} 
                    className="flex items-center gap-2 text-sm text-white/90"
                  >
                    <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-3">
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
