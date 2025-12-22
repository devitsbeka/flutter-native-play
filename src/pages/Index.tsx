import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Map } from "lucide-react";
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

  const handleMapClick = () => {
    navigate("/world");
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Globe Canvas - Full Background */}
      <SplineGlobe />
      
      {/* Floating UI Elements */}
      <div className="relative z-10 flex flex-col min-h-screen pointer-events-none">
        {/* Top Stats */}
        <div className="pointer-events-auto">
          <FloatingUserStats profile={profile} />
        </div>
        
        {/* Map Button - Floating on canvas */}
        <div className="flex-1 flex items-center justify-end px-4">
          <motion.button
            onClick={handleMapClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-primary-foreground font-semibold shadow-lg"
            style={{
              boxShadow: "0 4px 0 0 hsl(var(--primary) / 0.5), 0 8px 16px -4px hsl(0 0% 0% / 0.2)",
            }}
          >
            <Map className="h-4 w-4" />
            <span>World Map</span>
          </motion.button>
        </div>

        {/* Bottom Content Section */}
        <div className="pointer-events-auto px-5 pb-24 pt-4 bg-gradient-to-t from-background via-background to-transparent">
        {/* Tabs */}
        <div className="mb-6 flex justify-center">
          <div 
            className="inline-flex rounded-2xl bg-muted p-1.5"
            style={{
              boxShadow: "inset 0 2px 4px hsl(0 0% 0% / 0.05)",
            }}
          >
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
            className="-mx-5"
          >
            <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
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
                    bgGradient={item.bgGradient}
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
      className={`relative rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
        isActive
          ? "text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="contentTab"
          className="absolute inset-0 rounded-xl bg-primary"
          style={{
            boxShadow: "0 4px 0 0 hsl(var(--primary) / 0.5)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
