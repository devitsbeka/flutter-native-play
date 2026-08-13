import { motion } from "framer-motion";
import groupIcon from "@/assets/group-of-people.png";
import crownIcon from "@/assets/crown-icon.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { Crown, Users, Sparkles, Zap, Shield, Gift, Star, Loader2, ArrowUp, Share2, Check, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { ProInviteFriendsModal } from "./ProInviteFriendsModal";
import { useProPurchase, type ProTierId } from "@/hooks/useProPurchase";
import { PurchaseSuccessModal } from "@/components/shop/PurchaseSuccessModal";
import { format } from "date-fns";
import { FriendInvitesTracker } from "./FriendInvitesTracker";
import { useSearchParams } from "react-router-dom";
import { getPriceDisplay } from "@/utils/currency";
import { ProBannerReel } from "@/components/shop/MobileProCarousel";
import { useNavigate } from "react-router-dom";

// The reel marks bought deals; nothing here is bought from this screen.
const EMPTY_PURCHASES: Set<string> = new Set();
export type ProTier = 'pro' | 'pro_plus' | 'pro_master' | 'standard';

interface TierConfig {
  id: ProTier;
  name: string;
  nameKa: string;
  price: number;
  friendInvites: number;
  xpMultiplier: number;
  icon: React.ElementType;
  gradient: string;
  depthColor: string;
  glowColor: string;
  popular?: boolean;
  benefits: {
    icon: React.ElementType;
    text: string;
    highlight?: boolean;
    count?: number;
  }[];
}

