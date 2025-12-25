import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Settings, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/shared/Avatar";
import { HexBadge } from "@/components/shared/HexBadge";
import { AppLayout } from "@/components/layout/AppLayout";
import { getRankFromPoints } from "@/data/opponents";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AvatarGeneratorModal } from "@/components/profile/AvatarGeneratorModal";
const badges = [
  { icon: "🏆", color: "yellow" as const, locked: false },
  { icon: "⚡", color: "purple" as const, locked: false },
  { icon: "🎯", color: "coral" as const, locked: false },
  { icon: "🌟", color: "pink" as const, locked: false },
  { icon: "🔥", color: "green" as const, locked: false },
  { icon: "💎", color: "mint" as const, locked: true },
  { icon: "👑", color: "yellow" as const, locked: true },
  { icon: "🚀", color: "purple" as const, locked: true },
];

const tabs = ["Badge", "Stats", "Details"];

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Badge");
  const [showAvatarGenerator, setShowAvatarGenerator] = useState(false);

  const rank = profile ? getRankFromPoints(profile.total_points) : null;

  if (!user || !profile) {
    return (
      <AppLayout showNav>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Sign in to view your profile</p>
            <button
              onClick={() => navigate("/auth")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold"
            >
              Sign In
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const headerContent = (
    <div className="pt-12 pb-20 px-6">
      <div className="flex justify-between items-start mb-8">
        <h1 className="text-2xl font-bold text-primary-foreground">Profile</h1>
        <button
          onClick={() => signOut()}
          className="p-2 rounded-full bg-primary-foreground/10"
        >
          <Settings className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout headerContent={headerContent} headerClassName="pb-8">
      <div className="px-6 -mt-16 relative z-10">
        {/* Avatar Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl shadow-lg p-6 mb-6"
        >
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar
                emoji="😎"
                countryCode={profile.country_code || "US"}
                size="xl"
                showRing
                ringColor="ring-primary"
                imageUrl={profile.avatar_url || undefined}
              />
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
              {rank?.name || "Beginner"}
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {profile.total_points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground uppercase">Points</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-2xl font-bold text-foreground">
                #{Math.floor(Math.random() * 100) + 1}
              </p>
              <p className="text-xs text-muted-foreground uppercase">World Rank</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                #{Math.floor(Math.random() * 20) + 1}
              </p>
              <p className="text-xs text-muted-foreground uppercase">Local Rank</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 rounded-full font-semibold text-sm transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "Badge" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-4 gap-4"
          >
            {badges.map((badge, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex justify-center"
              >
                <HexBadge
                  icon={badge.icon}
                  color={badge.color}
                  locked={badge.locked}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === "Stats" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
              <span className="text-foreground">Games Played</span>
              <span className="font-bold text-foreground">{profile.games_played}</span>
            </div>
            <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
              <span className="text-foreground">Games Won</span>
              <span className="font-bold text-foreground">{profile.games_won}</span>
            </div>
            <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
              <span className="text-foreground">Win Rate</span>
              <span className="font-bold text-foreground">
                {profile.games_played > 0
                  ? Math.round((profile.games_won / profile.games_played) * 100)
                  : 0}%
              </span>
            </div>
            <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
              <span className="text-foreground">Best Streak</span>
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
              <span className="text-foreground">Email</span>
              <span className="text-muted-foreground truncate max-w-[180px]">
                {user.email}
              </span>
            </div>
            <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
              <span className="text-foreground">Country</span>
              <span className="text-foreground">
                {profile.country_code || "Not set"}
              </span>
            </div>
            <div className="bg-card rounded-2xl p-4 flex justify-between items-center">
              <span className="text-foreground">Member Since</span>
              <span className="text-muted-foreground">Recently</span>
            </div>
          </motion.div>
        )}
      </div>

      <AvatarGeneratorModal
        isOpen={showAvatarGenerator}
        onClose={() => setShowAvatarGenerator(false)}
      />
    </AppLayout>
  );
}
