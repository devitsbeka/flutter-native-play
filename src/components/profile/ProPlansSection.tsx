import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Crown, Users, Sparkles, Zap, Shield, Gift, Star, Loader2, ArrowUp, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ProInviteFriendsModal } from "./ProInviteFriendsModal";
import { useFriendInvites } from "@/hooks/useFriendInvites";
import { toast } from "sonner";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import { PurchaseSuccessModal } from "@/components/shop/PurchaseSuccessModal";
import { format } from "date-fns";
import { FriendInvitesTracker } from "./FriendInvitesTracker";
import { useSearchParams } from "react-router-dom";
import { getPriceDisplay } from "@/utils/currency";
export type ProTier = 'pro' | 'pro_plus' | 'pro_master' | 'standard';

interface TierConfig {
  id: ProTier;
  name: string;
  nameKa: string;
  price: number;
  friendInvites: number;
  xpMultiplier: number;
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
    count?: number;
  }[];
}

export const PRO_TIERS: TierConfig[] = [
  {
    id: 'pro',
    name: 'PRO',
    nameKa: 'PRO',
    price: 3.99,
    friendInvites: 1,
    xpMultiplier: 2,
    gradient: 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)',
    borderColor: 'rgba(147, 51, 234, 0.4)',
    glowColor: 'rgba(147, 51, 234, 0.25)',
    accentColor: '#9333EA',
    lightBg: 'rgba(147, 51, 234, 0.1)',
    buttonGradient: 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)',
    benefits: [
      { icon: Zap, text: 'extra.xpBonus' },
      { icon: Shield, text: 'extra.noAds' },
      { icon: Star, text: 'extra.vipBadge' },
      { icon: Users, text: 'extra.friendInvite', highlight: true, count: 1 },
    ]
  },
  {
    id: 'pro_plus',
    name: 'Friends PRO',
    nameKa: 'სამეგობრო PRO',
    price: 7.99,
    friendInvites: 5,
    xpMultiplier: 2,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    accentColor: '#F59E0B',
    lightBg: 'rgba(245, 158, 11, 0.1)',
    buttonGradient: 'linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)',
    popular: true,
    benefits: [
      { icon: Zap, text: 'extra.xpBonus' },
      { icon: Shield, text: 'extra.noAds' },
      { icon: Star, text: 'extra.vipBadge' },
      { icon: Gift, text: 'extra.dailyRewards' },
      { icon: Users, text: 'extra.friendInvite', highlight: true, count: 5 },
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
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedTierName, setPurchasedTierName] = useState("");
  const [sharing, setSharing] = useState(false);
  const { initiateProCheckout, isProcessing: purchasing } = useProPurchase();
  const { createLinkInvite } = useFriendInvites();

  // Handle success callback from Stripe
  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    if (subscriptionStatus === "success") {
      setPurchasedTierName("PRO");
      setShowSuccessModal(true);
      // Clean up URL params
      searchParams.delete("subscription");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleUpgrade = async (tier: ProTier) => {
    const tierConfig = PRO_TIERS.find(t => t.id === tier);
    if (!tierConfig) return;
    
    // Map tier to ProTierId (handle 'standard' as 'pro')
    const proTierId: ProTierId = tier === "standard" ? "pro" : (tier === "pro_master" ? "pro_plus" : tier as ProTierId);
    const result = await initiateProCheckout(proTierId);
    
    if (result.success) {
      setPurchasedTierName(tierConfig.nameKa);
      // Don't show modal here for web - it will show after redirect
    }
  };

  const proTier = PRO_TIERS.find(t => t.id === 'pro')!;
  const familyTier = PRO_TIERS.find(t => t.id === 'pro_plus')!;
  const currentTierConfig = PRO_TIERS.find(t => t.id === currentTier);

  // Determine which scenario to show
  // 'standard' tier from DB = basic PRO (solo)
  // 'pro' tier = solo PRO
  // 'pro_plus' or 'pro_master' = family PRO
  const isNotPro = !currentTier;
  const isSoloPro = currentTier === 'pro' || currentTier === 'standard';
  const isFamilyPro = currentTier === 'pro_plus' || currentTier === 'pro_master';

  return (
    <div className="space-y-4">
      {/* SCENARIO 1: Not PRO - Show both tier cards */}
      {isNotPro && (
        <>
          {/* Invite Friends Card */}
          <InviteCard sharing={sharing} onShare={async () => {
            if (sharing) return;
            setSharing(true);
            try {
              const referralCode = await createLinkInvite("friend_pro");
              if (referralCode) {
                const link = `${window.location.origin}/auth?ref=${referralCode}`;
                const shareText = t("extra.getProFree");
                if (navigator.share) {
                  try { await navigator.share({ title: "My Trivia", text: shareText, url: link }); } catch { /* cancelled */ }
                } else {
                  await navigator.clipboard.writeText(link);
                  toast.success(t("extra.linkCopiedInvite"));
                }
              }
            } finally { setSharing(false); }
          }} />
          {PRO_TIERS.map((tier, index) => (
            <TierCard
              key={tier.id}
              tier={tier}
              index={index}
              onPurchase={() => handleUpgrade(tier.id)}
              purchasing={purchasing}
            />
          ))}
      )}

      {/* SCENARIO 2: PRO Solo - Show current status + upgrade to Family */}
      {isSoloPro && (
        <>
          {/* Current tier mini status */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 bg-card border-2"
            style={{
              borderColor: proTier.borderColor,
              boxShadow: `0 4px 20px ${proTier.glowColor}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: proTier.gradient }}
              >
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-foreground">PRO</p>
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: proTier.lightBg, color: proTier.accentColor }}
                  >
                    {t("extra.proActive")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {subscriptionExpiryDate 
                    ? t("extra.proExpiry", { date: format(new Date(subscriptionExpiryDate), 'dd.MM.yyyy') })
                    : t("extra.proUnlimited")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Upgrade to Family card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl p-5 overflow-hidden bg-card"
            style={{
              border: `2px solid ${familyTier.borderColor}`,
              boxShadow: `0 4px 24px -4px ${familyTier.glowColor}`,
            }}
          >
            {/* Upgrade badge */}
            <div className="absolute top-0 right-0">
              <div 
                className="text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1"
                style={{ background: familyTier.gradient }}
              >
                <ArrowUp className="w-3 h-3" />
                {t("extra.upgradeBtn")}
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: familyTier.gradient,
                    boxShadow: `0 4px 12px ${familyTier.glowColor}`,
                  }}
                >
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{t("extra.friendProName")}</h3>
                  <p className="text-2xl font-bold text-foreground">
                    {getPriceDisplay(familyTier.price).symbol}{getPriceDisplay(familyTier.price).value}{getPriceDisplay(familyTier.price).suffix}<span className="text-sm text-muted-foreground font-normal">{getPriceDisplay(familyTier.price).monthLabel}</span>
                  </p>
                </div>
              </div>

              {/* Key benefits for upgrade */}
              <div className="space-y-2 mb-4">
                {familyTier.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: familyTier.lightBg }}
                    >
                      <benefit.icon className="w-3 h-3" style={{ color: familyTier.accentColor }} />
                    </div>
                    <span className={cn(
                      "text-sm",
                      benefit.highlight ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {t(benefit.text, benefit.count ? { count: benefit.count } : undefined)}
                      {benefit.icon === Users && ` (4 ${t("extra.moreExcl") || "more!"})`}
                    </span>
                  </div>
                ))}
              </div>

              <motion.button
                onClick={() => handleUpgrade('pro_plus')}
                disabled={purchasing}
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ 
                  background: familyTier.buttonGradient,
                  boxShadow: `0 4px 16px ${familyTier.glowColor}`,
                }}
                whileHover={{ scale: purchasing ? 1 : 1.02 }}
                whileTap={{ scale: purchasing ? 1 : 0.98 }}
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("extra.processingBtn")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t("extra.upgradeBtn")}
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}

      {/* SCENARIO 3: PRO Family - Show invite management */}
      {isFamilyPro && (
        <>
          {/* Family status card with invite panel */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 bg-card border-2"
            style={{
              borderColor: familyTier.borderColor,
              boxShadow: `0 4px 20px ${familyTier.glowColor}`,
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: familyTier.gradient }}
                  >
                    <Crown className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold text-foreground">{t("extra.friendProName")}</p>
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: familyTier.lightBg, color: familyTier.accentColor }}
                      >
                        {t("extra.proActive")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {subscriptionExpiryDate 
                        ? t("extra.proExpiry", { date: format(new Date(subscriptionExpiryDate), 'dd.MM.yyyy') })
                        : t("extra.proUnlimited")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invites Section */}
              <div 
                className="rounded-xl p-4"
                style={{ background: familyTier.lightBg }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" style={{ color: familyTier.accentColor }} />
                    <span className="font-medium text-foreground">{t("extra.proInviteFriendsLabel")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {t("extra.proInvitesLeft", { count: friendInvitesRemaining })}
                    </span>
                    {friendInvitesRemaining > 0 && (
                      <motion.button
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 rounded-full text-white text-sm font-medium"
                        style={{ background: familyTier.gradient }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {t("extra.proInviteAction")}
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Friend invites tracker */}
          <FriendInvitesTracker />
        </>
      )}

      {/* Invite Modal */}
      <ProInviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        invitesRemaining={friendInvitesRemaining}
        currentTier={currentTier}
      />

      {/* Purchase Success Modal */}
      <PurchaseSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        itemName={purchasedTierName}
        icon={<Crown className="w-8 h-8 text-amber-500" />}
      />
    </div>
  );
}


// Extracted TierCard component for cleaner code
function TierCard({ 
  tier, 
  index, 
  onPurchase, 
  purchasing 
}: { 
  tier: TierConfig; 
  index: number; 
  onPurchase: () => void; 
  purchasing: boolean;
}) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative rounded-2xl p-5 overflow-hidden bg-card"
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
            {t("extra.popularLabel")}
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
        <div className="flex items-center gap-3 mb-4">
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
            <h3 className="text-lg font-bold text-foreground">{tier.id === 'pro' ? t("extra.proName") : t("extra.friendProName")}</h3>
            <p className="text-2xl font-bold text-foreground">
              {getPriceDisplay(tier.price).symbol}{getPriceDisplay(tier.price).value}{getPriceDisplay(tier.price).suffix}<span className="text-sm text-muted-foreground font-normal">{getPriceDisplay(tier.price).monthLabel}</span>
            </p>
          </div>
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
                {benefit.count ? t(benefit.text, { count: benefit.count }) : t(benefit.text)}
              </span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <motion.button
          onClick={onPurchase}
          disabled={purchasing}
          className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70"
          style={{ 
            background: tier.buttonGradient,
            boxShadow: `0 4px 16px ${tier.glowColor}`,
          }}
          whileHover={{ scale: purchasing ? 1 : 1.02 }}
          whileTap={{ scale: purchasing ? 1 : 0.98 }}
        >
          {purchasing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("extra.processingBtn")}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {t("extra.buyBtn")}
            </>
          )}
        </motion.button>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 200%; }
          100% { background-position: -200% -200%; }
        }
      `}</style>
    </motion.div>
  );
}

// Invite Card matching TierCard style
function InviteCard({ sharing, onShare }: { sharing: boolean; onShare: () => void }) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl p-4 overflow-hidden bg-card"
      style={{
        border: "2px solid rgba(236, 72, 153, 0.4)",
        boxShadow: "0 4px 24px -4px rgba(147, 51, 234, 0.25)",
      }}
    >
      {/* Shimmer Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
            animation: "shimmer 3s infinite",
            backgroundSize: "200% 200%",
          }}
        />
      </div>

      <div className="relative z-10 flex items-start gap-3">
        {/* Left: Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #EC4899 0%, #9333EA 100%)",
            boxShadow: "0 4px 12px rgba(147, 51, 234, 0.25)",
          }}
        >
          <Users className="w-6 h-6 text-white" />
        </div>

        {/* Right: Text + Badge + Button */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-tight">{t("extra.inviteMiniTitle")}</h3>

          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white self-start"
            style={{ background: "linear-gradient(135deg, #EC4899, #9333EA)" }}
          >
            🎁 10 {t("extra.inviteMiniReward")}
          </span>

          <motion.button
            onClick={onShare}
            disabled={sharing}
            className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            style={{
              background: "linear-gradient(135deg, #EC4899 0%, #9333EA 100%)",
              boxShadow: "0 4px 16px rgba(147, 51, 234, 0.25)",
            }}
            whileHover={{ scale: sharing ? 1 : 1.02 }}
            whileTap={{ scale: sharing ? 1 : 0.98 }}
          >
            {sharing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{t("extra.processingBtn")}</>
            ) : (
              <><Share2 className="w-4 h-4" />{t("extra.shareBtn")}</>
            )}
          </motion.button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 200%; }
          100% { background-position: -200% -200%; }
        }
      `}</style>
    </motion.div>
  );
}
