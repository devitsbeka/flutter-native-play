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
    <div className="fixed bottom-0 left-0 right-0 z-20 safe-bottom overflow-visible">
      {/* Smooth gradient fade layer */}
      <div 
        className="absolute left-0 right-0 bottom-0 pointer-events-none"
        style={{
          height: "140px",
          background: "linear-gradient(to top, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 40%, rgba(255,255,255,0.2) 70%, transparent 100%)",
        }}
      />
      
      <div className="relative px-4 pb-0 overflow-visible">
        {/* Unified white pill container */}
        <div 
          className="relative overflow-visible"
          style={{
            background: "rgba(255,255,255,0.88)",
            borderRadius: "18px",
            padding: "4px 20px 6px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center justify-around overflow-visible">
            {/* Explore */}
            <NavButton
              onClick={() => navigate("/discover")}
              isActive={isActive("/discover")}
              label={t("nav.explore")}
            >
              <LottieNavIcon type="explore" size={48} />
            </NavButton>

            {/* Map */}
            <NavButton
              onClick={() => navigate("/adventure-map")}
              isActive={isActive("/adventure-map")}
              label={t("nav.map")}
            >
              <LottieNavIcon type="map" size={48} />
            </NavButton>

            {/* Center Button - positioned to float above */}
            <div className="relative" style={{ width: 70 }}>
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -26 }}>
                <Hex3DPlayButton 
                  onClick={handleCenterClick}
                  isPlayButton={isHome}
                />
              </div>
            </div>

            {/* Rank */}
            <NavButton
              onClick={() => navigate("/leaderboards")}
              isActive={isActive("/leaderboards")}
              label={t("nav.rank")}
            >
              <LottieNavIcon type="rank" size={48} />
            </NavButton>

            {/* Team */}
            <NavButton
              onClick={onTeamClick || (() => navigate("/team"))}
              isActive={isActive("/team")}
              label={t("nav.sound")}
            >
              <LottieNavIcon type="team" size={48} />
            </NavButton>
          </div>
        </div>
      </div>
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

function Hex3DPlayButton({ onClick, isPlayButton }: { onClick: () => void; isPlayButton: boolean }) {
  // Shield/badge shape pointing UP with flat bottom
  const shieldPath = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  
  return (
    <motion.button
      onClick={onClick}
      className="relative"
      whileHover={{ scale: 1.08, y: -3 }}
      whileTap={{ scale: 0.95, y: 2 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      style={{ width: 72, height: 82 }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute -inset-3"
        style={{
          background: "radial-gradient(circle, rgba(120,200,80,0.6) 0%, rgba(100,180,60,0.3) 50%, transparent 75%)",
          filter: "blur(10px)",
        }}
        animate={{
          opacity: [0.5, 0.9, 0.5],
          scale: [0.95, 1.08, 0.95],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Bottom 3D depth layer - darkest */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: 6,
          background: "linear-gradient(180deg, #3a7d2e 0%, #2d6524 100%)",
          clipPath: shieldPath,
        }}
      />
      
      {/* Middle bevel layer */}
      <div
        style={{
          position: "absolute",
          inset: 3,
          top: 3,
          bottom: 6,
          background: "linear-gradient(180deg, #4a9e3a 0%, #3d8530 100%)",
          clipPath: shieldPath,
        }}
      />
      
      {/* Main face - bright lime */}
      <div
        style={{
          position: "absolute",
          inset: 4,
          top: 0,
          bottom: 10,
          background: "linear-gradient(160deg, #9be065 0%, #7bc842 40%, #6ab838 70%, #5aa830 100%)",
          clipPath: shieldPath,
        }}
      >
        {/* Top shine */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: "60%",
            height: 10,
            background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)",
            borderRadius: "6px",
          }}
        />
        
        {/* Inner radial highlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.3) 0%, transparent 55%)",
            clipPath: shieldPath,
          }}
        />
        
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isPlayButton ? (
            <Play 
              className="w-7 h-7 ml-0.5" 
              fill="white"
              stroke="white"
              strokeWidth={0}
              style={{ filter: "drop-shadow(0 2px 3px rgba(40,80,30,0.4))" }}
            />
          ) : (
            <Home 
              className="w-6 h-6 text-white" 
              strokeWidth={2.5}
              style={{ filter: "drop-shadow(0 2px 3px rgba(40,80,30,0.4))" }}
            />
          )}
        </div>
      </div>
      
      {/* Sparkles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 3,
            height: 3,
            background: "white",
            boxShadow: "0 0 6px rgba(255,255,255,0.9)",
            left: `${20 + (i * 25)}%`,
            top: `${15 + (i * 20)}%`,
          }}
          animate={{
            y: [-3, 3, -3],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.6 + (i * 0.3),
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </motion.button>
  );
}
