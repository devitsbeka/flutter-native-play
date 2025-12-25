import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Info } from "lucide-react";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { useAuth } from "@/hooks/useAuth";
import { getRankFromPoints } from "@/data/opponents";

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
          <div className="flex items-center justify-center gap-3">
            {/* Trophy count */}
            <div 
              className="h-10 rounded-xl px-4 flex items-center gap-2"
              style={{
                background: "linear-gradient(180deg, #FFD700 0%, #FFA000 100%)",
                boxShadow: "0 3px 0 #B8860B",
              }}
            >
              <Trophy className="w-5 h-5 text-amber-900" />
              <span className="font-bold text-amber-900">{totalPoints}</span>
            </div>

            {/* Coins */}
            <CurrencyDisplay icon="🪙" value={gamesWon * 10} color="text-yellow-400" />
            
            {/* Gems */}
            <CurrencyDisplay icon="💎" value={currentStreak} color="text-cyan-400" />
          </div>
        </header>

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

        {/* ===== BOTTOM: GAME MODE & PLAY BUTTON ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 safe-bottom">
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
