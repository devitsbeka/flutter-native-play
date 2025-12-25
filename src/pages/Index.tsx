import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Flame, Star } from "lucide-react";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { useAuth } from "@/hooks/useAuth";
import { calculateLevel } from "@/utils/levelCalculation";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import iconCompass from "@/assets/icons/icon-compass.png";
import iconMap3d from "@/assets/icons/icon-map-3d.png";
import iconTrophy3d from "@/assets/icons/icon-trophy-3d.png";
import iconCoin from "@/assets/icons/icon-coin.png";
import iconGem from "@/assets/icons/icon-gem.png";

// Theme colors (background now comes from global Spline)
const theme = {
  accent: "#9C6ADE",
  accentDark: "#7B4BBF",
};

// Compact currency pill with image icon
const CurrencyPill = ({ iconSrc, value }: { iconSrc: string; value: number }) => (
  <motion.div 
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
    style={{
      background: "rgba(255,255,255,0.95)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
    }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <img src={iconSrc} alt="" className="w-7 h-7 object-contain" />
    <span className="text-base font-bold text-gray-800">{value.toLocaleString()}</span>
  </motion.div>
);

// Side icon button with image (no label)
const SideIconButton = ({ 
  iconSrc, 
  onClick, 
  badge,
}: { 
  iconSrc: string; 
  onClick?: () => void;
  badge?: number;
}) => (
  <motion.button
    onClick={onClick}
    className="relative"
    whileHover={{ scale: 1.1, rotate: 5 }}
    whileTap={{ scale: 0.9 }}
    transition={{ type: "spring", stiffness: 400, damping: 15 }}
  >
    <img src={iconSrc} alt="" className="w-14 h-14 object-contain drop-shadow-lg" />
    {badge && badge > 0 && (
      <motion.div 
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ 
          background: "linear-gradient(180deg, #FF6B6B 0%, #EF4444 100%)",
          boxShadow: "0 2px 4px rgba(239,68,68,0.4)"
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-white text-[10px] font-bold">{badge}</span>
      </motion.div>
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

  return (
    <>
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      
      <div className="relative h-screen w-full overflow-hidden">
        {/* Background and vignette come from GlobalSplineBackground - no local overlay needed */}

        {/* ===== TOP BAR ===== */}
        <header className="relative z-20 px-4 pt-4 safe-top">
          <div className="flex items-center justify-between">
            {/* Burger menu button */}
            <motion.button
              className="text-3xl"
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {/* TODO: open side menu */}}
            >
              🍔
            </motion.button>
            
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
            
            {/* Combined currency chip */}
            <motion.div 
              className="flex items-center gap-3 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-1">
                <img src={iconCoin} alt="" className="w-6 h-6 object-contain" />
                <span className="text-sm font-bold text-gray-800">{(gamesWon * 10).toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1">
                <img src={iconGem} alt="" className="w-6 h-6 object-contain" />
                <span className="text-sm font-bold text-gray-800">{currentStreak}</span>
              </div>
            </motion.div>
          </div>
        </header>

        {/* ===== POWER BADGES ARC (Top) ===== */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
          <div className="relative flex items-end justify-center gap-2">
            {(["fifty-fifty", "freeze", "replace", "time-drain"] as const).map((type, index) => {
              // Arc positioning - middle items higher
              const arcOffset = Math.abs(index - 1.5) * 8;
              return (
                <motion.div
                  key={type}
                  style={{ marginBottom: 16 - arcOffset }}
                  initial={{ scale: 0, y: -20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 200 }}
                >
                  <PowerUpBadge type={type} size="sm" index={index} count={3} />
                </motion.div>
              );
            })}
            {/* Add power button in center-top */}
            <motion.div
              className="absolute -top-2 left-1/2 -translate-x-1/2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
            >
              <PowerUpBadge type="add-power" size="sm" index={5} />
            </motion.div>
          </div>
        </div>

        {/* ===== CENTER: AVATAR & LEVEL ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            {/* Avatar - LARGER */}
            <motion.div 
              className="relative"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* White ring */}
              <div 
                className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full p-1.5"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8F8 100%)",
                  boxShadow: "0 8px 32px rgba(156,106,222,0.25), 0 2px 8px rgba(0,0,0,0.05)",
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
                      <span className="text-7xl">🎮</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Level badge - CENTERED */}
              <motion.div 
                className="absolute -bottom-3 z-20"
                style={{ left: '50%', transform: 'translateX(-50%)' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <div 
                  className="flex items-center justify-center gap-1 px-5 py-2 rounded-full"
                  style={{
                    background: "linear-gradient(180deg, #FFE066 0%, #FFD700 50%, #FFC400 100%)",
                    boxShadow: "0 3px 0 #CC9900, 0 4px 12px rgba(255,200,0,0.3)",
                  }}
                >
                  <Star className="w-5 h-5 text-amber-700 fill-amber-700 flex-shrink-0" />
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">Level</span>
                    <span className="text-xl font-bold text-amber-800">{levelInfo.level}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            
            {/* XP Progress Bar - Chunky with inline text */}
            <motion.div 
              className="mt-10 pointer-events-auto w-64"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {/* Progress bar container */}
              <div 
                className="relative h-9 rounded-full overflow-hidden"
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

        {/* ===== BOTTOM NAVIGATION - 5 items ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 safe-bottom">
          <motion.div 
            className="relative px-4 pb-6"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
          >
            <div className="flex items-end justify-between">
              {/* Explore */}
              <motion.button
                onClick={() => navigate("/discover")}
                className="flex flex-col items-center gap-1"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <img src={iconCompass} alt="Explore" className="w-7 h-7 object-contain" />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-white/70 font-medium">Explore</span>
              </motion.button>

              {/* Map */}
              <motion.button
                onClick={() => navigate("/adventure-map")}
                className="flex flex-col items-center gap-1"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <img src={iconMap3d} alt="Map" className="w-7 h-7 object-contain" />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-white/70 font-medium">Map</span>
              </motion.button>

              {/* Center Play Button - elevated */}
              <div className="mb-4">
                <PlayButton3D onClick={() => navigate("/game")} />
              </div>

              {/* Rank */}
              <motion.button
                onClick={() => navigate("/leaderboards")}
                className="flex flex-col items-center gap-1"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <img src={iconTrophy3d} alt="Rank" className="w-7 h-7 object-contain" />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-white/70 font-medium">Rank</span>
              </motion.button>

              {/* Headphones/Audio */}
              <motion.button
                className="flex flex-col items-center gap-1"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <span className="text-2xl">🎧</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-white/70 font-medium">Sound</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
