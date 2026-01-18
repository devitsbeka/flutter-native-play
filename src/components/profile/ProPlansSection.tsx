import { motion } from "framer-motion";
import { Crown, Check, Users, Sparkles, Zap, Shield, Gift, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ProInviteFriendsModal } from "./ProInviteFriendsModal";

export type ProTier = 'pro' | 'pro_plus' | 'pro_elite';

interface TierConfig {
  id: ProTier;
  name: string;
  nameKa: string;
  price: number;
  friendInvites: number;
  xpMultiplier: number;
  gradient: string;
  borderColor: string;
  iconColor: string;
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
    gradient: 'from-purple-500 to-indigo-600',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    benefits: [
      { icon: Zap, text: '2x XP ბონუსი' },
      { icon: Shield, text: 'რეკლამების გარეშე' },
      { icon: Star, text: 'VIP ბეჯი' },
      { icon: Users, text: '1 მეგობრის მოწვევა', highlight: true },
    ]
  },
  {
    id: 'pro_plus',
    name: 'PRO+',
    nameKa: 'PRO+',
    price: 19.99,
    friendInvites: 5,
    xpMultiplier: 2,
    gradient: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    popular: true,
    benefits: [
      { icon: Zap, text: '2x XP ბონუსი' },
      { icon: Shield, text: 'რეკლამების გარეშე' },
      { icon: Star, text: 'VIP ბეჯი + ფრეიმები' },
      { icon: Gift, text: 'ყოველდღიური ჯილდოები' },
      { icon: Sparkles, text: 'ექსკლუზიური ავატარები' },
      { icon: Users, text: '5 მეგობრის მოწვევა', highlight: true },
    ]
  },
  {
    id: 'pro_elite',
    name: 'PRO Elite',
    nameKa: 'PRO ელიტა',
    price: 29.99,
    friendInvites: 10,
    xpMultiplier: 3,
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    borderColor: 'border-yellow-500/50',
    iconColor: 'text-yellow-400',
    benefits: [
      { icon: Zap, text: '3x XP ბონუსი', highlight: true },
      { icon: Shield, text: 'რეკლამების გარეშე' },
      { icon: Star, text: 'ყველა ბეჯი და ფრეიმი' },
      { icon: Gift, text: 'პრემიუმ ყოველდღიური ჯილდოები' },
      { icon: Sparkles, text: 'ყველა ავატარი' },
      { icon: Trophy, text: 'ექსკლუზიური ლიდერბორდი' },
      { icon: Users, text: '10 მეგობრის მოწვევა', highlight: true },
    ]
  }
];

interface ProPlansSectionProps {
  currentTier?: ProTier | null;
  friendInvitesRemaining?: number;
}

export function ProPlansSection({ currentTier, friendInvitesRemaining = 0 }: ProPlansSectionProps) {
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
          className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-4 border border-amber-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowInviteModal(true)}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                მოწვევა
              </Button>
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
                "relative rounded-2xl p-5 border bg-card overflow-hidden",
                tier.borderColor,
                tier.popular && "ring-2 ring-amber-500/50"
              )}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
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
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                      tier.gradient
                    )}>
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
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
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
                        benefit.highlight && "text-primary font-medium"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center",
                        benefit.highlight 
                          ? "bg-primary/20" 
                          : "bg-muted"
                      )}>
                        <benefit.icon className={cn(
                          "w-3 h-3",
                          benefit.highlight ? "text-primary" : tier.iconColor
                        )} />
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
                {!isCurrentTier && (
                  <Button
                    onClick={() => handleUpgrade(tier.id)}
                    className={cn(
                      "w-full gap-2",
                      tier.popular 
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" 
                        : ""
                    )}
                    variant={tier.popular ? "default" : "secondary"}
                  >
                    <Sparkles className="w-4 h-4" />
                    {isUpgrade ? 'განახლება' : 'არჩევა'}
                  </Button>
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
