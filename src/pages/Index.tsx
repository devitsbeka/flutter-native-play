import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FeaturedCard } from "@/components/home/FeaturedCard";
import { CategoryCard } from "@/components/home/CategoryCard";
import { SplineGlobe } from "@/components/home/SplineGlobe";
import { FloatingUserStats } from "@/components/home/FloatingUserStats";
import { featuredItems, getCategoriesByType } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Spline Background - Fixed full screen */}
      <SplineGlobe />
      
      {/* White radial mask - fades to transparent in center */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, transparent 0%, transparent 20%, hsl(0 0% 100% / 0.85) 50%, hsl(0 0% 100% / 1) 70%, hsl(0 0% 100%) 100%)",
        }}
      />
      
      {/* UI Layer - On top of background */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="px-4 pt-4 safe-top">
          <FloatingUserStats profile={profile} />
        </header>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Content */}
        <div className="px-4 pb-24 space-y-4">
          {/* Tabs */}
          <div className="flex justify-center">
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
              className="-mx-4"
            >
              <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide">
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

      <BottomNavigation />
    </div>
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
