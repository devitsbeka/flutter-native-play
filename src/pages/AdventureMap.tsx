import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { IslandAdventureMap } from "@/components/map/IslandAdventureMap";
import { t } from "@/lib/i18n";
import { LottieNavIcon } from "@/components/layout/LottieNavIcon";

export default function AdventureMap() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      <IslandAdventureMap />
      
      {/* Bottom Navigation with whitish mask */}
      <div className="fixed bottom-0 left-0 right-0 z-20 safe-bottom">
        {/* Smooth gradient fade layer */}
        <div 
          className="absolute left-0 right-0 bottom-0 pointer-events-none"
          style={{
            height: "180px",
            background: "linear-gradient(to top, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 25%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 70%, transparent 100%)",
          }}
        />
        {/* Frosted glass backing */}
        <div 
          className="absolute left-0 right-0 bottom-0 pointer-events-none"
          style={{
            height: "100px",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            background: "linear-gradient(to top, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)",
          }}
        />
        
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
              <div className="flex items-center justify-center">
                <LottieNavIcon type="explore" size={52} />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold drop-shadow-sm">{t("nav.explore")}</span>
            </motion.button>

            {/* Map (active) */}
            <motion.button
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.1, y: -3 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="flex items-center justify-center">
                <LottieNavIcon type="map" size={52} isActive />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold drop-shadow-sm">{t("nav.map")}</span>
            </motion.button>

            {/* Center Home Button - replaces Play */}
            <div className="mb-4">
              <motion.button
                onClick={() => navigate("/")}
                className="relative"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95, y: 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
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
                    className="w-full h-full rounded-full relative overflow-hidden flex items-center justify-center"
                    style={{
                      background: "linear-gradient(180deg, #C4A7F7 0%, #9C6ADE 40%, #8B5CD6 100%)",
                      boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.25)",
                    }}
                  >
                    <Home 
                      className="w-9 h-9 drop-shadow-sm" 
                      style={{ color: "white" }}
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
              </motion.button>
            </div>

            {/* Rank */}
            <motion.button
              onClick={() => navigate("/leaderboards")}
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.1, y: -3 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="flex items-center justify-center">
                <LottieNavIcon type="rank" size={52} />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold drop-shadow-sm">{t("nav.rank")}</span>
            </motion.button>

            {/* Sound */}
            <motion.button
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.1, y: -3 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="flex items-center justify-center">
                <span className="text-4xl">🎧</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold drop-shadow-sm">{t("nav.sound")}</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
