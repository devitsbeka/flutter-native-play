import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, ShoppingBag, Users, Trophy, Shield, Info, Flame } from "lucide-react";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/shared/Avatar";
import { getRankFromPoints } from "@/data/opponents";

// Side menu button component
const SideMenuButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  badge,
  position = "left"
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick?: () => void;
  badge?: number;
  position?: "left" | "right";
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
const CurrencyDisplay = ({ icon, value, color }: { icon: string; value: number; color: string }) => (
  <div 
    className="h-10 rounded-xl px-3 flex items-center gap-2"
    style={{
      background: "linear-gradient(180deg, #3a3a4a 0%, #2a2a3a 100%)",
      boxShadow: "0 3px 0 #1a1a2a",
    }}
  >
    <span className="text-lg">{icon}</span>
    <span className={`font-bold ${color}`}>{value.toLocaleString()}</span>
  </div>
);

export default function Index() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);

  const rank = profile ? getRankFromPoints(profile.total_points || 0) : { name: "Bronze", tier: 1, color: "text-amber-600" };
  const totalPoints = profile?.total_points || 0;
  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;

  return (
    <>
      <SideMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
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
          <div className="flex items-center justify-between">
            {/* Left: Player Info */}
            <div className="flex items-center gap-2">
              {/* Avatar with name */}
              <button 
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 rounded-2xl pr-3 pl-1 py-1"
                style={{
                  background: "linear-gradient(180deg, #3a3a4a 0%, #2a2a3a 100%)",
                  boxShadow: "0 3px 0 #1a1a2a",
                }}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-700 flex items-center justify-center">
                  <Avatar
                    imageUrl={profile?.avatar_url || undefined}
                    emoji="👤"
                    size="sm"
                  />
                </div>
                <span className="text-white text-xs font-bold max-w-[80px] truncate">
                  {profile?.nickname || "Player"}
                </span>
              </button>

              {/* Trophy count */}
              <div 
                className="h-10 rounded-xl px-3 flex items-center gap-1.5"
                style={{
                  background: "linear-gradient(180deg, #FFD700 0%, #FFA000 100%)",
                  boxShadow: "0 3px 0 #B8860B",
                }}
              >
                <Trophy className="w-5 h-5 text-amber-900" />
                <span className="font-bold text-amber-900">{totalPoints}</span>
              </div>

              {/* XP Progress bar placeholder */}
              <div className="hidden sm:block w-24 h-3 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-500"
                  style={{ width: `${Math.min((totalPoints % 100), 100)}%` }}
                />
              </div>
            </div>

            {/* Right: Currencies and Menu */}
            <div className="flex items-center gap-2">
              <CurrencyDisplay icon="🪙" value={gamesWon * 10} color="text-yellow-400" />
              <CurrencyDisplay icon="💎" value={currentStreak} color="text-cyan-400" />
              
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(180deg, #3a3a4a 0%, #2a2a3a 100%)",
                  boxShadow: "0 3px 0 #1a1a2a",
                }}
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </header>

        {/* ===== LEFT SIDE MENU ===== */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <SideMenuButton icon={ShoppingBag} label="Shop" onClick={() => {}} />
          <SideMenuButton icon={Trophy} label="Categories" onClick={() => navigate("/discover")} badge={2} />
        </div>

        {/* ===== RIGHT SIDE MENU ===== */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <SideMenuButton icon={Users} label="Friends" onClick={() => navigate("/leaderboards")} position="right" />
          <SideMenuButton icon={Shield} label="Club" onClick={() => navigate("/team")} position="right" />
        </div>

        {/* ===== CENTER: CHARACTER/AVATAR DISPLAY ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            {/* Rank Badge */}
            <motion.div 
              className="flex items-center gap-2 mb-4 px-4 py-2 rounded-full"
              style={{
                background: "linear-gradient(180deg, #5a3a1a 0%, #4a2a0a 100%)",
                boxShadow: "0 3px 0 #3a1a00, 0 6px 15px rgba(0,0,0,0.3)",
              }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-600 rounded-lg">
                <span className="text-white text-xs font-bold">RANK</span>
                <span className="text-yellow-300 font-black">{Math.floor(totalPoints / 1000) + 1}</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-bold">{totalPoints}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-600 rounded-lg">
                <span className="text-white text-xs font-bold">POWER</span>
                <span className="text-white font-black">{Math.min(10, Math.floor(gamesWon / 5) + 1)}</span>
              </div>
            </motion.div>

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

        {/* ===== BOTTOM: GAME MODE & PLAY BUTTON ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 safe-bottom">
          {/* Pass/Progress Bar (like Brawl Pass) */}
          <motion.div 
            className="mb-4 mx-auto max-w-md"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div 
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: "linear-gradient(180deg, #FFD700 0%, #FFA000 100%)",
                boxShadow: "0 4px 0 #B8860B",
              }}
            >
              <div className="w-10 h-10 bg-amber-900/30 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-amber-900" />
              </div>
              <div className="flex-1">
                <p className="text-amber-900 font-black text-sm uppercase">Quiz Pass</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-amber-900/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-900"
                      style={{ width: `${Math.min(((gamesWon % 10) / 10) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-amber-900 text-xs font-bold">{gamesWon % 10}/10</span>
                </div>
              </div>
              {gamesWon > 0 && (
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{Math.floor(gamesWon / 10)}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Game Mode Selector + Play Button */}
          <motion.div 
            className="flex gap-3 max-w-md mx-auto"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {/* Game Mode Card */}
            <div 
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: "linear-gradient(180deg, #3a3a4a 0%, #2a2a3a 100%)",
                boxShadow: "0 4px 0 #1a1a2a",
              }}
            >
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🌍</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">⭐</span>
                  <span className="text-white font-black uppercase">World Quiz</span>
                </div>
                <p className="text-purple-400 text-sm">Random Topics</p>
              </div>
              <button className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <Info className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* PLAY Button */}
            <motion.button
              onClick={() => navigate("/game")}
              className="px-8 py-4 rounded-2xl font-black text-xl uppercase tracking-wider"
              style={{
                background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 30%, #FFA000 100%)",
                boxShadow: "0 6px 0 #B8860B, 0 8px 20px rgba(0,0,0,0.3)",
                color: "#5C4A00",
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98, y: 4 }}
            >
              PLAY
            </motion.button>
          </motion.div>

          {/* Event Timer */}
          <p className="text-center text-white/50 text-xs mt-3">
            New Event in: 9h 18m
          </p>
        </div>
      </div>
    </>
  );
}
