import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Play } from "lucide-react";
import { LottieNavIcon } from "./LottieNavIcon";
import { t } from "@/lib/i18n";

interface UniversalBottomNavProps {
  onPlayClick?: () => void;
  onTeamClick?: () => void;
}

export function UniversalBottomNav({ onPlayClick, onTeamClick }: UniversalBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isHome = location.pathname === "/";
  const isActive = (path: string) => location.pathname === path;

  const handleCenterClick = () => {
    if (isHome) {
      onPlayClick?.();
    } else {
      navigate("/");
    }
  };

  return (
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
        <div className="flex items-end justify-between max-w-md mx-auto">
          {/* Explore */}
          <NavButton
            onClick={() => navigate("/discover")}
            isActive={isActive("/discover")}
            label={t("nav.explore")}
          >
            <LottieNavIcon type="explore" size={52} />
          </NavButton>

          {/* Map */}
          <NavButton
            onClick={() => navigate("/adventure-map")}
            isActive={isActive("/adventure-map")}
            label={t("nav.map")}
          >
            <LottieNavIcon type="map" size={52} />
          </NavButton>

          {/* Center Button - Play on home, Home on other pages */}
          <div className="mb-4">
            <GlowingOrbButton 
              onClick={handleCenterClick}
              isPlayButton={isHome}
            />
          </div>

          {/* Rank */}
          <NavButton
            onClick={() => navigate("/leaderboards")}
            isActive={isActive("/leaderboards")}
            label={t("nav.rank")}
          >
            <LottieNavIcon type="rank" size={52} />
          </NavButton>

          {/* Team */}
          <NavButton
            onClick={onTeamClick || (() => navigate("/team"))}
            isActive={isActive("/team")}
            label={t("nav.sound")}
          >
            <LottieNavIcon type="team" size={52} />
          </NavButton>
        </div>
      </motion.div>
    </div>
  );
}

function NavButton({ 
  children, 
  onClick, 
  isActive, 
  label 
}: { 
  children: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-1"
      whileHover={{ scale: 1.1, y: -3 }}
      whileTap={{ scale: 0.9 }}
    >
      <div className="flex items-center justify-center">
        {children}
      </div>
      <span className={`text-[10px] uppercase tracking-wider font-semibold drop-shadow-sm ${
        isActive ? "text-primary font-bold" : "text-foreground/80"
      }`}>
        {label}
      </span>
    </motion.button>
  );
}

function GlowingOrbButton({ onClick, isPlayButton }: { onClick: () => void; isPlayButton: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      className="relative"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94, y: 5 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Subtle outer glow - not too blurry */}
      <motion.div
        className="absolute -inset-2"
        style={{
          borderRadius: "30px",
          background: "radial-gradient(circle, rgba(80,220,180,0.35) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* 3D Base/Shadow layer - crisp edges */}
      <div 
        className="absolute inset-0"
        style={{
          borderRadius: "26px",
          background: "linear-gradient(180deg, #2A9D8F 0%, #1D7A6F 100%)",
          transform: "translateY(5px)",
          boxShadow: "0 4px 12px rgba(30,120,100,0.5)",
        }}
      />
      
      {/* White border ring for polish */}
      <div 
        className="relative w-20 h-20 p-[3px]"
        style={{
          borderRadius: "26px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(220,250,240,0.8) 100%)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Main button face */}
        <div 
          className="w-full h-full overflow-hidden flex items-center justify-center"
          style={{
            borderRadius: "23px",
            background: "linear-gradient(160deg, #7EEFC8 0%, #50DCB4 35%, #3CC9A0 70%, #2FB08A 100%)",
            boxShadow: `
              inset 0 2px 8px rgba(255,255,255,0.5),
              inset 0 -3px 8px rgba(0,80,60,0.2)
            `,
          }}
        >
          {/* Top shine highlight */}
          <div
            className="absolute top-[6px] left-1/2 -translate-x-1/2 w-10 h-3"
            style={{
              borderRadius: "10px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)",
            }}
          />
          
          {/* Floating sparkle particles */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                background: "rgba(255,255,255,0.9)",
                left: `${25 + (i * 18)}%`,
                top: `${35 + (i * 10)}%`,
                boxShadow: "0 0 4px rgba(255,255,255,0.8)",
              }}
              animate={{
                y: [-6, 6, -6],
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{
                duration: 2.2 + (i * 0.4),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.25,
              }}
            />
          ))}
          
          {/* Icon */}
          {isPlayButton ? (
            <Play 
              className="w-9 h-9 ml-1 relative z-10" 
              style={{ 
                color: "white", 
                filter: "drop-shadow(0 2px 3px rgba(0,60,50,0.35))" 
              }}
              fill="white"
              strokeWidth={0}
            />
          ) : (
            <Home 
              className="w-8 h-8 relative z-10" 
              style={{ 
                color: "white", 
                filter: "drop-shadow(0 2px 3px rgba(0,60,50,0.35))" 
              }}
              strokeWidth={2.5}
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}
