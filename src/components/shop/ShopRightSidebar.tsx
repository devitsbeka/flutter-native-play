import { motion } from "framer-motion";
import { Crown, Sparkles, Users, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useMemo } from "react";
import shopBgVideo from "@/assets/shopbg.mp4";

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
    nameKa: "Solo PRO",
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
    nameKa: "Family PRO",
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

type SimplifiedTier = typeof SIMPLIFIED_TIERS[number]["id"];

export function ShopRightSidebar() {
  const navigate = useNavigate();
  const { subscription } = useVipStatus();
  const currentTier = subscription?.vip_tier as SimplifiedTier | undefined;

  const handleUpgrade = (tierId: SimplifiedTier) => {
    navigate('/vip', { state: { selectedTier: tierId } });
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
      className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-screen sticky top-0 border-l border-white/10 z-20 relative overflow-hidden"
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
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

      {/* Content Container */}
      <div className="flex-1 flex flex-col justify-end p-4 relative z-10">
        {/* Tier Cards - Taller with proper CTAs */}
        <div className="space-y-4">
          {SIMPLIFIED_TIERS.map((tier, index) => {
            const isCurrentTier = currentTier === tier.id;
            const TierIcon = tier.icon;
            
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: tier.gradient,
                  boxShadow: `0 8px 0 ${tier.shadow}, 0 12px 24px rgba(0,0,0,0.4)`,
                }}
              >
                {/* Popular Badge */}
                {tier.popular && !isCurrentTier && (
                  <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    პოპულარული
                  </div>
                )}

                {/* Active Badge */}
                {isCurrentTier && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    აქტიური
                  </div>
                )}

                {/* Card Content */}
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ 
                        background: "rgba(255,255,255,0.2)",
                        boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 0 rgba(0,0,0,0.2)",
                      }}
                    >
                      <TierIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{tier.nameKa}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">₾{tier.price}</span>
                        <span className="text-sm text-white/70">/თვე</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits List */}
                  <ul className="space-y-2 mb-4">
                    {tier.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/90">
                        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <motion.button
                    onClick={() => !isCurrentTier && handleUpgrade(tier.id)}
                    disabled={isCurrentTier}
                    className="w-full py-3 px-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2"
                    style={{
                      background: isCurrentTier 
                        ? "rgba(255,255,255,0.15)" 
                        : "rgba(255,255,255,0.95)",
                      color: isCurrentTier ? "rgba(255,255,255,0.6)" : tier.shadow,
                      boxShadow: isCurrentTier 
                        ? "none" 
                        : "0 4px 0 rgba(0,0,0,0.2), 0 6px 12px rgba(0,0,0,0.3)",
                      cursor: isCurrentTier ? 'default' : 'pointer',
                    }}
                    whileHover={!isCurrentTier ? { scale: 1.02, y: -2 } : {}}
                    whileTap={!isCurrentTier ? { scale: 0.98, y: 0 } : {}}
                  >
                    {isCurrentTier ? (
                      <>
                        <Check className="w-4 h-4" />
                        აქტიურია
                      </>
                    ) : (
                      <>
                        {tier.ctaText}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
