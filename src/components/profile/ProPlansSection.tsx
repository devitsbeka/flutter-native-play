import { motion } from "framer-motion";
import { Crown, Users, Sparkles, Zap, Shield, Gift, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ProInviteFriendsModal } from "./ProInviteFriendsModal";
import { format } from "date-fns";

export type ProTier = 'pro' | 'pro_plus' | 'pro_master';

interface TierConfig {
  id: ProTier;
  name: string;
  nameKa: string;
  price: number;
  friendInvites: number;
  xpMultiplier: number;
  // Cohesive color scheme per tier
  gradient: string;
  borderColor: string;
  glowColor: string;
  accentColor: string;
  lightBg: string;
  buttonGradient: string;
  popular?: boolean;
  benefits: {
    icon: React.ElementType;
    text: string;
    highlight?: boolean;
  }[];
}

export const PRO_TIERS: TierConfig[] = [
  {
    id: 'pro',
    name: 'PRO',
    nameKa: 'PRO',
    price: 9.99,
    friendInvites: 1,
    xpMultiplier: 2,
    // Purple theme
    gradient: 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)',
    borderColor: 'rgba(147, 51, 234, 0.4)',
    glowColor: 'rgba(147, 51, 234, 0.25)',
    accentColor: '#9333EA',
    lightBg: 'rgba(147, 51, 234, 0.1)',
    buttonGradient: 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)',
    benefits: [
      { icon: Zap, text: '2x XP ბონუსი' },
      { icon: Shield, text: 'რეკლამების გარეშე' },
      { icon: Star, text: 'VIP ბეჯი' },
      { icon: Users, text: '1 მეგობრის მოწვევა', highlight: true },
    ]
  }
];

interface ProPlansSectionProps {
  currentTier?: ProTier | null;
  friendInvitesRemaining?: number;
  subscriptionStartDate?: string;
  subscriptionExpiryDate?: string;
}

export function ProPlansSection({ 
  currentTier, 
  friendInvitesRemaining = 0,
  subscriptionStartDate,
  subscriptionExpiryDate
}: ProPlansSectionProps) {
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleUpgrade = (tier: ProTier) => {
    navigate('/vip', { state: { selectedTier: tier } });
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      {currentTier && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{
            background: PRO_TIERS.find(t => t.id === currentTier)?.lightBg,
            border: `2px solid ${PRO_TIERS.find(t => t.id === currentTier)?.borderColor}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: PRO_TIERS.find(t => t.id === currentTier)?.gradient }}
              >
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-foreground font-semibold">
                  {PRO_TIERS.find(t => t.id === currentTier)?.nameKa || 'PRO'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {friendInvitesRemaining} მოწვევა დარჩენილი
                </p>
              </div>
            </div>
            {friendInvitesRemaining > 0 && (
              <motion.button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2"
                style={{ background: PRO_TIERS.find(t => t.id === currentTier)?.gradient }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Users className="w-4 h-4" />
                მოწვევა
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* Tier Cards */}
      <div className="space-y-4">
        {PRO_TIERS.map((tier, index) => {
          const isCurrentTier = currentTier === tier.id;
          const isUpgrade = !currentTier || PRO_TIERS.findIndex(t => t.id === currentTier) < index;
          
          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative rounded-2xl p-5 overflow-hidden bg-card"
              )}
              style={{
                border: `2px solid ${tier.borderColor}`,
                boxShadow: `0 4px 24px -4px ${tier.glowColor}`,
              }}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute top-0 right-0">
                  <div 
                    className="text-white text-xs font-bold px-3 py-1 rounded-bl-xl"
                    style={{ background: tier.gradient }}
                  >
                    პოპულარული
                  </div>
                </div>
              )}

              {/* Shimmer Effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    background: `linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)`,
                    animation: 'shimmer 3s infinite',
                    backgroundSize: '200% 200%',
                  }}
                />
              </div>

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ 
                        background: tier.gradient,
                        boxShadow: `0 4px 12px ${tier.glowColor}`,
                      }}
                    >
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{tier.nameKa}</h3>
                      <p className="text-2xl font-bold text-foreground">
                        ₾{tier.price}<span className="text-sm text-muted-foreground font-normal">/თვე</span>
                      </p>
                    </div>
                  </div>
                  
                  {isCurrentTier && (
                    <span 
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ 
                        background: tier.lightBg,
                        color: tier.accentColor,
                      }}
                    >
                      აქტიური
                    </span>
                  )}
                </div>

                {/* Benefits */}
                <div className="space-y-2 mb-4">
                  {tier.benefits.map((benefit, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center gap-2",
                        benefit.highlight && "font-medium"
                      )}
                    >
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: tier.lightBg }}
                      >
                        <benefit.icon 
                          className="w-3 h-3"
                          style={{ color: tier.accentColor }}
                        />
                      </div>
                      <span className={cn(
                        "text-sm",
                        benefit.highlight ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {benefit.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                {isCurrentTier ? (
                  <div className="text-center space-y-2">
                    {/* Show subscription dates */}
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>დაწყება: {subscriptionStartDate ? format(new Date(subscriptionStartDate), 'dd.MM.yyyy') : '-'}</p>
                      <p>ვადა: {subscriptionExpiryDate ? format(new Date(subscriptionExpiryDate), 'dd.MM.yyyy') : '-'}</p>
                    </div>
                    <motion.button
                      className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 opacity-70 cursor-default"
                      style={{ background: tier.buttonGradient }}
                    >
                      აქტიური
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    onClick={() => handleUpgrade(tier.id)}
                    className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                    style={{ 
                      background: tier.buttonGradient,
                      boxShadow: `0 4px 16px ${tier.glowColor}`,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Sparkles className="w-4 h-4" />
                    ყიდვა
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Invite Modal */}
      <ProInviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        invitesRemaining={friendInvitesRemaining}
        currentTier={currentTier}
      />

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 200%; }
          100% { background-position: -200% -200%; }
        }
      `}</style>
    </div>
  );
}