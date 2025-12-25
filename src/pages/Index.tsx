import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Zap, Map, Trophy, User, Home, Play, Compass } from "lucide-react";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { useAuth } from "@/hooks/useAuth";
import { getRankFromPoints } from "@/data/opponents";
import { calculateLevel } from "@/utils/levelCalculation";

// Fire sparkle particle component
const FireParticle = ({ delay, duration, left, size, startY }: { delay: number; duration: number; left: string; size: number; startY: string }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left,
      bottom: startY,
      width: size,
      height: size,
      background: `radial-gradient(circle, rgba(255,200,50,0.9) 0%, rgba(255,120,20,0.6) 50%, transparent 100%)`,
      boxShadow: `0 0 ${size * 2}px rgba(255,150,50,0.5)`,
    }}
    animate={{
      y: [0, -400 - Math.random() * 300],
      x: [0, (Math.random() - 0.5) * 100],
      opacity: [0, 0.8, 0.6, 0],
      scale: [0.5, 1, 0.8, 0.3],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeOut",
    }}
  />
);

// Side menu button component
const SideMenuButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  badge
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick?: () => void;
  badge?: number;
}) => (
  <motion.button
    onClick={onClick}
    className="relative flex flex-col items-center gap-1"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <div 
      className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
      style={{
        background: "linear-gradient(180deg, #3a3a4a 0%, #2a2a3a 100%)",
        boxShadow: "0 4px 0 #1a1a2a, 0 6px 10px rgba(0,0,0,0.3)",
      }}
    >
      <Icon className="w-6 h-6 text-white" />
      {badge && badge > 0 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">{badge}</span>
        </div>
      )}
    </div>
    <span className="text-white text-[10px] font-bold uppercase tracking-wide">{label}</span>
  </motion.button>
);

// Currency display component
const CurrencyDisplay = ({ icon, value, color, bgColor }: { icon: string; value: number; color: string; bgColor?: string }) => (
  <div 
    className="h-10 rounded-xl px-4 flex items-center gap-2"
    style={{
      background: bgColor || "linear-gradient(180deg, #3a3a4a 0%, #2a2a3a 100%)",
      boxShadow: bgColor ? "0 3px 0 #B8860B" : "0 3px 0 #1a1a2a",
    }}
  >
    <span className="text-lg">{icon}</span>
    <span className={`font-bold ${color}`}>{value.toLocaleString()}</span>
  </div>
);

