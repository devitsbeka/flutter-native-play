import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FeaturedCard } from "@/components/home/FeaturedCard";
import { CategoryCard } from "@/components/home/CategoryCard";
import { ViewTabs } from "@/components/home/ViewTabs";
import { GameLevelMap } from "@/components/home/GameLevelMap";
import { SplineGlobe } from "@/components/home/SplineGlobe";
import { FloatingUserStats } from "@/components/home/FloatingUserStats";
import { categories, featuredItems, getCategoriesByType } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

export default function Index() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getCategoryProgress, isCategoryUnlocked, getMapLevels } = useCategoryProgress();
  const [activeView, setActiveView] = useState<"list" | "map">("list");

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  const handleLevelClick = (level: { id: number; categoryId: string; isUnlocked: boolean }) => {
    if (level.isUnlocked) {
      navigate(`/play/${level.categoryId}/${level.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section with Spline Globe */}
      <div className="relative">
        <FloatingUserStats profile={profile} />
        <SplineGlobe />
      </div>

      {/* Content */}
      <div className="relative px-5 pt-2">
        <div className="mb-6 flex justify-center">
          <ViewTabs activeView={activeView} onViewChange={setActiveView} />
        </div>

        {activeView === "list" ? (
          <>
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-bold text-foreground">Featured</h2>
              <div className="space-y-3">
                {featuredItems.map((item, index) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                    <FeaturedCard title={item.title} subtitle={item.subtitle} icon={item.icon} bgGradient={item.bgGradient} />
                  </motion.div>
                ))}
              </div>
            </section>

            {["classic", "fun", "educational"].map((type) => (
              <section key={type} className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-foreground capitalize">
                  {type === "classic" ? "Classic Trivia" : type === "fun" ? "Fun & Casual" : "Educational"}
                </h2>
                <div className="space-y-3">
                  {getCategoriesByType(type as "classic" | "fun" | "educational").map((cat, i) => (
                    <motion.div key={cat.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
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
              </section>
            ))}
          </>
        ) : (
          <GameLevelMap levels={getMapLevels()} onLevelClick={handleLevelClick} />
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
