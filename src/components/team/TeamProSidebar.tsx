import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PRO_TIERS, ProTier } from "@/components/profile/ProPlansSection";
import { useVipStatus } from "@/hooks/useVipStatus";
import { getPriceDisplay } from "@/utils/currency";
import { cn } from "@/lib/utils";

export function TeamProSidebar() {
  const navigate = useNavigate();
  const { subscription, isVip } = useVipStatus();
  const currentTier = isVip ? subscription?.vip_tier as ProTier | undefined : undefined;

  const handleUpgrade = (tier: ProTier) => {
    navigate('/vip', { state: { selectedTier: tier } });
  };

  return (
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] sticky top-0 h-screen border-l border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="flex-1 p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-foreground">PRO გეგმები</h2>
        </div>

        {/* PRO Plan Cards - flex-1 to fill remaining space evenly */}
        <div className="flex-1 flex flex-col gap-3">
          {PRO_TIERS.map((tier, index) => {
            const isCurrentTier = currentTier === tier.id;
            const isUpgrade = !currentTier || PRO_TIERS.findIndex(t => t.id === currentTier) < index;
            
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={cn(
                  "relative rounded-2xl p-4 overflow-hidden bg-card/80 backdrop-blur-sm flex-1 flex flex-col"
                )}
                style={{
                  border: `1.5px solid ${tier.borderColor}`,
                  boxShadow: `0 4px 16px -4px ${tier.glowColor}`,
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
                      className="text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg"
                      style={{ background: tier.gradient }}
                    >
                      აქტიური
                    </div>
                  </div>
                )}

                {/* Shimmer Effect */}
                <motion.div 
                  className="absolute inset-0 pointer-events-none"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                    width: '50%',
                  }}
                />

                <div className="relative z-10 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: tier.gradient,
                        boxShadow: `0 4px 12px ${tier.glowColor}`,
                      }}
                    >
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground">{tier.nameKa}</h3>
                      <p className="text-lg font-bold text-foreground">
                        {getPriceDisplay(tier.price).symbol}{getPriceDisplay(tier.price).value}{getPriceDisplay(tier.price).suffix}<span className="text-xs text-muted-foreground font-normal">{getPriceDisplay(tier.price).monthLabel}</span>
                      </p>
                    </div>
                  </div>

                  {/* Benefits - flex-1 to take remaining space */}
                  <div className="flex-1 space-y-1">
                    {tier.benefits.slice(0, 3).map((benefit, i) => (
                      <div 
                        key={i} 
                        className="flex items-center gap-2"
                      >
                        <div 
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: tier.lightBg }}
                        >
                          <benefit.icon 
                            className="w-2.5 h-2.5"
                            style={{ color: tier.accentColor }}
                          />
                        </div>
                        <span className={cn(
                          "text-xs truncate",
                          benefit.highlight ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {benefit.text}
                        </span>
                      </div>
                    ))}
                    {tier.benefits.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-6">
                        +{tier.benefits.length - 3} სხვა
                      </p>
                    )}
                  </div>

                  {/* Action Button - at bottom */}
                  {!isCurrentTier && (
                    <motion.button
                      onClick={() => handleUpgrade(tier.id)}
                      className="w-full py-2 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 mt-2"
                      style={{ 
                        background: tier.buttonGradient,
                        boxShadow: `0 4px 12px ${tier.glowColor}`,
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isUpgrade ? 'განახლება' : 'არჩევა'}
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
