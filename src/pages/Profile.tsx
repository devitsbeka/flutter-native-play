import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Settings, HelpCircle, Shield, FileText, LogOut, ChevronRight } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { getRankFromPoints } from "@/data/opponents";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAvatarModal } from "@/contexts/AvatarModalContext";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProPlansSection, ProTier } from "@/components/profile/ProPlansSection";
import { AvatarReel } from "@/components/profile/AvatarReel";
import { useVipStatus } from "@/hooks/useVipStatus";
import { PageHeader } from "@/components/shared/PageHeader";
import { HeaderActions } from "@/components/shared/HeaderActions";

// Stat icons
import triviaIcon from "@/assets/icons/trivia-buzzer-8.png";
import trophyIcon from "@/assets/icons/trophy-2.png";
import percentIcon from "@/assets/icons/percentage-discount.png";
import trophyShelfIcon from "@/assets/icons/trophy-shelf.png";


export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { subscription, isVip } = useVipStatus();
  const { openAvatarModal } = useAvatarModal();
  const [searchParams] = useSearchParams();
  // Many places deep-link to /profile?tab=PRO (paywalls) or ?tab=Stats —
  // honor the param instead of relying on the default happening to match.
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab")?.toLowerCase();
    if (tab === "stats") return "Stats";
    if (tab === "settings") return "Settings";
    return "PRO";
  });
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
          <PageHeader title={t("profile.title")} rightElements={<HeaderActions />} />

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
                {/* Avatar carousel: presets flank the selected avatar, which
                    always sits in the middle with the bold ring */}
                <AvatarReel
                  center={
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
                      <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white ring-4 ring-primary overflow-hidden transition-all group-hover:ring-primary/80 bg-white">
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
                  }
                />
                <h2 className="text-xl font-bold text-foreground mt-4">
                  {profile.nickname}
                </h2>
                <p className={cn("text-sm font-medium", rank?.color || "text-muted-foreground")}>
                  {rank?.name || t("profile.beginner")}
                </p>
              </div>

            </motion.div>

            {/* Tabs - segmented switcher */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center p-1 rounded-full bg-white/70 backdrop-blur-sm border border-border/40 shadow-sm">
                {[
                  { id: "PRO", label: getProLabel() },
                  { id: "Stats", label: t("profile.statistics") },
                  { id: "Settings", label: t("menu.settings") },
                ].map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "px-5 py-2 rounded-full text-sm font-bold transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-foreground/60 hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
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

            {activeTab === "Settings" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {[
                  { icon: Settings, label: t("menu.accountSettings"), path: "/settings" },
                  { icon: HelpCircle, label: t("menu.help"), path: "/support" },
                  { icon: Shield, label: t("menu.privacy"), path: "/privacy-policy" },
                  { icon: FileText, label: t("extra.termsOfService"), path: "/terms" },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <span className="text-foreground flex-1 font-medium">{item.label}</span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}

                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="w-full bg-destructive/5 rounded-2xl p-4 flex items-center gap-3 border border-destructive/20 hover:bg-destructive/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <LogOut className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                  </div>
                  <span className="text-destructive flex-1 font-medium">{t("menu.signOut")}</span>
                </button>
              </motion.div>
            )}
            </div>
          </div>

      </div>
    </MainLayout>
  );
}