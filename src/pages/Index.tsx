import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Zap, Map, Trophy, User, Home, Play, Compass } from "lucide-react";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { useAuth } from "@/hooks/useAuth";
import { getRankFromPoints } from "@/data/opponents";

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

// Bottom nav item component - Game quality design
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
    className="flex flex-col items-center gap-0.5 flex-1 relative"
    whileTap={{ scale: 0.9 }}
  >
    {/* Icon container */}
    <div className="relative">
      {/* Subtle glow for active */}
      {isActive && (
        <div 
          className="absolute inset-0 rounded-2xl blur-lg opacity-40"
          style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}
        />
      )}
      
      <div 
        className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{
          background: isActive 
            ? "linear-gradient(180deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)"
            : "linear-gradient(180deg, #4a4a5a 0%, #3a3a4a 50%, #2a2a3a 100%)",
          boxShadow: isActive 
            ? "0 3px 0 #b0b0b0, inset 0 1px 0 rgba(255,255,255,1), 0 0 12px rgba(255,255,255,0.3)"
            : "0 3px 0 #1a1a2a, inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* Inner highlight */}
        <div 
          className="absolute top-1 left-1 right-1 h-3 rounded-t-xl opacity-30"
          style={{ background: "linear-gradient(180deg, white 0%, transparent 100%)" }}
        />
        <Icon className={`w-6 h-6 relative z-10 ${isActive ? "text-gray-800" : "text-white/80"}`} />
      </div>
    </div>
    
    <span 
      className="text-[9px] font-black uppercase tracking-wide mt-1"
      style={{ 
        color: isActive ? "#ffffff" : "rgba(255,255,255,0.6)",
        textShadow: isActive ? "0 0 8px rgba(255,255,255,0.5)" : "none"
      }}
    >
      {label}
    </span>
  </motion.button>
);

