import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Menu } from "lucide-react";
import { FeaturedCard } from "@/components/home/FeaturedCard";
import { CategoryCard } from "@/components/home/CategoryCard";
import { LuckySpinModal } from "@/components/game/LuckySpinModal";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { LevelBadge } from "@/components/home/LevelBadge";
import { StreakModal } from "@/components/home/StreakModal";
import { PointsModal } from "@/components/home/PointsModal";
import { GuestProgressBanner } from "@/components/home/GuestProgressBanner";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { featuredItems, getCategoriesByType } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/shared/Avatar";
import { toast } from "sonner";
import iconWheel from "@/assets/icon-wheel.png";
import iconVip from "@/assets/icon-vip.png";
import iconLeaderboard from "@/assets/icon-leaderboard.png";
import iconMap from "@/assets/icon-map.png";


type ContentTab = "featured" | "classic" | "fun" | "educational";

export default function Index() {
  const navigate = useNavigate();
  const { profile, fetchProfile, user } = useAuth();
  const { getCategoryProgress, isCategoryUnlocked } = useCategoryProgress();
  const [activeTab, setActiveTab] = useState<ContentTab>("featured");
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [displayPoints, setDisplayPoints] = useState(profile?.total_points || 0);

  // Sync display points with profile
  useEffect(() => {
    setDisplayPoints(profile?.total_points || 0);
  }, [profile?.total_points]);

  // Calculate chest progress from games won (cycles every 3 wins)
  const gamesWon = profile?.games_won || 0;
  const chestProgress = gamesWon % 3;
  const chestProgressPercent = (chestProgress / 3) * 100;
  const canClaimChest = chestProgress === 0 && gamesWon > 0;

  // Check if chest is ready to claim
  useEffect(() => {
    if (canClaimChest && gamesWon > 0) {
      // Show chest modal when 3 wins are achieved
      const hasClaimedThisChest = localStorage.getItem(`chest_claimed_${Math.floor(gamesWon / 3)}`);
      if (!hasClaimedThisChest) {
        setIsChestModalOpen(true);
      }
    }
  }, [canClaimChest, gamesWon]);

  const handleClaimChest = (newPoints?: number) => {
    // Mark this chest as claimed
    localStorage.setItem(`chest_claimed_${Math.floor(gamesWon / 3)}`, "true");
    setIsChestModalOpen(false);
    
    // Animate the points update
    if (newPoints !== undefined) {
      setDisplayPoints(newPoints);
    }
    
    // Refresh profile to get latest data
    if (user) {
      fetchProfile(user.id);
    }
    
    toast.success("ჯილდოები მიღებულია! 🎉");
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  return (
    <>
      <LuckySpinModal isOpen={isSpinModalOpen} onClose={() => setIsSpinModalOpen(false)} />
      <SideMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <ChestRewardModal 
        isOpen={isChestModalOpen} 
        onClose={() => setIsChestModalOpen(false)}
        onClaim={handleClaimChest}
      />
      <StreakModal 
        isOpen={isStreakModalOpen} 
        onClose={() => setIsStreakModalOpen(false)} 
        currentStreak={profile?.current_streak || 0}
        bestStreak={profile?.best_streak || 0}
      />
      <PointsModal 
        isOpen={isPointsModalOpen} 
        onClose={() => setIsPointsModalOpen(false)} 
        totalPoints={profile?.total_points || 0}
        gamesPlayed={profile?.games_played || 0}
        gamesWon={profile?.games_won || 0}
        currentStreak={profile?.current_streak || 0}
      />
      
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
                <button 
                  onClick={() => setIsMenuOpen(true)}
                  className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm"
                >
                  <Menu className="h-5 w-5 text-slate-600" />
                </button>
                <button 
                  onClick={() => navigate("/profile")}
                  className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden"
                >
                  <Avatar
                    imageUrl={profile?.avatar_url || undefined}
                    emoji={profile?.nickname?.charAt(0) || "👤"}
                    size="sm"
                  />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsStreakModalOpen(true)}
                  className="h-11 rounded-2xl px-3 flex items-center gap-1.5 bg-white/70 backdrop-blur-sm shadow-sm hover:bg-white/80 transition-colors"
                >
                  <span className="text-orange-400">🔥</span>
                  <span className="font-bold text-slate-700 text-sm">{profile?.current_streak || 0}</span>
                </button>
                <button 
                  onClick={() => setIsPointsModalOpen(true)}
                  className="h-11 rounded-2xl px-3 flex items-center gap-1.5 bg-white/70 backdrop-blur-sm shadow-sm hover:bg-white/80 transition-colors"
                >
                  <span className="text-amber-400">👑</span>
                  <AnimatedCounter value={displayPoints} className="font-bold text-slate-700 text-sm" />
                </button>
              </div>
            </div>
          </header>

          {/* Guest Progress Warning Banner */}
          <GuestProgressBanner />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            {/* Level Badge */}
            <div className="mb-6">
              <LevelBadge totalPoints={profile?.total_points || 0} />
            </div>

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

            {/* Special Chest Progress - Gamified 3D Style */}
            <motion.button
              onClick={() => canClaimChest && setIsChestModalOpen(true)}
              className="w-full max-w-xs mb-6 relative"
              whileTap={canClaimChest ? { scale: 0.98, y: 2 } : undefined}
            >
              {/* 3D Shadow Layer */}
              <div 
                className="absolute inset-0 rounded-2xl"
                style={{ 
                  background: canClaimChest ? "hsl(142 60% 25%)" : "hsl(30 50% 30%)",
                  transform: "translateY(4px)" 
                }}
              />
              
              {/* Main Container */}
              <div 
                className="relative rounded-2xl p-3"
                style={{ 
                  background: canClaimChest 
                    ? "linear-gradient(180deg, hsl(142 50% 45%) 0%, hsl(142 55% 38%) 100%)"
                    : "linear-gradient(180deg, hsl(35 45% 45%) 0%, hsl(30 50% 38%) 100%)"
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <motion.span 
                      className="text-xl"
                      animate={canClaimChest ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : undefined}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      🎁
                    </motion.span>
                    <span className="text-sm font-display font-bold text-white drop-shadow-sm uppercase">სპეციალური სკივრი</span>
                  </div>
                  <div 
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                    style={{ background: "rgba(0,0,0,0.2)" }}
                  >
                    {canClaimChest ? "მზადაა!" : `${chestProgress}/3`}
                  </div>
                </div>
                
                {/* 3D Progress Bar */}
                <div 
                  className="h-4 rounded-lg overflow-hidden relative"
                  style={{ 
                    background: "rgba(0,0,0,0.25)",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)"
                  }}
                >
                  <motion.div 
                    className="h-full rounded-lg relative overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: canClaimChest ? "100%" : `${chestProgressPercent}%` }}
                    transition={{ duration: 0.5 }}
                    style={{ 
                      background: canClaimChest 
                        ? "linear-gradient(180deg, hsl(50 95% 60%) 0%, hsl(45 90% 50%) 50%, hsl(40 85% 45%) 100%)"
                        : "linear-gradient(180deg, hsl(45 95% 65%) 0%, hsl(40 90% 55%) 50%, hsl(35 85% 48%) 100%)"
                    }}
                  >
                    {/* Shine effect */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)"
                      }}
                    />
                  </motion.div>
                  
                  {/* Progress markers */}
                  <div className="absolute inset-0 flex justify-around items-center px-1">
                    {[1, 2, 3].map((i) => (
                      <div 
                        key={i}
                        className={`w-1 h-2/3 rounded-full ${chestProgress >= i || canClaimChest ? 'opacity-0' : 'opacity-30'}`}
                        style={{ background: "rgba(255,255,255,0.5)" }}
                      />
                    ))}
                  </div>
                </div>
                
                {canClaimChest && (
                  <motion.p 
                    className="text-xs font-bold text-white/90 mt-2 text-center"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    შეეხე სკივრის გასახსნელად!
                  </motion.p>
                )}
              </div>
            </motion.button>

          </div>

          {/* Quick Action Row - Moved to bottom */}
          <div className="px-6 pb-6">
            <div className="flex max-w-xs mx-auto justify-between items-start">
              <QuickButton 
                iconSrc={iconWheel}
                label="ბორბალი"
                onClick={() => setIsSpinModalOpen(true)}
              />
              <div className="w-px h-16 self-center" style={{ background: "rgba(30, 41, 59, 0.15)" }} />
              <QuickButton 
                iconSrc={iconVip}
                label="VIP"
                onClick={() => navigate("/vip")}
              />
              <div className="w-px h-16 self-center" style={{ background: "rgba(30, 41, 59, 0.15)" }} />
              <QuickButton 
                iconSrc={iconLeaderboard}
                label="რეიტინგი"
                onClick={() => navigate("/leaderboards")}
              />
              <div className="w-px h-16 self-center" style={{ background: "rgba(30, 41, 59, 0.15)" }} />
              <QuickButton 
                iconSrc={iconMap}
                label="რუქა"
                onClick={() => navigate("/adventure-map")}
              />
            </div>
            
            {/* Scroll indicator */}
            <motion.div 
              className="pt-6 flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="h-5 w-5 text-slate-500" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Second Screen - Categories */}
        <div 
          className="relative z-10 min-h-screen rounded-t-3xl -mt-4"
          style={{
            background: "linear-gradient(180deg, hsl(25 40% 20%) 0%, hsl(20 35% 15%) 100%)"
          }}
        >
          {/* Wood texture overlay */}
          <div 
            className="absolute inset-0 opacity-20 rounded-t-3xl"
            style={{
              backgroundImage: `repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.1) 2px,
                rgba(0,0,0,0.1) 4px
              )`
            }}
          />

          <div className="relative z-10 px-4 py-6 space-y-5">
            {/* Tabs */}
            <div className="overflow-x-auto pb-2 -mx-4 px-4">
              <div className="inline-flex rounded-2xl p-1 bg-amber-900/40 backdrop-blur-sm">
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
                {/* 2-Column Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {featuredItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <FeaturedCard
                        title={item.title}
                        icon={item.icon}
                        index={index}
                        coinCost={10 + index * 5}
                        questionCount={10}
                        progress={{ current: Math.floor(Math.random() * 10), total: 10 }}
                        onClick={() => navigate(`/play/${item.categoryId}/1`)}
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
                {/* 2-Column Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {getCategoriesByType(activeTab).map((cat, i) => (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <CategoryCard
                        name={cat.name}
                        icon={cat.icon}
                        description={cat.description}
                        color={cat.color}
                        progress={getCategoryProgress(cat.id)}
                        totalLevels={cat.totalLevels}
                        isLocked={!isCategoryUnlocked(cat.id)}
                        onClick={() => navigate(`/play/${cat.id}/1`)}
                        index={i}
                        coinCost={10 + i * 5}
                        questionCount={cat.totalLevels}
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
  iconSrc, 
  label,
  onClick,
}: { 
  iconSrc: string; 
  label: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5"
      whileTap={{ scale: 0.95 }}
    >
      <img src={iconSrc} alt={label} className="h-14 w-14 object-contain" />
      <span 
        className="text-sm font-medium text-slate-700 px-2.5 py-0.5 rounded-xl"
        style={{ border: "1.5px solid rgba(30, 41, 59, 0.2)" }}
      >
        {label}
      </span>
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
      className={`relative rounded-xl px-4 py-2 text-sm font-bold transition-all whitespace-nowrap ${
        isActive ? "text-amber-900" : "text-amber-200/70"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="contentTab"
          className="absolute inset-0 rounded-xl bg-amber-100 shadow-md"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
