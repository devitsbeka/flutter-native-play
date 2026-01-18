import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Settings, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { getRankFromPoints } from "@/data/opponents";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { AvatarGeneratorModal } from "@/components/profile/AvatarGeneratorModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProPlansSection, ProTier } from "@/components/profile/ProPlansSection";
import { useVipStatus } from "@/hooks/useVipStatus";


export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { subscription, isVip } = useVipStatus();
  const [activeTab, setActiveTab] = useState("Stats");
  const [showAvatarGenerator, setShowAvatarGenerator] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const tabs = [
    { key: "Stats", label: t("profile.stats") },
    { key: "Details", label: t("profile.details") },
    { key: "PRO", label: "PRO" },
  ];

  // Get current tier from subscription
  const currentTier = subscription?.vip_tier as ProTier | undefined;
  const friendInvitesRemaining = (subscription as any)?.friend_invites_remaining || 0;

  const rank = profile ? getRankFromPoints(profile.total_points) : null;

  if (!user || !profile) {
    return (
      <MainLayout showPlayButton={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{t("profile.signInToView")}</p>
            <button
              onClick={() => navigate("/auth")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold"
            >
              {t("profile.signIn")}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showPlayButton={false}>
      <div className="min-h-screen bg-background">
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
            
            <div className="relative z-10 max-w-[700px] md:max-w-[600px] mx-auto">
              <div className="flex justify-between items-start mb-8">
                <h1 className="text-2xl font-bold text-white">{t("profile.title")}</h1>
                <button
                  onClick={() => navigate("/settings")}
                  className="p-2 rounded-full bg-white/10 backdrop-blur-sm"
                >
                  <Settings className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 -mt-16 relative z-10 max-w-[700px] md:max-w-[600px] mx-auto w-full pb-8">
            {/* Avatar Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-3xl shadow-lg p-6 mb-6"
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
                  <div className="relative w-28 h-28 rounded-full ring-4 ring-primary overflow-hidden">
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
                        onLoadedData={() => {
                          if (videoRef.current) {
                            videoRef.current.play().catch(console.error);
                            setShowVideo(true);
                          }
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Sparkle indicator for animated avatars */}
                  {profile.animated_avatar_url && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg z-20"
                    >
                      <Sparkles className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                  
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

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {profile.total_points.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase">{t("profile.points")}</p>
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-2xl font-bold text-foreground">
                    #{Math.floor(Math.random() * 100) + 1}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase">{t("profile.worldRank")}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    #{Math.floor(Math.random() * 20) + 1}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase">{t("profile.localRank")}</p>
                </div>
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
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-foreground">{t("profile.gamesPlayed")}</span>
                  <span className="font-bold text-foreground">{profile.games_played}</span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-foreground">{t("profile.gamesWon")}</span>
                  <span className="font-bold text-foreground">{profile.games_won}</span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-foreground">{t("profile.winRate")}</span>
                  <span className="font-bold text-foreground">
                    {profile.games_played > 0
                      ? Math.round((profile.games_won / profile.games_played) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-foreground">{t("profile.bestStreak")}</span>
                  <span className="font-bold text-foreground">{profile.best_streak}</span>
                </div>
              </motion.div>
            )}

            {activeTab === "Details" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-foreground">{t("profile.email")}</span>
                  <span className="text-muted-foreground truncate max-w-[180px]">
                    {user.email}
                  </span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-foreground">{t("profile.country")}</span>
                  <span className="text-foreground">
                    {profile.country_code || t("profile.notSet")}
                  </span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-foreground">{t("profile.memberSince")}</span>
                  <span className="text-muted-foreground">{t("profile.recently")}</span>
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
                />
              </motion.div>
            )}
          </div>

        <AvatarGeneratorModal
          isOpen={showAvatarGenerator}
          onClose={() => setShowAvatarGenerator(false)}
        />
      </div>
    </MainLayout>
  );
}