export default function Index() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);

  const rank = profile ? getRankFromPoints(profile.total_points || 0) : { name: "Bronze", tier: 1, color: "text-amber-600" };
  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;

  return (
    <>
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      
      <div className="relative h-screen w-full overflow-hidden">
        {/* Background - Bright blue gradient like Brawl Stars */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, #4FC3F7 0%, #29B6F6 30%, #0288D1 70%, #01579B 100%)",
          }}
        />
        
        {/* Subtle pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* ===== TOP BAR ===== */}
        <header className="relative z-20 px-4 pt-4 safe-top">
          <div className="flex items-center justify-center gap-3">
            {/* Gold Coins */}
            <CurrencyDisplay 
              icon="🪙" 
              value={gamesWon * 10} 
              color="text-amber-900" 
              bgColor="linear-gradient(180deg, #FFD700 0%, #FFA000 100%)"
            />
            
            {/* Diamonds */}
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
          <SideMenuButton icon={Trophy} label="Categories" onClick={() => navigate("/discover")} badge={2} />
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
            {/* Large Avatar Display */}
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
              
              {/* Avatar Image */}
              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Your character" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-8xl">🎮</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== BOTTOM NAVIGATION BAR ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 safe-bottom">
          <motion.div 
            className="px-3 pb-3 pt-2"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Outer decorative frame */}
            <div className="relative">
              {/* Gold border accent */}
              <div 
                className="absolute -inset-[2px] rounded-[28px] opacity-60"
                style={{
                  background: "linear-gradient(180deg, #FFD700 0%, #996600 50%, #332200 100%)",
                }}
              />
              
              {/* Main container */}
              <div 
                className="relative flex items-end justify-around rounded-[26px] py-3 px-3"
                style={{
                  background: "linear-gradient(180deg, #3d3250 0%, #2a2040 40%, #1a1428 100%)",
                  boxShadow: "inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)",
                }}
              >
                {/* Top shine */}
                <div 
                  className="absolute top-0 left-4 right-4 h-[1px] opacity-30"
                  style={{ background: "linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)" }}
                />
                
                {/* Home */}
                <BottomNavItem icon={Home} label="Home" onClick={() => {}} isActive />
                
                {/* Explore */}
                <BottomNavItem icon={Compass} label="Explore" onClick={() => navigate("/discover")} />
                
                {/* CENTER PLAY BUTTON */}
                <div className="flex flex-col items-center -mt-12 relative">
                  {/* Outermost decorative ring */}
                  <div 
                    className="absolute top-0 w-28 h-28 rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #FFE066 0%, #B8860B 50%, #553300 100%)",
                      boxShadow: "0 5px 0 #3d2200, inset 0 2px 0 rgba(255,255,255,0.3)",
                    }}
                  />
                  {/* Inner dark ring */}
                  <div 
                    className="absolute top-1 w-[104px] h-[104px] rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #2a2040 0%, #1a1428 100%)",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
                    }}
                  />
                  {/* Second gold accent ring */}
                  <div 
                    className="absolute top-2.5 w-[96px] h-[96px] rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #FFD700 0%, #996600 100%)",
                    }}
                  />
                  <div 
                    className="absolute top-3 w-[90px] h-[90px] rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #1a1428 0%, #0f0a14 100%)",
                    }}
                  />
                  
                  <motion.button
                    onClick={() => navigate("/game")}
                    className="relative z-10 mt-1"
                    whileHover={{ scale: 1.08, y: -4 }}
                    whileTap={{ scale: 0.95, y: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    {/* Animated outer glow */}
                    <motion.div 
                      className="absolute inset-0 rounded-full blur-2xl"
                      style={{
                        background: "radial-gradient(circle, #FFD700 0%, #FF6B00 50%, transparent 100%)",
                        transform: "scale(1.8)",
                      }}
                      animate={{ opacity: [0.4, 0.7, 0.4], scale: [1.6, 1.8, 1.6] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    
                    {/* Secondary pulse glow */}
                    <motion.div 
                      className="absolute inset-0 rounded-full blur-md"
                      style={{
                        background: "radial-gradient(circle, #FFE55C 0%, transparent 70%)",
                        transform: "scale(1.3)",
                      }}
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    
                    {/* Outer bezel ring */}
                    <div 
                      className="relative w-[82px] h-[82px] rounded-full p-[3px]"
                      style={{
                        background: "linear-gradient(180deg, #FFE88C 0%, #FFD700 20%, #CC7000 80%, #8B4513 100%)",
                        boxShadow: "0 8px 0 #5a3000, 0 10px 30px rgba(255,107,0,0.7), inset 0 2px 0 rgba(255,255,255,0.5)",
                      }}
                    >
                      {/* Inner shadow ring */}
                      <div 
                        className="w-full h-full rounded-full p-[2px]"
                        style={{
                          background: "linear-gradient(180deg, #AA5500 0%, #663300 100%)",
                        }}
                      >
                        {/* Main button face */}
                        <div 
                          className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                          style={{
                            background: "linear-gradient(180deg, #FFE88C 0%, #FFD700 25%, #FFB800 50%, #FF9500 75%, #FF6B00 100%)",
                          }}
                        >
                          {/* Top shine highlight */}
                          <div 
                            className="absolute top-0 left-3 right-3 h-8 rounded-full"
                            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)" }}
                          />
                          
                          {/* Side highlights */}
                          <div 
                            className="absolute top-4 left-1 w-2 h-10 rounded-full opacity-40"
                            style={{ background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)" }}
                          />
                          <div 
                            className="absolute top-4 right-1 w-2 h-10 rounded-full opacity-30"
                            style={{ background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)" }}
                          />
                          
                          {/* Bottom ambient */}
                          <div 
                            className="absolute bottom-1 left-4 right-4 h-3 rounded-full opacity-30"
                            style={{ background: "linear-gradient(180deg, transparent 0%, rgba(139,69,19,0.5) 100%)" }}
                          />
                          
                          {/* Play icon with shadow */}
                          <div className="relative">
                            <Play className="w-10 h-10 text-amber-950 fill-amber-900 ml-1 relative z-10" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                  
                  <span 
                    className="font-black text-[11px] mt-3 uppercase tracking-wider"
                    style={{ 
                      color: "#FFD700", 
                      textShadow: "0 0 10px rgba(255,200,0,0.8), 0 2px 4px rgba(0,0,0,0.5)" 
                    }}
                  >
                    Play
                  </span>
                </div>
                
                {/* Rank */}
                <BottomNavItem icon={Trophy} label="Rank" onClick={() => navigate("/leaderboards")} />
                
                {/* Profile */}
                <BottomNavItem icon={User} label="Profile" onClick={() => navigate("/profile")} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