// Colors mirror the shop PRO banners (MobileProCarousel / ShopRightSidebar):
// solo PRO is the pink card, friends PRO the purple one.
export const PRO_TIERS: TierConfig[] = [
  {
    id: 'pro',
    name: 'PRO',
    nameKa: 'PRO',
    price: 3.99,
    friendInvites: 1,
    xpMultiplier: 2,
    icon: Crown,
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)',
    depthColor: '#9D174D',
    glowColor: 'rgba(219, 39, 119, 0.25)',
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
    icon: Users,
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #5B21B6 100%)',
    depthColor: '#4C1D95',
    glowColor: 'rgba(109, 40, 217, 0.25)',
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedTierName, setPurchasedTierName] = useState("");
  const { initiateProCheckout, isProcessing: purchasing } = useProPurchase();

  // Handle success callback from Stripe
  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    if (subscriptionStatus === "success") {
      setPurchasedTierName("PRO");
      setShowSuccessModal(true);
    }
    if (subscriptionStatus) {
      // Clean up URL params (both success and cancelled returns from Stripe)
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

  // Determine which scenario to show
  // 'standard' tier from DB = basic PRO (solo)
  // 'pro' tier = solo PRO
  // 'pro_plus' or 'pro_master' = family PRO
  const isSoloPro = currentTier === 'pro' || currentTier === 'standard';
  const isFamilyPro = currentTier === 'pro_plus' || currentTier === 'pro_master';

  const expiryText = subscriptionExpiryDate
    ? t("extra.proExpiry", { date: format(new Date(subscriptionExpiryDate), 'dd.MM.yyyy') })
    : t("extra.proUnlimited");


  // Same list, but the friend-invites line calls out how many more than solo
  const upgradeBenefits = familyTier.benefits.map(b => {
    const base = b.count ? t(b.text, { count: b.count }) : t(b.text);
    return b.icon === Users ? `${base} (4 ${t("extra.moreExcl") || "more!"})` : base;
  });

  return (
    <div className="space-y-4">
      {/* The shop's banner reel, rather than a second set of PRO cards built
          here. Both surfaces sell the same two tiers and the same invite
          offer, and keeping two designs of them meant every copy or price
          change had to be made twice — and was not. Buying goes through the
          same useProPurchase hook either way.

          Shown whatever the player's tier: it used to appear only for
          someone with no subscription, so a PRO member opening this tab saw
          none of it. The reel already marks the tier they are on as active
          and the one above it as buyable, which is the more useful thing to
          land on than a page that pretends the offer no longer exists. The
          status and upgrade cards below it stay as they were. */}
      <ProBannerReel
        purchasedItems={EMPTY_PURCHASES}
        isPurchasing={null}
        onItemClick={() => navigate("/power-ups")}
      />

      {/* SCENARIO 2: PRO Solo - Show current status + upgrade to Family */}
      {isSoloPro && (
        <>
          {/* Current tier status banner */}
          <ProBannerCard
            tier={proTier}
            badge="active"
            subtitle={expiryText}
            minHeightClass="min-h-[120px]"
          />

          {/* Upgrade to Family banner */}
          <ProBannerCard
            tier={familyTier}
            index={1}
            badge="upgrade"
            price={familyTier.price}
            benefits={upgradeBenefits}
            button={{
              label: t("extra.upgradeBtn"),
              onClick: () => handleUpgrade('pro_plus'),
              loading: purchasing,
            }}
          />
        </>
      )}

      {/* SCENARIO 3: PRO Family - Show invite management */}
      {isFamilyPro && (
        <>
          <ProBannerCard
            tier={familyTier}
            badge="active"
            subtitle={expiryText}
            minHeightClass="min-h-[180px]"
          >
            {/* Invites Section */}
            <div className="rounded-xl p-3 mt-3" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-white" />
                <span className="font-medium text-white text-sm">{t("extra.proInviteFriendsLabel")}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-white/80">
                  {t("extra.proInvitesLeft", { count: friendInvitesRemaining })}
                </span>
                {friendInvitesRemaining > 0 && (
                  <motion.button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-1.5 rounded-full text-sm font-bold"
                    style={{
                      background: "rgba(255,255,255,0.95)",
                      color: familyTier.depthColor,
                      boxShadow: "0 2px 0 rgba(0,0,0,0.15)",
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t("extra.proInviteAction")}
                  </motion.button>
                )}
              </div>
            </div>
          </ProBannerCard>

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


// Banner card matching the shop PRO banners: full-width gradient panel with
// the tier info, benefits and CTA.
function ProBannerCard({
  tier,
  index = 0,
  badge,
  subtitle,
  price,
  benefits,
  button,
  children,
  minHeightClass = "",
}: {
  tier: TierConfig;
  index?: number;
  badge?: "top" | "upgrade" | "active";
  subtitle?: string;
  price?: number;
  benefits?: string[];
  button?: { label: string; onClick?: () => void; loading?: boolean; active?: boolean };
  children?: React.ReactNode;
  minHeightClass?: string;
}) {
  const { t } = useLanguage();
  const TierIcon = tier.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative rounded-2xl overflow-hidden flex ${minHeightClass}`}
      style={{
        background: tier.gradient,
        boxShadow: `0 6px 0 ${tier.depthColor}, 0 10px 20px ${tier.glowColor}`,
      }}
    >
      {badge === "top" && (
        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
          <Sparkles className="w-3 h-3" /> TOP
        </div>
      )}
      {badge === "upgrade" && (
        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
          <ArrowUp className="w-3 h-3" /> {t("extra.upgradeBtn")}
        </div>
      )}
      {badge === "active" && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
          <Check className="w-3 h-3" /> {t("extra.activeStatus")}
        </div>
      )}

      <div className="w-full p-5 z-10 flex flex-col">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.2)", boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 rgba(0,0,0,0.15)" }}
          >
            <TierIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-white">
            {tier.id === 'pro' ? t("extra.proName") : t("extra.friendProName")}
          </h3>
        </div>

        {/* Indented to line up with the title text (icon width + gap) */}
        <div className="pl-[52px] mb-auto">
          {price !== undefined && (
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-xl font-black text-white">
                {getPriceDisplay(price).symbol}{getPriceDisplay(price).value}{getPriceDisplay(price).suffix}
              </span>
              <span className="text-xs text-white/70">{getPriceDisplay(price).monthLabel}</span>
            </div>
          )}

          {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}

          {benefits && benefits.length > 0 && (
            <ul className="flex flex-col gap-1.5 mt-3">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-white/90">
                  <Check className="w-3.5 h-3.5 text-white/80 flex-shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm leading-tight">{benefit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {children}

        {button && (
          <button
            type="button"
            onClick={button.onClick}
            disabled={button.active || button.loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-4"
            style={{
              background: button.active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.95)",
              color: button.active ? "rgba(255,255,255,0.6)" : tier.depthColor,
              boxShadow: button.active ? "none" : "0 3px 0 rgba(0,0,0,0.15)",
            }}
          >
            {button.active ? (
              <><Check className="w-4 h-4" />{button.label}</>
            ) : button.loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{t("extra.processingBtn")}</>
            ) : (
              <>{button.label}<ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
