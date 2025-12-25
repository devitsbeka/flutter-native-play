import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Zap, Map, Trophy, Play, Flame, Star, Diamond } from "lucide-react";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { useAuth } from "@/hooks/useAuth";
import { calculateLevel } from "@/utils/levelCalculation";
import iconCompass from "@/assets/icons/icon-compass.png";
import iconProfile from "@/assets/icons/icon-profile.png";

// Theme colors
const theme = {
  background: "linear-gradient(180deg, #E8D5F0 0%, #F0E0F5 30%, #F5E6F8 60%, #E5D0F0 100%)",
  accent: "#9C6ADE",
  accentDark: "#7B4BBF",
};

// Floating particle
const FloatingParticle = ({ delay, left, size }: { delay: number; left: string; size: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left,
      bottom: "-5%",
      width: size,
      height: size,
      background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(200,180,255,0.4) 60%, transparent 100%)",
    }}
    animate={{
      y: [0, -600 - Math.random() * 200],
      opacity: [0, 0.7, 0.5, 0],
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

// Compact currency pill
const CurrencyPill = ({ icon: Icon, value, label, iconColor }: { icon: React.ElementType; value: number; label: string; iconColor: string }) => (
  <div 
    className="flex items-center gap-2 px-3 py-2 rounded-2xl"
    style={{
      background: "rgba(255,255,255,0.95)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}
  >
    <div 
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{ background: `${iconColor}15` }}
    >
      <Icon className="w-4 h-4" style={{ color: iconColor }} />
    </div>
    <div className="flex flex-col -space-y-0.5">
      <span className="text-base font-bold text-gray-800 leading-tight">{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-medium">{label}</span>
    </div>
  </div>
);

// Side icon button (no label)
const SideIconButton = ({ 
  icon: Icon, 
  onClick, 
  badge,
  iconColor,
}: { 
  icon: React.ElementType; 
  onClick?: () => void;
  badge?: number;
  iconColor: string;
}) => (
  <motion.button
    onClick={onClick}
    className="relative"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <div 
      className="w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{
        background: "rgba(255,255,255,0.95)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <Icon className="w-6 h-6" style={{ color: iconColor }} strokeWidth={2} />
    </div>
    {badge && badge > 0 && (
      <div 
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: "#EF4444" }}
      >
        <span className="text-white text-[10px] font-bold">{badge}</span>
      </div>
    )}
  </motion.button>
);

// Sparkle particle for play button
const SparkleParticle = ({ index, total }: { index: number; total: number }) => {
  const angle = (360 / total) * index;
  const radius = 52;
  const duration = 3 + Math.random() * 2;
  const size = 3 + Math.random() * 3;
  
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
        background: "radial-gradient(circle, #FFFFFF 0%, rgba(183,148,246,0.8) 50%, transparent 100%)",
        boxShadow: "0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(183,148,246,0.6)",
      }}
      animate={{
        x: [
          Math.cos((angle * Math.PI) / 180) * radius,
          Math.cos(((angle + 120) * Math.PI) / 180) * (radius + 8),
          Math.cos(((angle + 240) * Math.PI) / 180) * radius,
          Math.cos(((angle + 360) * Math.PI) / 180) * radius,
        ],
        y: [
          Math.sin((angle * Math.PI) / 180) * radius,
          Math.sin(((angle + 120) * Math.PI) / 180) * (radius + 8),
          Math.sin(((angle + 240) * Math.PI) / 180) * radius,
          Math.sin(((angle + 360) * Math.PI) / 180) * radius,
        ],
        opacity: [0.4, 1, 0.6, 0.4],
        scale: [0.8, 1.2, 0.9, 0.8],
      }}
      transition={{
        duration,
        delay: index * 0.15,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

// Bottom nav item - using image icons
const NavItem = ({ 
  iconSrc, 
  label, 
  onClick, 
}: { 
  iconSrc: string; 
  label: string; 
  onClick?: () => void;
}) => (
  <motion.button
    onClick={onClick}
    className="flex flex-col items-center gap-0.5 py-1"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.92 }}
  >
    <img src={iconSrc} alt={label} className="w-9 h-9 object-contain" />
    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">
      {label}
    </span>
  </motion.button>
);

// 3D Play Button Component
const PlayButton3D = ({ onClick }: { onClick: () => void }) => {
  const sparkles = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);
  
  return (
    <motion.button
      onClick={onClick}
      className="relative"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95, y: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* Sparkle particles */}
      {sparkles.map((i) => (
        <SparkleParticle key={i} index={i} total={sparkles.length} />
      ))}
      
      {/* Outer glow pulse */}
      <motion.div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(183,148,246,0.5) 0%, transparent 70%)",
          transform: "scale(2)",
          filter: "blur(10px)",
        }}
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
          scale: [1.8, 2.2, 1.8],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Base shadow (3D depth) */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "#7B4BBF",
          transform: "translateY(6px)",
          boxShadow: "0 8px 20px rgba(123,75,191,0.4)",
        }}
      />
      
      {/* Outer white ring with gradient */}
      <div 
        className="relative w-20 h-20 rounded-full p-[3px]"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #E8E0F0 100%)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,1)",
        }}
      >
        {/* Purple main button */}
        <div 
          className="w-full h-full rounded-full relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #C4A7F7 0%, #9C6ADE 40%, #8B5CD6 100%)",
            boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.25)",
          }}
        >
          {/* Inner highlight arc */}
          <div 
            className="absolute top-1 left-2 right-2 h-6 rounded-full"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)",
            }}
          />
          
          {/* Play icon container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Play 
                className="w-8 h-8 ml-1 drop-shadow-sm" 
                style={{ color: "white" }}
                fill="rgba(255,255,255,0.95)"
                strokeWidth={0}
              />
            </motion.div>
          </div>
          
          {/* Subtle shine overlay */}
          <motion.div 
            className="absolute inset-0 rounded-full opacity-0"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)",
            }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </div>
    </motion.button>
  );
};

