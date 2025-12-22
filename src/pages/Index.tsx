import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Trophy, ChevronDown, Map, Play } from "lucide-react";
import { FeaturedCard } from "@/components/home/FeaturedCard";
import { CategoryCard } from "@/components/home/CategoryCard";
import { SplineGlobe } from "@/components/home/SplineGlobe";
import { FloatingUserStats } from "@/components/home/FloatingUserStats";
import { featuredItems, getCategoriesByType } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";

type ContentTab = "featured" | "trivia";

export default function Index() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getCategoryProgress, isCategoryUnlocked } = useCategoryProgress();
  const [activeTab, setActiveTab] = useState<ContentTab>("featured");

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  return (
    <div className="relative min-h-[200vh] overflow-x-hidden">
      {/* Spline Background - Fixed full screen */}
      <SplineGlobe />
      
      {/* White radial mask - fades to transparent in center */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, transparent 0%, transparent 15%, hsl(0 0% 100% / 0.75) 40%, hsl(0 0% 100% / 0.9) 60%, hsl(0 0% 100% / 0.95) 100%)",
        }}
      />
      
      {/* First Screen - Full viewport height */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="px-4 pt-4 safe-top">
          <FloatingUserStats profile={profile} />
        </header>

        {/* Welcome Section */}
        <div className="px-4 pt-6">
          <h1 className="text-4xl font-display font-bold text-foreground">
            Welcome back, {profile?.nickname || "Guest"}
          </h1>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons - New Layout */}
        <div className="px-4 pb-8 flex flex-col items-center space-y-4">
          {/* Big Quick Play Button - Chunky 3D Style */}
          <motion.button
            onClick={() => navigate("/game")}
            className="relative w-[90%] group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98, y: 4 }}
          >
            {/* Shadow/Depth layer */}
            <div 
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(180deg, hsl(174 60% 35%) 0%, hsl(174 60% 25%) 100%)",
                transform: "translateY(6px)",
              }}
            />
            {/* Main button face */}
            <div 
              className="relative rounded-2xl px-8 py-5 flex items-center justify-center gap-3 transition-transform group-active:translate-y-1"
              style={{
                background: "linear-gradient(180deg, hsl(174 60% 50%) 0%, hsl(180 50% 45%) 100%)",
                boxShadow: "inset 0 2px 0 0 hsl(174 60% 60%), inset 0 -2px 0 0 hsl(174 60% 35%)",
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="h-6 w-6 text-white fill-white" />
              </div>
              <span className="font-display text-white text-xl font-bold tracking-wide">Quick Play</span>
            </div>
          </motion.button>

          {/* Three Icon Buttons Row - Chunky 3D White Style */}
          <div className="w-[90%] flex gap-3">
            <ChunkyIconButton 
              icon={<Users className="h-6 w-6" />} 
              onClick={() => navigate("/team")}
              iconColor="hsl(280 60% 50%)"
            />
            <ChunkyIconButton 
              icon={<Trophy className="h-6 w-6" />} 
              onClick={() => navigate("/leaderboards")}
              iconColor="hsl(45 90% 45%)"
            />
            <ChunkyIconButton 
              icon={<Map className="h-6 w-6" />} 
              onClick={() => navigate("/adventure-map")}
              iconColor="hsl(140 50% 40%)"
            />
          </div>

          {/* Scroll indicator */}
          <motion.div 
            className="pt-6 flex flex-col items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-xs text-muted-foreground">Explore more</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Second Screen - Below the fold */}
      <div className="relative z-10 min-h-screen bg-background/80 backdrop-blur-sm">
        <div className="px-4 py-8 space-y-4">
          {/* Tabs - Left aligned */}
          <div className="flex justify-start">
            <div className="liquid-glass inline-flex rounded-2xl p-1.5">
              <TabButton
                isActive={activeTab === "featured"}
                onClick={() => setActiveTab("featured")}
                label="Featured"
              />
              <TabButton
                isActive={activeTab === "trivia"}
                onClick={() => setActiveTab("trivia")}
                label="Classic Trivia"
              />
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "featured" ? (
            <motion.section
              key="featured"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-2 gap-3">
                {featuredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <FeaturedCard
                      title={item.title}
                      subtitle={item.subtitle}
                      icon={item.icon}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="trivia"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-3">
                {getCategoriesByType("classic").map((cat, i) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <CategoryCard
                      name={cat.name}
                      icon={cat.icon}
                      description={cat.description}
                      color={cat.color}
                      progress={getCategoryProgress(cat.id)}
                      totalLevels={cat.totalLevels}
                      isLocked={!isCategoryUnlocked(cat.id)}
                      onClick={() => handleCategoryClick(cat.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}

function ChunkyIconButton({ 
  icon, 
  onClick, 
  iconColor 
}: { 
  icon: React.ReactNode; 
  onClick: () => void;
  iconColor: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-1 relative group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95, y: 3 }}
    >
      {/* Shadow/Depth layer */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, hsl(0 0% 85%) 0%, hsl(0 0% 75%) 100%)",
          transform: "translateY(4px)",
        }}
      />
      {/* Main button face - pure white */}
      <div 
        className="relative rounded-2xl py-5 flex items-center justify-center transition-transform group-active:translate-y-1"
        style={{
          background: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 97%) 100%)",
          boxShadow: "inset 0 2px 0 0 hsl(0 0% 100%), inset 0 -1px 0 0 hsl(0 0% 92%)",
        }}
      >
        {/* Colored icon directly on white surface */}
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
    </motion.button>
  );
}

function TabButton({
  isActive,
  onClick,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl px-5 py-2.5 text-sm font-display tracking-wide transition-all ${
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="contentTab"
          className="absolute inset-0 rounded-xl bg-foreground/10 backdrop-blur-sm"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}