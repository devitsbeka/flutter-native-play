import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { getRankFromPoints } from "@/data/opponents";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AvatarModal } from "@/components/home/AvatarModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProPlansSection, ProTier } from "@/components/profile/ProPlansSection";
import { useVipStatus } from "@/hooks/useVipStatus";
import { PageHeader } from "@/components/shared/PageHeader";


export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { subscription, isVip } = useVipStatus();
  const [activeTab, setActiveTab] = useState("PRO");
  const [showAvatarGenerator, setShowAvatarGenerator] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get current tier from subscription
  const currentTier = subscription?.vip_tier as ProTier | undefined;
  const friendInvitesRemaining = (subscription as any)?.friend_invites_remaining || 0;

  // Dynamic PRO tab label
  const getProTabLabel = () => {
    if (currentTier && ['pro', 'pro_plus', 'pro_master'].includes(currentTier)) {
      return "ჩემი PRO";
    }
    return "გახდი PRO";
  };

  const tabs = [
    { key: "Stats", label: t("profile.stats") },
    { key: "PRO", label: getProTabLabel() },
  ];

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
      <div className="min-h-screen bg-background">
          {/* Page Header with Back Button */}
          <PageHeader title={t("profile.title")} />

          {/* Header with Video Background */}
          <div className="relative pt-12 pb-20 px-6 overflow-hidden">
            {/* Video Background */}
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/videos/floating-blob.mp4" type="video/mp4" />
            </video>
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />
          </div>

          <div className="px-6 -mt-16 relative z-10 max-w-[700px] md:max-w-[600px] mx-auto w-full pb-8">
            {/* Avatar Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex flex-col items-center">
                <div 
                  className="relative"
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
                  <div className="relative w-36 h-36 rounded-full ring-4 ring-primary overflow-hidden">
                    <img 
                      src={profile.avatar_url || "/placeholder.svg"}
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
                  </div>
                  
                  
                  <button
                    onClick={() => setShowAvatarGenerator(true)}
                    className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-full shadow-lg hover:scale-110 transition-transform"
                  >
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>
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
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex-1 py-3 rounded-full font-semibold text-sm transition-colors",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>


            {/* Tab Content */}
            {activeTab === "Stats" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center border border-border/30">
                  <span className="text-foreground">{t("profile.gamesPlayed")}</span>
                  <span className="font-bold text-foreground">{profile.games_played}</span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center border border-border/30">
                  <span className="text-foreground">{t("profile.gamesWon")}</span>
                  <span className="font-bold text-foreground">{profile.games_won}</span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center border border-border/30">
                  <span className="text-foreground">{t("profile.winRate")}</span>
                  <span className="font-bold text-foreground">
                    {profile.games_played > 0
                      ? Math.round((profile.games_won / profile.games_played) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center border border-border/30">
                  <span className="text-foreground">{t("profile.bestStreak")}</span>
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

      <AvatarModal
        isOpen={showAvatarGenerator}
        onClose={() => setShowAvatarGenerator(false)}
      />
      </div>
    </MainLayout>
  );
}