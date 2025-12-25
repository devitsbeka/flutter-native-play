import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Zap, Map, Trophy, User, Play, Compass, Flame, Star } from "lucide-react";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { useAuth } from "@/hooks/useAuth";
import { getRankFromPoints } from "@/data/opponents";
import { calculateLevel } from "@/utils/levelCalculation";

// Professional gamified theme
const theme = {
  background: "linear-gradient(180deg, #E8D5F0 0%, #F0E0F5 30%, #F5E6F8 60%, #E5D0F0 100%)",
  accent: "#9C6ADE",
  accentDark: "#7B4BBF",
  gold: "#FFD700",
  goldDark: "#B8860B",
};

// Floating particle component
const FloatingParticle = ({ delay, left, size }: { delay: number; left: string; size: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left,
      bottom: "-5%",
      width: size,
      height: size,
      background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(200,180,255,0.4) 60%, transparent 100%)",
      boxShadow: "0 0 10px rgba(255,255,255,0.5)",
    }}
    animate={{
      y: [0, -600 - Math.random() * 200],
      x: [0, (Math.random() - 0.5) * 80],
      opacity: [0, 0.8, 0.6, 0],
      scale: [0.5, 1, 0.7, 0.3],
    }}
    transition={{
      duration: 8 + Math.random() * 4,
      delay,
      repeat: Infinity,
      ease: "easeOut",
    }}
  />
);

// White glass card component
const GlassCard = ({ 
  children, 
  className = "",
  onClick,
}: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
}) => (
  <motion.div
    onClick={onClick}
    className={`relative backdrop-blur-xl rounded-2xl overflow-hidden ${className}`}
    style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
      boxShadow: "0 8px 32px rgba(156,106,222,0.15), 0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)",
    }}
    whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
    whileTap={onClick ? { scale: 0.98 } : undefined}
  >
    {/* Top shine */}
    <div 
      className="absolute top-0 left-0 right-0 h-px"
      style={{ background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,1) 50%, transparent 90%)" }}
    />
    {children}
  </motion.div>
);

// Currency badge
const CurrencyBadge = ({ icon, value, label }: { icon: string; value: number; label: string }) => (
  <GlassCard className="px-4 py-2 flex items-center gap-2">
    <span className="text-xl">{icon}</span>
    <div className="flex flex-col">
      <span className="text-lg font-bold text-gray-800">{value.toLocaleString()}</span>
      <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
    </div>
  </GlassCard>
);

// Side action button
const SideButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  badge,
  color = theme.accent,
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick?: () => void;
  badge?: number;
  color?: string;
}) => (
  <motion.button
    onClick={onClick}
    className="flex flex-col items-center gap-1.5"
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.95 }}
  >
    <div 
      className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.9) 100%)",
        boxShadow: `0 4px 0 rgba(156,106,222,0.2), 0 8px 20px rgba(156,106,222,0.15)`,
      }}
    >
      <Icon className="w-6 h-6" style={{ color }} strokeWidth={2.5} />
      {badge && badge > 0 && (
        <div 
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(180deg, #FF6B6B 0%, #EE5A5A 100%)" }}
        >
          <span className="text-white text-[10px] font-bold">{badge}</span>
        </div>
      )}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider text-white drop-shadow-sm">
      {label}
    </span>
  </motion.button>
);

// Bottom nav item
const NavItem = ({ 
  icon: Icon, 
  label, 
  onClick, 
  isActive = false
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick?: () => void;
  isActive?: boolean;
}) => (
  <motion.button
    onClick={onClick}
    className="flex flex-col items-center gap-1 flex-1 py-2"
    whileTap={{ scale: 0.9 }}
  >
    <Icon 
      className="w-6 h-6" 
      style={{ color: isActive ? theme.accent : "#9CA3AF" }}
      strokeWidth={isActive ? 2.5 : 2}
    />
    <span 
      className="text-[10px] font-bold uppercase tracking-wider"
      style={{ color: isActive ? theme.accent : "#9CA3AF" }}
    >
      {label}
    </span>
  </motion.button>
);

