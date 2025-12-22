import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Trophy, ChevronDown, Map, Play, Gift, Star, Target, Award, Sparkles } from "lucide-react";
import { FeaturedCard } from "@/components/home/FeaturedCard";
import { CategoryCard } from "@/components/home/CategoryCard";
import { FloatingUserStats } from "@/components/home/FloatingUserStats";
import { featuredItems, getCategoriesByType } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import crownMascot from "@/assets/crown-mascot.png";

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
      {/* Sky Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(180deg, hsl(195 85% 70%) 0%, hsl(195 80% 85%) 50%, hsl(45 40% 88%) 100%)"
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
      <div className="relative z-10 flex flex-col min-h-screen pointer-events-auto">
        {/* Header */}
        <header className="px-4 pt-4 safe-top">
          <FloatingUserStats profile={profile} />
        </header>

        {/* Feature Buttons Row - Lucky Spin & VIP style */}
        <div className="px-4 pt-4 flex gap-2 relative z-20">
          <FeatureButton
            icon={<Gift className="w-6 h-6" />}
            label="Lucky spin"
            color="hsl(280 60% 55%)"
            onClick={() => {}}
          />
          <FeatureButton
            icon={<Star className="w-6 h-6" />}
            label="VIP"
            color="hsl(45 90% 50%)"
            variant="gold"
            onClick={() => {}}
          />
        </div>

        {/* Central Level Badge with Mascot */}
        <div className="flex-1 flex items-center justify-center relative px-4 pointer-events-none">
          {/* Side Feature Icons */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
            <SideFeatureIcon icon={<Gift className="w-6 h-6" />} label="Pick-A-Prize" onClick={() => console.log("Pick-A-Prize")} />
            <SideFeatureIcon icon={<Target className="w-6 h-6" />} label="Missions" onClick={() => console.log("Missions")} />
          </div>
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
            <SideFeatureIcon icon={<Sparkles className="w-6 h-6" />} label="Events" onClick={() => console.log("Events")} />
            <SideFeatureIcon icon={<Award className="w-6 h-6" />} label="Trivia Pass" onClick={() => console.log("Trivia Pass")} />
            <SideFeatureIcon icon={<Trophy className="w-6 h-6" />} label="Ranking" onClick={() => navigate("/leaderboards")} />
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
              className="absolute inset-0 rounded-full blur-3xl opacity-50"
              style={{ background: "radial-gradient(circle, hsl(190 80% 70%) 0%, transparent 70%)" }}
            />
            
            {/* Star-shaped level badge */}
            <div 
              className="relative w-36 h-36 flex flex-col items-center justify-center"
              style={{
                background: "radial-gradient(circle, hsl(190 90% 85%) 0%, hsl(190 80% 70%) 100%)",
                clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                filter: "drop-shadow(0 4px 8px hsl(190 70% 40% / 0.4))"
              }}
            >
              <span className="text-sm font-semibold text-primary-foreground" style={{ textShadow: "0 1px 2px hsl(0 0% 0% / 0.2)" }}>Level</span>
              <span className="text-5xl font-display font-bold text-white" style={{ textShadow: "0 2px 4px hsl(0 0% 0% / 0.3)" }}>1</span>
            </div>

            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-white"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* Crown mascot character silhouette area */}
        <div className="relative h-40 flex items-end justify-center">
          <motion.img
            src={crownMascot}
            alt="Mascot"
            className="w-20 h-20 object-contain opacity-50"
            style={{ filter: "drop-shadow(0 4px 8px hsl(0 0% 0% / 0.2))" }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Special Chest Progress */}
        <div className="px-4 pb-4">
          <div 
            className="rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{
              background: "linear-gradient(180deg, hsl(220 20% 20%) 0%, hsl(220 25% 15%) 100%)",
              boxShadow: "0 4px 0 hsl(220 20% 10%)"
            }}
          >
            <div className="flex items-center gap-2">
              <div className="text-2xl">👑</div>
            </div>
            <div className="flex-1 text-center">
              <span className="font-display text-white italic">Special Chest</span>
              <span className="text-white/70 text-sm ml-2">0/3</span>
            </div>
            <div className="text-2xl">🎁</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-8 flex flex-col items-center space-y-4 relative z-20">
          {/* Big PLAY NOW Button - Orange Chunky 3D Style */}
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
                background: "linear-gradient(180deg, hsl(25 85% 40%) 0%, hsl(25 80% 30%) 100%)",
                transform: "translateY(6px)",
              }}
            />
            {/* Main button face */}
            <div 
              className="relative rounded-2xl px-8 py-5 flex items-center justify-center gap-3 transition-transform group-active:translate-y-1"
              style={{
                background: "linear-gradient(180deg, hsl(30 95% 55%) 0%, hsl(25 90% 50%) 100%)",
                boxShadow: "inset 0 2px 0 0 hsl(30 95% 70%), inset 0 -2px 0 0 hsl(25 85% 40%)",
              }}
            >
              <span className="font-display text-white text-2xl font-bold tracking-wide uppercase" style={{ textShadow: "0 2px 4px hsl(0 0% 0% / 0.3)" }}>
                Play Now!
              </span>
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
            <span className="text-xs text-foreground/60">Explore more</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <ChevronDown className="h-5 w-5 text-foreground/60" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Second Screen - Below the fold */}
      <div className="relative z-10 min-h-screen bg-background/95 backdrop-blur-sm rounded-t-3xl -mt-4">
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

function FeatureButton({ 
  icon, 
  label, 
  color,
  variant = "default",
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string;
  color: string;
  variant?: "default" | "gold";
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-1 relative group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98, y: 2 }}
    >
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `linear-gradient(180deg, ${color}99 0%, ${color}66 100%)`,
          transform: "translateY(4px)",
        }}
      />
      <div 
        className="relative rounded-2xl px-4 py-3 flex items-center justify-center gap-2 transition-transform group-active:translate-y-1"
        style={{
          background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`,
          boxShadow: `inset 0 2px 0 hsl(0 0% 100% / 0.3), inset 0 -2px 0 hsl(0 0% 0% / 0.2)`,
          border: variant === "gold" ? "2px solid hsl(45 80% 40%)" : "none"
        }}
      >
        <span className="text-white">{icon}</span>
        <span className="font-display text-white text-sm font-bold">{label}</span>
        {variant === "gold" && <Star className="w-4 h-4 text-white fill-white" />}
      </div>
    </motion.button>
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
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: "linear-gradient(180deg, hsl(45 90% 55%) 0%, hsl(40 85% 45%) 100%)",
          boxShadow: "0 3px 0 hsl(35 80% 35%), inset 0 1px 0 hsl(0 0% 100% / 0.3)"
        }}
      >
        <span className="text-white">{icon}</span>
      </div>
      <span className="text-xs font-semibold text-foreground/80">{label}</span>
    </motion.button>
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