// Bottom nav item component - Clean minimal icons (no shapes)
const BottomNavItem = ({ 
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
    {/* Just the icon - no container shape */}
    <Icon 
      className="w-6 h-6" 
      style={{ 
        color: isActive ? "#ffffff" : "rgba(255,255,255,0.5)",
      }}
      strokeWidth={isActive ? 2.5 : 2}
    />
    
    <span 
      className="text-[9px] font-bold uppercase tracking-wide"
      style={{ 
        color: isActive ? "#ffffff" : "rgba(255,255,255,0.5)",
      }}
    >
      {label}
    </span>
  </motion.button>
);

// Fire particle for play button
const PlayButtonParticle = ({ angle, delay }: { angle: number; delay: number }) => {
  const radians = (angle * Math.PI) / 180;
  const distance = 55;
  const x = Math.cos(radians) * distance;
  const y = Math.sin(radians) * distance;
  
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: 4 + Math.random() * 4,
        height: 4 + Math.random() * 4,
        left: "50%",
        top: "50%",
        marginLeft: x,
        marginTop: y,
        background: `radial-gradient(circle, rgba(255,220,80,1) 0%, rgba(255,120,30,0.8) 60%, transparent 100%)`,
        boxShadow: "0 0 8px rgba(255,150,50,0.8)",
      }}
      animate={{
        opacity: [0, 1, 0.8, 0],
        scale: [0.3, 1, 0.6, 0.2],
        y: [0, -30 - Math.random() * 20],
        x: [0, (Math.random() - 0.5) * 20],
      }}
      transition={{
        duration: 1.5 + Math.random() * 0.5,
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

  const rank = profile ? getRankFromPoints(profile.total_points || 0) : { name: "Bronze", tier: 1, color: "text-amber-600" };
  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;

  // Calculate level info
  const levelInfo = calculateLevel(profile?.total_points || 0);

  // Generate particles with stable random values - way more particles
  const particles = useMemo(() => 
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 5,
      left: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 5,
      startY: `${-10 + Math.random() * 40}%`,
    })), []
  );

  return (
    <>
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      
      <div className="relative h-screen w-full overflow-hidden">
        {/* Background - Dark purple gradient matching bottom nav */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center top, #4a3d60 0%, #3d3250 20%, #2a2040 40%, #1a1428 70%, #0f0a14 100%)",
          }}
        />
        
        {/* Secondary gradient overlay for depth */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at bottom, rgba(255,100,50,0.08) 0%, transparent 50%)",
          }}
        />
        
        {/* Fire sparkle particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <FireParticle key={p.id} {...p} />
          ))}
        </div>
        
        {/* Subtle vignette */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)",
          }}
        />

        {/* ===== TOP BAR ===== */}
        <header className="relative z-20 px-4 pt-4 safe-top">
          <div className="flex items-center justify-between">
            {/* Gold Coins - Left */}
            <CurrencyDisplay 
              icon="🪙" 
              value={gamesWon * 10} 
              color="text-amber-900" 
              bgColor="linear-gradient(180deg, #FFD700 0%, #FFA000 100%)"
            />
            
            {/* Title - Center with animated glow */}
            <motion.h1 
              className="text-3xl font-bold relative"
              style={{ 
                fontFamily: "'TASolivare', cursive",
                color: "#FFE55C",
                textShadow: "0 2px 8px rgba(0,0,0,0.5), 0 0 30px rgba(255,200,50,0.5), 0 0 60px rgba(255,150,50,0.3)"
              }}
              animate={{
                textShadow: [
                  "0 2px 8px rgba(0,0,0,0.5), 0 0 30px rgba(255,200,50,0.5), 0 0 60px rgba(255,150,50,0.3)",
                  "0 2px 8px rgba(0,0,0,0.5), 0 0 40px rgba(255,200,50,0.7), 0 0 80px rgba(255,150,50,0.5)",
                  "0 2px 8px rgba(0,0,0,0.5), 0 0 30px rgba(255,200,50,0.5), 0 0 60px rgba(255,150,50,0.3)",
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              My Trivia
            </motion.h1>
            
            {/* Diamonds - Right */}
            <CurrencyDisplay 
              icon="💎" 
              value={currentStreak} 
              color="text-cyan-400"
            />
          </div>
        </header>

        {/* ===== LEFT SIDE MENU ===== */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <SideMenuButton icon={ShoppingBag} label="Shop" onClick={() => {}} />
          <SideMenuButton icon={Trophy} label="Rank" onClick={() => navigate("/leaderboards")} badge={2} />
        </div>

        {/* ===== RIGHT SIDE MENU ===== */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <SideMenuButton icon={Zap} label="Powers" onClick={() => {}} />
          <SideMenuButton icon={Map} label="Map" onClick={() => navigate("/adventure-map")} />
        </div>

        {/* ===== CENTER: CHARACTER/AVATAR DISPLAY ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            {/* Avatar with level badge on top */}
            <motion.div 
              className="relative"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Shadow underneath */}
              <div 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-8 rounded-[50%] bg-black/30 blur-md"
                style={{ transform: "translateX(-50%) translateY(20px)" }}
              />
              
              {/* Level Badge - positioned at BOTTOM center of avatar */}
              <motion.div 
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {/* Outer glow */}
                <motion.div 
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{ background: "radial-gradient(circle, rgba(255,200,50,0.6) 0%, transparent 70%)" }}
                  animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Gold ring */}
                <div 
                  className="relative w-14 h-14 rounded-full p-[3px]"
                  style={{
                    background: "linear-gradient(180deg, #FFE066 0%, #FFD700 30%, #B8860B 70%, #8B4513 100%)",
                    boxShadow: "0 4px 0 #5a3000, 0 6px 20px rgba(255,150,50,0.6)",
                  }}
                >
                  {/* Inner dark circle */}
                  <div 
                    className="w-full h-full rounded-full flex flex-col items-center justify-center"
                    style={{
                      background: "linear-gradient(180deg, #3d3250 0%, #2a2040 100%)",
                    }}
                  >
                    <span 
                      className="text-lg font-black"
                      style={{ 
                        color: "#FFE55C",
                        textShadow: "0 0 12px rgba(255,200,50,1), 0 2px 4px rgba(0,0,0,0.5)"
                      }}
                    >
                      {levelInfo.level}
                    </span>
                  </div>
                </div>
              </motion.div>
              
              {/* Circular Avatar Image */}
              <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Your character" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-7xl">🎮</span>
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* XP Progress bar - Below Avatar */}
            <motion.div 
              className="mt-6 flex flex-col items-center pointer-events-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Level label */}
              <span 
                className="text-sm font-bold uppercase tracking-widest mb-2"
                style={{ 
                  color: "#FFE55C",
                  textShadow: "0 0 10px rgba(255,200,50,0.8), 0 2px 4px rgba(0,0,0,0.8)"
                }}
              >
                Level {levelInfo.level}
              </span>
              
              {/* XP Progress bar */}
              <div className="w-40">
                <div 
                  className="h-2.5 rounded-full overflow-hidden border border-white/10"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                >
                  <motion.div 
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #FFD700 0%, #FF9500 100%)",
                      boxShadow: "0 0 10px rgba(255,200,50,0.8)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${levelInfo.progress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <p 
                  className="text-center text-xs mt-1.5 font-medium"
                  style={{ 
                    color: "rgba(255,255,255,0.8)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)"
                  }}
                >
                  {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel} XP
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== BOTTOM NAVIGATION BAR ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 safe-bottom">
          <motion.div 
            className="px-3 pb-3 pt-14"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Outer decorative frame with multiple layers */}
            <div className="relative">
              {/* Outermost gold glow */}
              <div 
                className="absolute -inset-1 rounded-[32px] blur-sm opacity-40"
                style={{ background: "linear-gradient(180deg, #FFD700 0%, #996600 100%)" }}
              />
              
              {/* Gold border accent - top lighter, bottom darker */}
              <div 
                className="absolute -inset-[3px] rounded-[30px]"
                style={{
                  background: "linear-gradient(180deg, #FFE066 0%, #FFD700 20%, #B8860B 60%, #664400 100%)",
                  boxShadow: "0 4px 0 #332200",
                }}
              />
              
              {/* Inner dark border */}
              <div 
                className="absolute -inset-[1px] rounded-[28px]"
                style={{
                  background: "linear-gradient(180deg, #3d3250 0%, #1a1020 100%)",
                }}
              />
              
              {/* Main container with rich gradient */}
              <div 
                className="relative flex items-end justify-around rounded-[26px] py-3 px-4"
                style={{
                  background: "linear-gradient(180deg, #4a3d60 0%, #3d3250 20%, #2a2040 50%, #1a1428 80%, #0f0a14 100%)",
                  boxShadow: "inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -2px 8px rgba(0,0,0,0.4)",
                }}
              >
                {/* Top highlight shine */}
                <div 
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.3) 80%, transparent 100%)" }}
                />
                
                {/* Secondary inner glow at top */}
                <div 
                  className="absolute top-1 left-8 right-8 h-4 rounded-full opacity-20 blur-sm"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)" }}
                />
                
                {/* Gold accent line at bottom */}
                <div 
                  className="absolute bottom-0 left-6 right-6 h-[1px] opacity-40"
                  style={{ background: "linear-gradient(90deg, transparent 0%, #FFD700 30%, #FFD700 70%, transparent 100%)" }}
                />
                
                {/* Subtle texture overlay */}
                <div 
                  className="absolute inset-0 opacity-5 pointer-events-none rounded-[26px]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M20 20h1v1h-1z'/%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                />
                
                {/* Explore */}
                <BottomNavItem icon={Compass} label="Explore" onClick={() => navigate("/discover")} />
                
                {/* Spacer for Play button */}
                <div className="w-24" />
                
                {/* Profile */}
                <BottomNavItem icon={User} label="Profile" onClick={() => navigate("/profile")} />
              </div>
              
              {/* CENTER PLAY BUTTON - simplified and fiery */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-8 flex flex-col items-center">
                {/* Fire particles around the button */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <PlayButtonParticle key={i} angle={i * 30} delay={i * 0.15} />
                ))}
                
                <motion.button
                  onClick={() => navigate("/game")}
                  className="relative z-10"
                  whileHover={{ scale: 1.1, y: -4 }}
                  whileTap={{ scale: 0.92, y: 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {/* Animated outer glow - burning hot effect */}
                  <motion.div 
                    className="absolute inset-0 rounded-full blur-2xl"
                    style={{
                      background: "radial-gradient(circle, #FFD700 0%, #FF6B00 50%, transparent 100%)",
                      transform: "scale(2)",
                    }}
                    animate={{ opacity: [0.5, 0.8, 0.5], scale: [1.8, 2.2, 1.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  
                  {/* Secondary pulse glow */}
                  <motion.div 
                    className="absolute inset-0 rounded-full blur-lg"
                    style={{
                      background: "radial-gradient(circle, #FFF 0%, #FFE55C 30%, transparent 70%)",
                      transform: "scale(1.4)",
                    }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  
                  {/* Main button - cleaner, simpler */}
                  <div 
                    className="relative w-20 h-20 rounded-full p-1"
                    style={{
                      background: "linear-gradient(180deg, #FFE066 0%, #FFD700 30%, #FF9500 100%)",
                      boxShadow: "0 6px 0 #8B4513, 0 8px 25px rgba(255,107,0,0.8)",
                    }}
                  >
                    {/* Button face */}
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: "linear-gradient(180deg, #FFE88C 0%, #FFD700 40%, #FF9500 100%)",
                      }}
                    >
                      {/* Simple top shine */}
                      <div 
                        className="absolute top-0 left-2 right-2 h-6 rounded-full opacity-60"
                        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 100%)" }}
                      />
                      
                      {/* Play icon */}
                      <Play 
                        className="w-9 h-9 ml-1 relative z-10" 
                        style={{ 
                          color: "#7C3A00",
                          fill: "#8B4513",
                          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" 
                        }} 
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
