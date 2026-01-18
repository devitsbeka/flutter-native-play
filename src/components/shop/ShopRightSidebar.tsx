import { motion } from "framer-motion";
import { Crown, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useMemo } from "react";
import shopBg from "@/assets/shopbg.png";

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
    benefits: ["2x XP ბონუსი", "VIP ბეჯი", "რეკლამების გარეშე"],
    gradient: "linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)",
    shadow: "#5B21B6",
  },
  {
    id: "family" as const,
    nameKa: "Family",
    price: 19.99,
    icon: Users,
    benefits: ["Solo + 5 მეგობარი", "PRO ყველა წევრისთვის"],
    gradient: "linear-gradient(180deg, #EC4899 0%, #DB2777 100%)",
    shadow: "#9D174D",
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
    <aside 
      className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-screen sticky top-0 border-l border-white/10 z-20 relative overflow-hidden"
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${shopBg})` }}
      />
      
      {/* Gradient overlay for better card visibility at bottom */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)",
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
        {/* Compact Tier Cards - 3D Chunky Style */}
        <div className="space-y-3">
          {SIMPLIFIED_TIERS.map((tier, index) => {
            const isCurrentTier = currentTier === tier.id;
            const TierIcon = tier.icon;
            
            return (
              <motion.button
                key={tier.id}
                onClick={() => !isCurrentTier && handleUpgrade(tier.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative w-full py-3 px-4 rounded-2xl font-bold text-white transition-all text-left"
                style={{
                  background: tier.gradient,
                  boxShadow: `0 6px 0 ${tier.shadow}, 0 8px 16px rgba(0,0,0,0.3)`,
                  cursor: isCurrentTier ? 'default' : 'pointer',
                }}
                whileHover={!isCurrentTier ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isCurrentTier ? { scale: 0.98, y: 0 } : {}}
                disabled={isCurrentTier}
              >
                {/* Popular Badge */}
                {tier.popular && !isCurrentTier && (
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                    ⭐ TOP
                  </div>
                )}

                {/* Active Badge */}
                {isCurrentTier && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                    ✓ აქტიური
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: "rgba(255,255,255,0.2)",
                      boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3)",
                    }}
                  >
                    <TierIcon className="w-5 h-5 text-white" />
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold">{tier.nameKa}</span>
                      <span className="text-lg font-bold">
                        ₾{tier.price}
                        <span className="text-xs opacity-70">/თვე</span>
                      </span>
                    </div>
                    <div className="text-xs text-white/80 mt-0.5 truncate">
                      {tier.benefits.join(" • ")}
                    </div>
                  </div>
                </div>

                {/* Upgrade indicator */}
                {!isCurrentTier && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-white/90">
                    <Sparkles className="w-3 h-3" />
                    <span>შეძენა</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
