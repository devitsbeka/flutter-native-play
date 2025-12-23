import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Trophy, ChevronDown, Map, Gift, Star, Menu } from "lucide-react";
import { FeaturedCard } from "@/components/home/FeaturedCard";
import { CategoryCard } from "@/components/home/CategoryCard";
import { LuckySpinModal } from "@/components/game/LuckySpinModal";
import { featuredItems, getCategoriesByType } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/shared/Avatar";
import crownMascot from "@/assets/crown-mascot.png";

type ContentTab = "featured" | "classic" | "fun" | "educational";

export default function Index() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getCategoryProgress, isCategoryUnlocked } = useCategoryProgress();
  const [activeTab, setActiveTab] = useState<ContentTab>("featured");
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  return (
    <>
      <LuckySpinModal isOpen={isSpinModalOpen} onClose={() => setIsSpinModalOpen(false)} />
      <div className="relative min-h-[200vh] overflow-x-hidden">
        {/* Sky Background */}
        <div 
          className="fixed inset-0 z-0"
          style={{
            background: "linear-gradient(180deg, hsl(195 85% 75%) 0%, hsl(195 80% 85%) 50%, hsl(45 40% 90%) 100%)"
          }}
        />
        
        {/* First Screen */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <header className="px-4 pt-4 safe-top">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm">
                  <Menu className="h-5 w-5 text-foreground/70" />
                </button>
                <button className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
                  <Avatar
                    imageUrl={profile?.avatar_url || undefined}
                    emoji={profile?.nickname?.charAt(0) || "👤"}
                    size="sm"
                  />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-11 rounded-2xl px-3 flex items-center gap-1.5 bg-white/70 backdrop-blur-sm shadow-sm">
                  <span className="text-orange-400">🔥</span>
                  <span className="font-bold text-foreground text-sm">{profile?.current_streak || 0}</span>
                </div>
                <div className="h-11 rounded-2xl px-3 flex items-center gap-1.5 bg-white/70 backdrop-blur-sm shadow-sm">
                  <span className="text-amber-400">👑</span>
                  <span className="font-bold text-foreground text-sm">{profile?.total_points || 0}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            {/* Level Badge */}
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
            >
              <div 
                className="relative w-28 h-28 flex flex-col items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(195 80% 85%) 0%, hsl(195 70% 70%) 100%)",
                  boxShadow: "0 8px 24px hsl(195 70% 40% / 0.25)"
                }}
              >
                <span className="text-xs font-semibold text-foreground/60">დონე</span>
                <span className="text-4xl font-display font-bold text-foreground">1</span>
              </div>
            </motion.div>

            {/* Mascot */}
            <motion.img
              src={crownMascot}
              alt="მასკოტი"
              className="w-20 h-20 object-contain mb-6"
              style={{ filter: "drop-shadow(0 4px 8px hsl(0 0% 0% / 0.1))" }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Play Button */}
            <motion.button
              onClick={() => navigate("/game")}
              className="relative w-full max-w-xs mb-4"
              whileTap={{ scale: 0.98, y: 3 }}
            >
              <div 
                className="absolute inset-0 rounded-2xl"
                style={{ background: "hsl(25 80% 35%)", transform: "translateY(4px)" }}
              />
              <div 
                className="relative rounded-2xl px-8 py-4 flex items-center justify-center"
                style={{ background: "linear-gradient(180deg, hsl(30 90% 55%) 0%, hsl(25 85% 50%) 100%)" }}
              >
                <span className="font-display text-white text-xl font-bold tracking-wide uppercase">
                  თამაშის დაწყება
                </span>
              </div>
            </motion.button>

            {/* Special Chest Progress */}
            <div className="w-full max-w-xs mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🎁</span>
                  <span className="text-xs font-medium text-foreground/60">სპეციალური სკივრი</span>
                </div>
                <span className="text-xs font-bold text-foreground/70">0/3</span>
              </div>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: "0%",
                    background: "linear-gradient(90deg, hsl(45 90% 50%) 0%, hsl(35 90% 55%) 100%)"
                  }}
                />
              </div>
            </div>

            {/* Quick Action Row */}
            <div className="flex gap-3 w-full max-w-xs">
              <QuickButton 
                icon={<Gift className="h-5 w-5" />}
                label="ბორბალი"
                onClick={() => setIsSpinModalOpen(true)}
              />
              <QuickButton 
                icon={<Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
                label="VIP"
                onClick={() => console.log("VIP")}
                highlight
              />
              <QuickButton 
                icon={<Trophy className="h-5 w-5" />}
                label="რეიტინგი"
                onClick={() => navigate("/leaderboards")}
              />
            </div>
          </div>

          {/* Bottom Navigation Row */}
          <div className="px-6 pb-6">
            <div className="flex gap-3 max-w-xs mx-auto">
              <NavButton icon={<Users className="h-5 w-5" />} onClick={() => navigate("/team")} />
              <NavButton icon={<Map className="h-5 w-5" />} onClick={() => navigate("/adventure-map")} />
            </div>
            
            {/* Scroll indicator */}
            <motion.div 
              className="pt-6 flex flex-col items-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-xs text-foreground/50">კატეგორიები</span>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="h-4 w-4 text-foreground/50" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Second Screen - Categories */}
        <div className="relative z-10 min-h-screen bg-background/95 backdrop-blur-sm rounded-t-3xl -mt-4">
          <div className="px-4 py-6 space-y-4">
            {/* Tabs */}
            <div className="overflow-x-auto pb-2 -mx-4 px-4">
              <div className="inline-flex rounded-2xl p-1 bg-muted/50">
                <TabButton isActive={activeTab === "featured"} onClick={() => setActiveTab("featured")} label="გამორჩეული" />
                <TabButton isActive={activeTab === "classic"} onClick={() => setActiveTab("classic")} label="კლასიკური" />
                <TabButton isActive={activeTab === "fun"} onClick={() => setActiveTab("fun")} label="გართობა" />
                <TabButton isActive={activeTab === "educational"} onClick={() => setActiveTab("educational")} label="სასწავლო" />
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
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-3">
                  {getCategoriesByType(activeTab).map((cat, i) => (
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
    </>
  );
}

function QuickButton({ 
  icon, 
  label,
  onClick,
  highlight
}: { 
  icon: React.ReactNode; 
  label: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl ${
        highlight 
          ? "bg-amber-100/80 border border-amber-300/50" 
          : "bg-white/60 backdrop-blur-sm"
      }`}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-foreground/70">{icon}</span>
      <span className="text-xs font-medium text-foreground/70">{label}</span>
    </motion.button>
  );
}

function NavButton({ 
  icon, 
  onClick
}: { 
  icon: React.ReactNode; 
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-1 py-4 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center"
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-foreground/60">{icon}</span>
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
      className={`relative rounded-xl px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
        isActive ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="contentTab"
          className="absolute inset-0 rounded-xl bg-background shadow-sm"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
