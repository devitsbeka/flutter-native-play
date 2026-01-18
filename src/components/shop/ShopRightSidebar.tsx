import { motion } from "framer-motion";
import { Crown, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

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
    nameKa: "Solo",
    price: 9.99,
    icon: Crown,
    benefits: [
      "2x XP ბონუსი",
      "VIP ბეჯი",
      "რეკლამების გარეშე",
    ],
    gradient: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
    buttonGradient: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
  },
  {
    id: "family" as const,
    nameKa: "Family",
    price: 19.99,
    icon: Users,
    benefits: [
      "Solo-ს ყველა უპირატესობა",
      "5 მეგობრის მოწვევა",
      "PRO ყველა წევრისთვის",
    ],
    gradient: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)",
    buttonGradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
    popular: true,
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
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-screen sticky top-0 border-l border-white/10 z-20 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #7C3AED 0%, #5B21B6 100%)",
      }}
    >
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

      {/* Content Container - Flex column with justify-end to push tiers to bottom */}
      <div className="flex-1 flex flex-col p-4 relative z-10">
        {/* Visual Placeholder Area (top) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-48 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
            <span className="text-white/40 text-sm font-medium">Visual Coming Soon</span>
          </div>
        </div>

        {/* Tier Cards (bottom) */}
        <div className="space-y-3 mt-4">
          {SIMPLIFIED_TIERS.map((tier, index) => {
            const isCurrentTier = currentTier === tier.id;
            const TierIcon = tier.icon;
            
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative rounded-2xl p-4 overflow-hidden backdrop-blur-sm"
                )}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {/* Popular Badge */}
                {tier.popular && (
                  <div className="absolute top-0 right-0">
                    <div 
                      className="text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg"
                      style={{ background: tier.gradient }}
                    >
                      პოპულარული
                    </div>
                  </div>
                )}

                {/* Current Tier Badge */}
                {isCurrentTier && (
                  <div className="absolute top-0 right-0">
                    <div 
                      className="text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg bg-green-500"
                    >
                      აქტიური
                    </div>
                  </div>
                )}

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: tier.gradient,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      }}
                    >
                      <TierIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white">{tier.nameKa}</h3>
                      <p className="text-lg font-bold text-white">
                        ₾{tier.price}<span className="text-xs text-white/60 font-normal">/თვე</span>
                      </p>
                    </div>
                  </div>

                  {/* Benefits - Simplified */}
                  <div className="space-y-1.5 mb-3">
                    {tier.benefits.map((benefit, i) => (
                      <div 
                        key={i} 
                        className="flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                        <span className="text-xs text-white/80">
                          {benefit}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  {!isCurrentTier && (
                    <motion.button
                      onClick={() => handleUpgrade(tier.id)}
                      className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2"
                      style={{ 
                        background: tier.buttonGradient,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                      whileHover={{ scale: 1.02, boxShadow: '0 6px 16px rgba(0,0,0,0.4)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      შეძენა
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
