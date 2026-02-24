import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users, ChevronRight, Check, Loader2, Crown } from "lucide-react";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useMemo, useState } from "react";
import shopBgVideo from "@/assets/shopbg.mp4";
import shopBgVideoWebm from "@/assets/shopbg.webm";
import crown3dIcon from "@/assets/crown-3d.png";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import { getPriceDisplay } from "@/utils/currency";

// White particle component for sidebar
function SidebarParticle({ delay, left }: { delay: number; left: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-white/60"
      style={{ left: `${left}%`, bottom: -10 }}
      initial={{ opacity: 0, y: 0 }}
      animate={{
        opacity: [0, 0.8, 0.8, 0],
        y: [-10, -200, -350, -450],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

// Simplified tier configuration
const SIMPLIFIED_TIERS = [
  {
    id: "solo" as const,
    nameKa: "სოლო PRO",
    price: 3.99,
    icon: Crown,
    benefits: [
      "2x XP ბონუსი ყველა თამაშში",
      "ექსკლუზიური VIP ბეჯი",
      "რეკლამების გარეშე",
    ],
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #5B21B6 100%)",
    shadow: "#4C1D95",
    ctaText: "გააქტიურება",
  },
  {
    id: "family" as const,
    nameKa: "სამეგობრო PRO",
    price: 7.99,
    icon: Users,
    benefits: [
      "ყველა Solo PRO ფუნქცია + 5 მეგობრის მოწვევა",
      "ყველა PRO ფუნქცია",
      "რეკლამების გარეშე",
    ],
    gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)",
    shadow: "#9D174D",
    popular: true,
    ctaText: "შეძენა",
  },
];

type SimplifiedTier = typeof SIMPLIFIED_TIERS[number]["id"];

// Map sidebar tier IDs to Stripe tier IDs
const SIDEBAR_TO_STRIPE_TIER: Record<SimplifiedTier, ProTierId> = {
  solo: "pro",
  family: "pro_plus",
};

export function ShopRightSidebar() {
  const { subscription } = useVipStatus();
  const { initiateProCheckout, isProcessing } = useProPurchase();
  const currentTier = subscription?.vip_tier as SimplifiedTier | undefined;
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  const handleUpgrade = async (tierId: SimplifiedTier) => {
    const stripeTierId = SIDEBAR_TO_STRIPE_TIER[tierId];
    await initiateProCheckout(stripeTierId);
  };

  // Generate particles
  const particles = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      delay: Math.random() * 6,
      left: Math.random() * 100,
    }));
  }, []);

  return (
    <aside 
      className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-screen fixed top-0 right-0 border-l border-white/10 z-20 overflow-hidden"
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={shopBgVideoWebm} type="video/webm" />
        <source src={shopBgVideo} type="video/mp4" />
      </video>
      
      {/* Gradient overlay for better card visibility at bottom */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
        }}
      />

      {/* White Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <SidebarParticle
            key={particle.id}
            delay={particle.delay}
            left={particle.left}
          />
        ))}
      </div>

      {/* Content Container - Absolute positioned, no scroll */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-[90px] p-4 z-10 pointer-events-none">
        <div className="w-full max-w-[290px] pointer-events-auto">
          {/* გახდი PRO Title - On video background */}
          <div className="text-center mb-3">
          <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl">
            <img src={crown3dIcon} alt="" className="w-6 h-6 object-contain" />
            <h2 className="text-lg font-bold text-white">გახდი PRO</h2>
          </div>
        </div>

        {/* Tier Cards - Compact with hover expand */}
        <div className="space-y-2">
          {SIMPLIFIED_TIERS.map((tier, index) => {
            const isCurrentTier = currentTier === tier.id;
            const isHovered = hoveredTier === tier.id;
            const TierIcon = tier.icon;
            
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                onMouseEnter={() => setHoveredTier(tier.id)}
                onMouseLeave={() => setHoveredTier(null)}
                className="relative rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  background: tier.gradient,
                  boxShadow: `0 6px 0 ${tier.shadow}, 0 10px 20px rgba(0,0,0,0.4)`,
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
                <div className="p-3">
                  {/* Header - Always visible */}
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: "rgba(255,255,255,0.2)",
                        boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)",
                      }}
                    >
                      <TierIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-white">{tier.nameKa}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-white">{getPriceDisplay(tier.price).symbol}{getPriceDisplay(tier.price).value}{getPriceDisplay(tier.price).suffix}</span>
                        <span className="text-xs text-white/70">{getPriceDisplay(tier.price).monthLabel}</span>
                      </div>
                    </div>
                    {!isHovered && !isCurrentTier && (
                      <ChevronRight className="w-5 h-5 text-white/70" />
                    )}
                  </div>

                  {/* Expandable Benefits List */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <ul className="space-y-1.5 mt-3 pt-3 border-t border-white/20">
                          {tier.benefits.map((benefit, i) => (
                            <motion.li 
                              key={i} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center gap-2 text-sm text-white/90"
                            >
                              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                              {benefit}
                            </motion.li>
                          ))}
                        </ul>

                        {/* CTA Button */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="mt-3"
                        >
                          <button
                            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
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
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
          </div>
        </div>
      </div>
    </aside>
  );
}