export default function Index() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);

  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  const particles = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      delay: Math.random() * 8,
      left: `${Math.random() * 100}%`,
      size: 3 + Math.random() * 5,
    })), []
  );

  return (
    <>
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      
      <div className="relative h-screen w-full overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0" style={{ background: theme.background }} />
        
        {/* Subtle radial accents */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(156,106,222,0.15) 0%, transparent 50%),
                              radial-gradient(circle at 80% 70%, rgba(156,106,222,0.1) 0%, transparent 40%)`,
          }}
        />
        
        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <FloatingParticle key={p.id} {...p} />
          ))}
        </div>

        {/* ===== TOP BAR ===== */}
        <header className="relative z-20 px-4 pt-4 safe-top">
          <div className="flex items-center justify-between">
            <CurrencyPill icon={Diamond} value={gamesWon * 10} label="Coins" iconColor="#6B7280" />
            
            <motion.h1 
              className="text-3xl font-bold"
              style={{ 
                fontFamily: "'TASolivare', cursive",
                color: "rgba(255,255,255,0.95)",
                textShadow: "0 2px 8px rgba(156,106,222,0.4)"
              }}
            >
              Trivia
            </motion.h1>
            
            <CurrencyPill icon={Diamond} value={currentStreak} label="Gems" iconColor="#60A5FA" />
          </div>
        </header>

        {/* ===== LEFT SIDE ===== */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <SideIconButton icon={ShoppingBag} iconColor="#F59E0B" />
          <SideIconButton icon={Trophy} onClick={() => navigate("/leaderboards")} badge={2} iconColor="#FBBF24" />
        </div>

        {/* ===== RIGHT SIDE ===== */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <SideIconButton icon={Zap} iconColor="#3B82F6" />
          <SideIconButton icon={Map} onClick={() => navigate("/adventure-map")} iconColor="#22C55E" />
        </div>

        {/* ===== CENTER: AVATAR & LEVEL ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            {/* Avatar */}
            <motion.div 
              className="relative"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* White ring */}
              <div 
                className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full p-1"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8F8 100%)",
                  boxShadow: "0 8px 32px rgba(156,106,222,0.2), 0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                      <span className="text-6xl">🎮</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Level badge */}
              <motion.div 
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <div 
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full"
                  style={{
                    background: "linear-gradient(180deg, #FFE066 0%, #FFD700 50%, #FFC400 100%)",
                    boxShadow: "0 3px 0 #CC9900, 0 4px 12px rgba(255,200,0,0.3)",
                  }}
                >
                  <Star className="w-3.5 h-3.5 text-amber-700 fill-amber-700" />
                  <div className="flex flex-col items-center -space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold leading-tight">Level</span>
                    <span className="text-base font-bold text-amber-800 leading-tight">{levelInfo.level}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            
            {/* XP Progress Bar - Chunky with inline text */}
            <motion.div 
              className="mt-8 pointer-events-auto w-56"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {/* Progress bar container */}
              <div 
                className="relative h-8 rounded-full overflow-hidden"
                style={{ 
                  background: "rgba(156,106,222,0.15)",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.08)",
                }}
              >
                {/* Progress fill */}
                <motion.div 
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${theme.accent} 0%, #B794F6 100%)`,
                    boxShadow: "inset 0 2px 4px rgba(255,255,255,0.2)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
                
                {/* XP text - dark version (visible on unfilled part) */}
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-gray-600">
                    {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel} XP
                  </span>
                </div>
                
                {/* XP text - light version (visible on filled part via clip) */}
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none"
                  initial={{ clipPath: "inset(0 100% 0 0)" }}
                  animate={{ clipPath: `inset(0 ${100 - levelInfo.progress}% 0 0)` }}
                  transition={{ duration: 1, delay: 0.5 }}
                >
                  <Flame className="w-4 h-4 text-white/90" />
                  <span className="text-sm font-bold text-white">
                    {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel} XP
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== BOTTOM NAVIGATION ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 safe-bottom">
          <motion.div 
            className="px-4 pb-3 pt-12"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Nav bar container */}
            <div 
              className="relative rounded-[24px] py-2 px-6"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,255,0.95) 100%)",
                boxShadow: "0 -2px 20px rgba(156,106,222,0.08), 0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)",
                border: "1px solid rgba(255,255,255,0.8)",
              }}
            >
              {/* Top shine line */}
              <div 
                className="absolute top-0 left-6 right-6 h-[1px]"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.9) 70%, transparent 100%)",
                }}
              />
              
              {/* Nav items - flex with centered items */}
              <div className="flex items-center justify-between">
                {/* Left item */}
                <div className="flex-1 flex justify-center">
                  <NavItem iconSrc={iconCompass} label="Explore" onClick={() => navigate("/discover")} />
                </div>
                
                {/* Spacer for play button */}
                <div className="w-20" />
                
                {/* Right item */}
                <div className="flex-1 flex justify-center">
                  <NavItem iconSrc={iconProfile} label="Profile" onClick={() => navigate("/profile")} />
                </div>
              </div>
              
              {/* CENTER PLAY BUTTON */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-10">
                <PlayButton3D onClick={() => navigate("/game")} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
