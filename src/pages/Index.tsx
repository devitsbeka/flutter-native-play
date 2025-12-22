import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Crown } from "lucide-react";
import { FeaturedCard } from "@/components/home/FeaturedCard";
import { CategoryCard } from "@/components/home/CategoryCard";
import { ViewTabs } from "@/components/home/ViewTabs";
import { GameLevelMap } from "@/components/home/GameLevelMap";
import { categories, featuredItems, getCategoriesByType } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Avatar } from "@/components/shared/Avatar";

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
      {/* Header */}
      <div className="gradient-purple px-5 pb-8 pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              imageUrl={profile?.avatar_url || undefined}
              emoji={profile?.nickname?.charAt(0) || "👤"}
              size="md"
              showRing
              ringColor="ring-white/30"
            />
            <div>
              <p className="text-sm text-primary-foreground/80">Welcome back!</p>
              <h1 className="font-bold text-primary-foreground">
                {profile?.nickname || "Trivia Master"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5">
              <Flame className="h-5 w-5 text-orange-300" />
              <span className="font-bold text-primary-foreground">{profile?.current_streak || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5">
              <Crown className="h-5 w-5 text-amber-300" />
              <span className="font-bold text-primary-foreground">{profile?.total_points || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-4 rounded-t-3xl bg-background px-5 pt-6">
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
