import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { getRankFromPoints } from "@/data/opponents";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAvatarModal } from "@/contexts/AvatarModalContext";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProPlansSection, ProTier } from "@/components/profile/ProPlansSection";
import { useVipStatus } from "@/hooks/useVipStatus";
import { PageHeader } from "@/components/shared/PageHeader";

// Stat icons
import triviaIcon from "@/assets/icons/trivia-buzzer-8.png";
import trophyIcon from "@/assets/icons/trophy-2.png";
import percentIcon from "@/assets/icons/percentage-discount.png";
import trophyShelfIcon from "@/assets/icons/trophy-shelf.png";
import crownIcon from "@/assets/icons/crown-5.png";


export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { subscription, isVip } = useVipStatus();
  const { openAvatarModal } = useAvatarModal();
  const [searchParams] = useSearchParams();
  // Many places deep-link to /profile?tab=PRO (paywalls) or ?tab=Stats —
  // honor the param instead of relying on the default happening to match.
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get("tab")?.toLowerCase() === "stats" ? "Stats" : "PRO"
  );
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get current tier from subscription - only if actively VIP
  const currentTier = isVip ? (subscription?.vip_tier as ProTier | undefined) : undefined;
  const friendInvitesRemaining = isVip ? ((subscription as any)?.friend_invites_remaining || 0) : 0;

  // Dynamic PRO label
  const getProLabel = () => {
    if (isVip && currentTier && ['pro', 'pro_plus', 'pro_master'].includes(currentTier)) {
      return t("extra.myPro");
    }
    return t("extra.becomePro");
  };

  const rank = profile ? getRankFromPoints(profile.total_points) : null;

  // Redirect guests directly to auth page
  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
    }
  }, [user, navigate]);

  // Show nothing while redirecting or if no profile yet
  if (!user || !profile) {
    return null;
  }

  return (
    <MainLayout showPlayButton={false}>
      <div className="min-h-screen relative flex flex-col">
          {/* Full-page Video Background */}
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="fixed inset-0 w-full h-full object-cover -z-10 bg-secondary"
          >
            <source src="/videos/floating-blob.webm" type="video/webm" />
            <source src="/videos/floating-blob.mp4" type="video/mp4" />
          </video>
          {/* Gradient Overlay */}
          <div className="fixed inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/20 -z-10" />

          {/* Page Header with Back Button - Sticky */}
          <PageHeader title={t("profile.title")} />

          {/* Scrollable Content */}
          <div className="flex-1 relative">
            {/* Header spacer */}
            <div className="pt-12 pb-20 px-6" />

            <div className="px-6 -mt-16 relative max-w-[700px] md:max-w-[600px] mx-auto w-full pb-8">
            {/* Avatar Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex flex-col items-center">
                {/* Entire avatar area is clickable */}
                <motion.button
                  onClick={() => openAvatarModal()}
                  className="relative cursor-pointer group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={() => {
                    if (profile.animated_avatar_url && videoRef.current) {
                      setShowVideo(true);
                      videoRef.current.currentTime = 0;
                      videoRef.current.play().catch(console.error);
                    }
                  }}
                  onMouseLeave={() => setShowVideo(false)}
                >
                  {/* Static Avatar */}
                  <div className="relative w-36 h-36 rounded-full ring-4 ring-primary overflow-hidden transition-all group-hover:ring-primary/80">
                    <img 
                      src={resolveAvatarUrl(profile.avatar_url) || "/placeholder.svg"}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      style={{ opacity: showVideo && profile.animated_avatar_url ? 0 : 1, transition: "opacity 0.3s" }}
                    />
                    {/* Animated video overlay */}
                    {profile.animated_avatar_url && (
                      <video
                        ref={videoRef}
                        src={profile.animated_avatar_url}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: showVideo ? 1 : 0, transition: "opacity 0.3s" }}
                        muted
                        playsInline
                        loop
                        preload="auto"
                      />
                    )}
                    
                    {/* Hover overlay with edit hint */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Edit badge - always visible */}
                  <div className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-full shadow-lg">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                </motion.button>
                <h2 className="text-xl font-bold text-foreground mt-4">
                  {profile.nickname}
                </h2>
                <p className={cn("text-sm font-medium", rank?.color || "text-muted-foreground")}>
                  {rank?.name || t("profile.beginner")}
                </p>
              </div>

            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {/* Statistics Tab */}
              <button
                onClick={() => setActiveTab("Stats")}
                className={cn(
                  "flex-1 py-3 rounded-full font-semibold text-sm transition-colors",
                  activeTab === "Stats"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {t("profile.statistics")}
              </button>
              
              {/* PRO Title with Crown - clickable */}
              <button
                onClick={() => setActiveTab("PRO")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-colors",
                  activeTab === "PRO"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent"
                )}
              >
                <img src={crownIcon} alt="" className="w-6 h-6" />
                <span className={cn(
                  "font-semibold text-sm",
                  activeTab === "PRO" ? "text-primary-foreground" : "text-foreground"
                )}>
                  {getProLabel()}
                </span>
              </button>
            </div>


            {/* Tab Content */}
            {activeTab === "Stats" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30">
                  <img src={triviaIcon} alt="" className="w-8 h-8" />
                  <span className="text-foreground flex-1">{t("profile.gamesPlayed")}</span>
                  <span className="font-bold text-foreground">{profile.games_played}</span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30">
                  <img src={trophyIcon} alt="" className="w-8 h-8" />
                  <span className="text-foreground flex-1">{t("profile.gamesWon")}</span>
                  <span className="font-bold text-foreground">{profile.games_won}</span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30">
                  <img src={percentIcon} alt="" className="w-8 h-8" />
                  <span className="text-foreground flex-1">{t("profile.winRate")}</span>
                  <span className="font-bold text-foreground">
                    {profile.games_played > 0
                      ? Math.round((profile.games_won / profile.games_played) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30">
                  <img src={trophyShelfIcon} alt="" className="w-8 h-8" />
                  <span className="text-foreground flex-1">{t("profile.bestStreak")}</span>
                  <span className="font-bold text-foreground">{profile.best_streak}</span>
                </div>
              </motion.div>
            )}

            {activeTab === "PRO" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <ProPlansSection 
                  currentTier={currentTier}
                  friendInvitesRemaining={friendInvitesRemaining}
                  subscriptionStartDate={(subscription as any)?.started_at}
                  subscriptionExpiryDate={(subscription as any)?.expires_at}
                />
              </motion.div>
            )}
            </div>
          </div>

      </div>
    </MainLayout>
  );
}