// Play button fire particle
const PlayParticle = ({ angle, delay }: { angle: number; delay: number }) => {
  const radians = (angle * Math.PI) / 180;
  const distance = 50;
  
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: 6,
        height: 6,
        left: "50%",
        top: "50%",
        marginLeft: Math.cos(radians) * distance,
        marginTop: Math.sin(radians) * distance,
        background: "radial-gradient(circle, #FFFFFF 0%, rgba(255,255,255,0.6) 60%, transparent 100%)",
        boxShadow: "0 0 8px rgba(255,255,255,0.8)",
      }}
      animate={{
        opacity: [0, 1, 0.6, 0],
        scale: [0.3, 1.2, 0.6, 0.2],
        y: [0, -25 - Math.random() * 15],
      }}
      transition={{
        duration: 1.8,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
};

export default function Index() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);

  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  // Generate particles
  const particles = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      delay: Math.random() * 8,
      left: `${Math.random() * 100}%`,
      size: 3 + Math.random() * 6,
    })), []
  );

  return (
    <>
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      
      <div className="relative h-screen w-full overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0" style={{ background: theme.background }} />
        
        {/* Subtle pattern overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(156,106,222,0.2) 0%, transparent 50%),
                              radial-gradient(circle at 80% 70%, rgba(156,106,222,0.15) 0%, transparent 40%)`,
          }}
        />
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <FloatingParticle key={p.id} {...p} />
          ))}
        </div>

        {/* ===== TOP BAR ===== */}
        <header className="relative z-20 px-4 pt-4 safe-top">
          <div className="flex items-center justify-between">
            <CurrencyBadge icon="🪙" value={gamesWon * 10} label="Coins" />
            
            {/* Title */}
            <motion.h1 
              className="text-3xl font-bold text-white drop-shadow-lg"
              style={{ 
                fontFamily: "'TASolivare', cursive",
                textShadow: "0 2px 8px rgba(156,106,222,0.5), 0 4px 16px rgba(0,0,0,0.1)"
              }}
            >
              Trivia
            </motion.h1>
            
            <CurrencyBadge icon="💎" value={currentStreak} label="Gems" />
          </div>
        </header>

        {/* ===== LEFT SIDE MENU ===== */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <SideButton icon={ShoppingBag} label="Shop" color="#FF9500" />
          <SideButton icon={Trophy} label="Rank" onClick={() => navigate("/leaderboards")} badge={2} color="#FFD700" />
        </div>

        {/* ===== RIGHT SIDE MENU ===== */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <SideButton icon={Zap} label="Powers" color="#00D4FF" />
          <SideButton icon={Map} label="Map" onClick={() => navigate("/adventure-map")} color="#4ADE80" />
        </div>

        {/* ===== CENTER: AVATAR & LEVEL ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <motion.div 
            className="flex flex-col items-center -mt-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            {/* Avatar container with glow */}
            <motion.div 
              className="relative"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Outer glow ring */}
              <motion.div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)`,
                  transform: "scale(1.3)",
                }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              {/* White ring border */}
              <div 
                className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full p-1.5"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 100%)",
                  boxShadow: "0 8px 32px rgba(156,106,222,0.3), 0 4px 16px rgba(0,0,0,0.1)",
                }}
              >
                {/* Inner shadow ring */}
                <div className="w-full h-full rounded-full p-1 bg-gradient-to-b from-gray-100 to-gray-200">
                  {/* Avatar image */}
                  <div className="w-full h-full rounded-full overflow-hidden">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Your character" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                        <span className="text-6xl">🎮</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Level badge at bottom */}
              <motion.div 
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <div 
                  className="relative px-5 py-1.5 rounded-full"
                  style={{
                    background: "linear-gradient(180deg, #FFE066 0%, #FFD700 50%, #FFA000 100%)",
                    boxShadow: "0 4px 0 #B8860B, 0 6px 16px rgba(255,200,50,0.4)",
                  }}
                >
                  {/* Shine effect */}
                  <div 
                    className="absolute top-0 left-2 right-2 h-2 rounded-full opacity-50"
                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 100%)" }}
                  />
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-800 fill-amber-800" />
                    <span className="text-amber-900 font-bold text-sm">Level {levelInfo.level}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            
            {/* XP Progress section */}
            <motion.div 
              className="mt-10 flex flex-col items-center pointer-events-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <GlassCard className="px-6 py-4 flex flex-col items-center">
                {/* Progress bar */}
                <div className="w-48 mb-2">
                  <div 
                    className="h-3 rounded-full overflow-hidden"
                    style={{ 
                      background: "rgba(156,106,222,0.15)",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    <motion.div 
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        background: `linear-gradient(90deg, ${theme.accent} 0%, #B794F6 100%)`,
                        boxShadow: "0 0 12px rgba(156,106,222,0.5)",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${levelInfo.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    >
                      {/* Animated shine */}
                      <motion.div 
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                        }}
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                      />
                    </motion.div>
                  </div>
                </div>
                
                {/* XP text */}
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-semibold text-gray-700">
                    {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel} XP
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== BOTTOM NAVIGATION ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 safe-bottom">
          <motion.div 
            className="px-4 pb-4 pt-16"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Navigation bar */}
            <GlassCard className="relative flex items-end justify-around py-3 px-6">
              <NavItem icon={Compass} label="Explore" onClick={() => navigate("/discover")} />
              
              {/* Center spacer for play button */}
              <div className="w-20" />
              
              <NavItem icon={User} label="Profile" onClick={() => navigate("/profile")} />
              
              {/* CENTER PLAY BUTTON */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-10 flex flex-col items-center">
                {/* Fire particles */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <PlayParticle key={i} angle={i * 36} delay={i * 0.12} />
                ))}
                
                <motion.button
                  onClick={() => navigate("/game")}
                  className="relative z-10"
                  whileHover={{ scale: 1.08, y: -4 }}
                  whileTap={{ scale: 0.92, y: 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {/* Outer glow */}
                  <motion.div 
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{
                      background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, ${theme.accent}80 50%, transparent 100%)`,
                      transform: "scale(1.8)",
                    }}
                    animate={{ opacity: [0.5, 0.8, 0.5], scale: [1.6, 2, 1.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  
                  {/* Button container */}
                  <div 
                    className="relative w-20 h-20 rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)",
                      boxShadow: `0 6px 0 rgba(156,106,222,0.3), 0 8px 24px rgba(156,106,222,0.4)`,
                    }}
                  >
                    {/* Inner button face */}
                    <div 
                      className="absolute inset-1.5 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(180deg, ${theme.accent} 0%, ${theme.accentDark} 100%)`,
                      }}
                    >
                      {/* Top shine */}
                      <div 
                        className="absolute top-1 left-3 right-3 h-4 rounded-full opacity-40"
                        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 100%)" }}
                      />
                      
                      {/* Play icon */}
                      <Play 
                        className="w-9 h-9 ml-1 relative z-10 text-white" 
                        style={{ 
                          fill: "rgba(255,255,255,0.9)",
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" 
                        }} 
                      />
                    </div>
                  </div>
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </>
  );
}
