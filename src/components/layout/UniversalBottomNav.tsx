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
      
      <div className="relative px-0 pb-0 overflow-visible">
        {/* Curved top edge SVG */}
        <svg 
          className="absolute left-0 right-0 w-full pointer-events-none"
          style={{ top: -40, height: 42 }}
          viewBox="0 0 100 20" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,20 L0,5 Q50,20 100,5 L100,20 Z" 
            fill="rgba(255,255,255,0.88)"
          />
        </svg>
        
        {/* Unified white container */}
        <div 
          className="relative overflow-visible"
          style={{
            background: "rgba(255,255,255,0.88)",
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
              <LottieNavIcon type="explore" size={60} />
            </NavButton>

            {/* Map */}
            <NavButton
              onClick={() => navigate("/adventure-map")}
              isActive={isActive("/adventure-map")}
              label={t("nav.map")}
              className="mr-[10px]"
            >
              <LottieNavIcon type="map" size={60} />
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
              className="ml-[10px]"
            >
              <LottieNavIcon type="rank" size={60} />
            </NavButton>

            {/* Team */}
            <NavButton
              onClick={onTeamClick || (() => navigate("/team"))}
              isActive={isActive("/team")}
              label={t("nav.sound")}
            >
              <LottieNavIcon type="team" size={60} />
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
  label,
  className = ""
}: { 
  children: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
  label: string;
  className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${className}`}
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
  // Hexagon shape
  const hexPath = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  
  return (
    <motion.button
      onClick={onClick}
      className="relative"
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.92, y: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      style={{ width: 68, height: 76 }}
    >
      {/* Outer ring/border */}
      <div
        style={{
          position: "absolute",
          inset: -4,
          background: "linear-gradient(180deg, rgba(180,160,220,0.6) 0%, rgba(140,120,180,0.4) 100%)",
          clipPath: hexPath,
          filter: "blur(1px)",
        }}
      />
      
      {/* Bottom 3D depth layer - darkest purple */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: 8,
          background: "linear-gradient(180deg, #4a3a6e 0%, #3d2d5c 50%, #2e2248 100%)",
          clipPath: hexPath,
        }}
      />
      
      {/* Middle bevel layer - medium purple */}
      <div
        style={{
          position: "absolute",
          inset: 2,
          top: 4,
          bottom: 8,
          background: "linear-gradient(180deg, #6b5a8e 0%, #5a4a7d 100%)",
          clipPath: hexPath,
        }}
      />
      
      {/* Main face - gradient purple */}
      <div
        style={{
          position: "absolute",
          inset: 3,
          top: 0,
          bottom: 12,
          background: "linear-gradient(160deg, #9080b8 0%, #7a68a6 30%, #6b5a94 60%, #5d4d86 100%)",
          clipPath: hexPath,
          boxShadow: "inset 0 3px 8px rgba(255,255,255,0.25)",
        }}
      >
        {/* Top shine highlight */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: "55%",
            height: 8,
            background: "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 100%)",
            borderRadius: "4px",
          }}
        />
        
        {/* Inner radial glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.2) 0%, transparent 50%)",
            clipPath: hexPath,
          }}
        />
        
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isPlayButton ? (
            <Play 
              className="w-6 h-6 ml-0.5" 
              fill="white"
              stroke="white"
              strokeWidth={0}
              style={{ filter: "drop-shadow(0 1px 2px rgba(30,20,50,0.5))" }}
            />
          ) : (
            <Home 
              className="w-5 h-5 text-white" 
              strokeWidth={2.5}
              style={{ filter: "drop-shadow(0 1px 2px rgba(30,20,50,0.5))" }}
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}
