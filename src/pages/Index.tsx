import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Zap, Map, Trophy, User, Play, Compass, Flame, Star, Diamond } from "lucide-react";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { useAuth } from "@/hooks/useAuth";
import { calculateLevel } from "@/utils/levelCalculation";

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

// Bottom nav item
const NavItem = ({ 
  icon: Icon, 
  label, 
  onClick, 
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick?: () => void;
}) => (
  <motion.button
    onClick={onClick}
    className="flex flex-col items-center gap-0.5 px-6 py-2"
    whileTap={{ scale: 0.95 }}
  >
    <Icon className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
      {label}
    </span>
  </motion.button>
);

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
            
            {/* XP Progress Card */}
            <motion.div 
              className="mt-8 pointer-events-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div 
                className="px-5 py-3 rounded-2xl flex flex-col items-center"
                style={{
                  background: "rgba(255,255,255,0.95)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                }}
              >
                {/* Progress bar */}
                <div className="w-44 mb-2">
                  <div 
                    className="h-2.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(156,106,222,0.12)" }}
                  >
                    <motion.div 
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${theme.accent} 0%, #B794F6 100%)`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${levelInfo.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
                
                {/* XP text */}
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-gray-600">
                    {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel} XP
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== BOTTOM NAVIGATION ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 safe-bottom">
          <motion.div 
            className="px-4 pb-4 pt-10"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Nav bar */}
            <div 
              className="relative flex items-center justify-between rounded-[28px] py-2"
              style={{
                background: "rgba(255,255,255,0.98)",
                boxShadow: "0 -4px 24px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <NavItem icon={Compass} label="Explore" onClick={() => navigate("/discover")} />
              
              {/* Spacer */}
              <div className="w-20" />
              
              <NavItem icon={User} label="Profile" onClick={() => navigate("/profile")} />
              
              {/* CENTER PLAY BUTTON */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-8">
                <motion.button
                  onClick={() => navigate("/game")}
                  className="relative"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95, y: 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {/* Outer glow */}
                  <motion.div 
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{
                      background: `radial-gradient(circle, ${theme.accent}60 0%, transparent 70%)`,
                      transform: "scale(1.6)",
                    }}
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  
                  {/* White outer ring */}
                  <div 
                    className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%)",
                      boxShadow: "0 4px 16px rgba(156,106,222,0.25), 0 2px 6px rgba(0,0,0,0.08)",
                    }}
                  >
                    {/* Purple inner circle */}
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(180deg, #B794F6 0%, ${theme.accent} 100%)`,
                        boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3)`,
                      }}
                    >
                      <Play 
                        className="w-7 h-7 ml-0.5 text-white" 
                        fill="rgba(255,255,255,0.9)"
                      />
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
