import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Trophy, ChevronDown, Map, Gift, Star, Target, Award, Sparkles, Menu } from "lucide-react";
import { FeaturedCard } from "@/components/home/FeaturedCard";
import { CategoryCard } from "@/components/home/CategoryCard";
import { LuckySpinModal } from "@/components/game/LuckySpinModal";
import { featuredItems, getCategoriesByType } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/shared/Avatar";
import crownMascot from "@/assets/crown-mascot.png";

type ContentTab = "featured" | "trivia";

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
        
        {/* Clouds decoration */}
        <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-20 -left-20 w-64 h-32 rounded-full opacity-80"
            style={{ background: "hsl(0 0% 100% / 0.8)", filter: "blur(30px)" }}
            animate={{ x: [0, 30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-40 -right-10 w-48 h-24 rounded-full opacity-60"
            style={{ background: "hsl(0 0% 100% / 0.7)", filter: "blur(25px)" }}
            animate={{ x: [0, -20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        
        {/* First Screen - Full viewport height */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <header className="px-4 pt-4 safe-top">
            <div className="flex items-center justify-between gap-3">
              {/* Burger Menu + User Avatar */}
              <div className="flex items-center gap-2">
                <button className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm">
                  <Menu className="h-5 w-5 text-foreground/70" />
                </button>
                <button className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm">
                  <Avatar
                    imageUrl={profile?.avatar_url || undefined}
                    emoji={profile?.nickname?.charAt(0) || "👤"}
                    size="sm"
                  />
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2">
                <div className="h-12 rounded-2xl px-4 flex items-center gap-2 bg-white/70 backdrop-blur-sm shadow-sm">
                  <span className="text-orange-400">🔥</span>
                  <span className="font-bold text-foreground">{profile?.current_streak || 0}</span>
                </div>
                <div className="h-12 rounded-2xl px-4 flex items-center gap-2 bg-white/70 backdrop-blur-sm shadow-sm">
                  <span className="text-amber-400">👑</span>
                  <span className="font-bold text-foreground">{profile?.total_points || 0}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Feature Buttons Row - Lucky Spin & VIP */}
          <div className="px-4 pt-4 flex gap-3">
            <motion.button
              onClick={() => setIsSpinModalOpen(true)}
              className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm"
              whileTap={{ scale: 0.98 }}
            >
              <Gift className="w-5 h-5 text-foreground/70" />
              <span className="font-semibold text-foreground/80">Lucky spin</span>
            </motion.button>
            
            <motion.button
              onClick={() => console.log("VIP")}
              className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 border-2 shadow-sm"
              style={{
                background: "linear-gradient(180deg, hsl(45 50% 95%) 0%, hsl(45 60% 90%) 100%)",
                borderColor: "hsl(45 70% 55%)"
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Star className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-amber-700">VIP</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </motion.button>
          </div>

          {/* Central Level Badge with Side Icons */}
          <div className="flex-1 flex items-center justify-center relative px-4">
            {/* Left Side Feature Icons */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
              <SideFeatureIcon icon={<Gift className="w-5 h-5" />} label="Pick-A-Prize" onClick={() => console.log("Pick-A-Prize")} />
              <SideFeatureIcon icon={<Target className="w-5 h-5" />} label="Missions" onClick={() => console.log("Missions")} />
            </div>
            
            {/* Right Side Feature Icons */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
              <SideFeatureIcon icon={<Sparkles className="w-5 h-5" />} label="Events" onClick={() => console.log("Events")} />
              <SideFeatureIcon icon={<Award className="w-5 h-5" />} label="Trivia Pass" onClick={() => console.log("Trivia Pass")} />
              <SideFeatureIcon icon={<Trophy className="w-5 h-5" />} label="Ranking" onClick={() => navigate("/leaderboards")} />
            </div>

            {/* Center Level Badge */}
            <motion.div
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
            >
              {/* Glow effect */}
              <div 
                className="absolute inset-0 rounded-full blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle, hsl(195 80% 70%) 0%, transparent 70%)" }}
              />
              
              {/* Star-shaped level badge */}
              <div 
                className="relative w-32 h-32 flex flex-col items-center justify-center"
                style={{
                  background: "radial-gradient(circle, hsl(195 80% 85%) 0%, hsl(195 70% 75%) 100%)",
                  clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                  filter: "drop-shadow(0 4px 8px hsl(195 70% 40% / 0.3))"
                }}
              >
                <span className="text-sm font-semibold text-foreground/70">Level</span>
                <span className="text-5xl font-display font-bold text-foreground">1</span>
              </div>

              {/* Sparkle particles */}
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-white/80"
                  style={{
                    top: `${25 + Math.random() * 50}%`,
                    left: `${15 + Math.random() * 70}%`,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.4,
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Crown mascot */}
          <div className="relative h-32 flex items-end justify-center">
            <motion.img
              src={crownMascot}
              alt="Mascot"
              className="w-24 h-24 object-contain"
              style={{ filter: "drop-shadow(0 4px 8px hsl(0 0% 0% / 0.15))" }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Special Chest Progress */}
          <div className="px-4 pb-4">
            <div 
              className="rounded-2xl px-5 py-4 flex items-center justify-between"
              style={{
                background: "linear-gradient(180deg, hsl(220 20% 25%) 0%, hsl(220 25% 18%) 100%)",
                boxShadow: "0 4px 0 hsl(220 20% 12%)"
              }}
            >
              <span className="text-xl">👑</span>
              <div className="flex-1 text-center">
                <span className="font-display text-white text-lg italic">Special Chest</span>
                <span className="text-white/60 text-sm ml-2">0/3</span>
              </div>
              <span className="text-xl">🎁</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-8 flex flex-col items-center space-y-4">
            {/* Big PLAY NOW Button */}
            <motion.button
              onClick={() => navigate("/game")}
              className="relative w-full max-w-sm"
              whileTap={{ scale: 0.98, y: 4 }}
            >
              {/* Shadow layer */}
              <div 
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: "hsl(25 80% 35%)",
                  transform: "translateY(5px)",
                }}
              />
              {/* Main button */}
              <div 
                className="relative rounded-2xl px-8 py-5 flex items-center justify-center"
                style={{
                  background: "linear-gradient(180deg, hsl(30 90% 55%) 0%, hsl(25 85% 50%) 100%)",
                }}
              >
                <span className="font-display text-white text-2xl font-bold tracking-wide uppercase">
                  Play Now!
                </span>
              </div>
            </motion.button>

            {/* Three Icon Buttons Row */}
            <div className="w-full max-w-sm flex gap-3">
              <ChunkyIconButton 
                icon={<Users className="h-6 w-6" />} 
                onClick={() => navigate("/team")}
              />
              <ChunkyIconButton 
                icon={<Trophy className="h-6 w-6" />} 
                onClick={() => navigate("/leaderboards")}
              />
              <ChunkyIconButton 
                icon={<Map className="h-6 w-6" />} 
                onClick={() => navigate("/adventure-map")}
              />
            </div>

            {/* Scroll indicator */}
            <motion.div 
              className="pt-4 flex flex-col items-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-sm text-foreground/60">Explore more</span>
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="h-5 w-5 text-foreground/60" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Second Screen - Below the fold */}
        <div className="relative z-10 min-h-screen bg-background/95 backdrop-blur-sm rounded-t-3xl -mt-4">
          <div className="px-4 py-8 space-y-4">
            {/* Tabs */}
            <div className="flex justify-start">
              <div className="inline-flex rounded-2xl p-1.5 bg-muted/50 backdrop-blur-sm">
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
    </>
  );
}

function SideFeatureIcon({ 
  icon, 
  label,
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-1"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div 
        className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md"
        style={{
          background: "linear-gradient(180deg, hsl(45 85% 55%) 0%, hsl(40 80% 45%) 100%)",
          boxShadow: "0 3px 0 hsl(35 75% 35%)"
        }}
      >
        <span className="text-white">{icon}</span>
      </div>
      <span className="text-xs font-semibold text-foreground/70">{label}</span>
    </motion.button>
  );
}

function ChunkyIconButton({ 
  icon, 
  onClick
}: { 
  icon: React.ReactNode; 
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-1 relative"
      whileTap={{ scale: 0.95, y: 3 }}
    >
      {/* Shadow layer */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "hsl(0 0% 82%)",
          transform: "translateY(4px)",
        }}
      />
      {/* Main button */}
      <div 
        className="relative rounded-2xl py-5 flex items-center justify-center"
        style={{
          background: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 96%) 100%)",
        }}
      >
        <span className="text-foreground/60">{icon}</span>
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
          className="absolute inset-0 rounded-xl bg-background shadow-sm"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
