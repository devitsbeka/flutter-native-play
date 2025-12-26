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
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95, y: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* Outer glow pulse */}
      <motion.div
        className="absolute -inset-3"
        style={{
          borderRadius: "26px",
          background: "radial-gradient(circle, rgba(80,220,180,0.4) 0%, rgba(120,200,255,0.2) 50%, transparent 70%)",
          filter: "blur(12px)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Secondary cyan glow */}
      <motion.div
        className="absolute -inset-2"
        style={{
          borderRadius: "26px",
          background: "radial-gradient(circle, rgba(0,255,200,0.5) 0%, transparent 60%)",
          filter: "blur(8px)",
        }}
        animate={{
          scale: [1.1, 0.95, 1.1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
      />
      
      {/* Base shadow */}
      <div 
        className="absolute inset-0"
        style={{
          borderRadius: "26px",
          background: "rgba(60,180,140,0.6)",
          transform: "translateY(6px)",
          boxShadow: "0 8px 25px rgba(80,220,180,0.5)",
          filter: "blur(2px)",
        }}
      />
      
      {/* Main button */}
      <div 
        className="relative w-20 h-20 overflow-hidden"
        style={{
          borderRadius: "26px",
          background: "linear-gradient(160deg, #7EEFC8 0%, #50DCB4 30%, #3CC9A0 60%, #30B898 100%)",
          boxShadow: `
            inset 0 -8px 20px rgba(0,100,80,0.3),
            inset 0 8px 20px rgba(255,255,255,0.4),
            0 0 30px rgba(80,220,180,0.5)
          `,
        }}
      >
        {/* Inner highlight */}
        <div
          className="absolute top-2 left-3 w-8 h-6"
          style={{
            borderRadius: "12px",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.6) 0%, transparent 70%)",
            filter: "blur(2px)",
          }}
        />
        
        {/* Floating particles inside */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: 3 + (i % 3),
              height: 3 + (i % 3),
              left: `${20 + (i * 12)}%`,
              top: `${30 + (i * 8)}%`,
              filter: "blur(0.5px)",
            }}
            animate={{
              y: [-8, 8, -8],
              x: [0, (i % 2 === 0 ? 4 : -4), 0],
              opacity: [0.4, 0.9, 0.4],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + (i * 0.3),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
        
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isPlayButton ? (
            <Play 
              className="w-9 h-9 drop-shadow-md ml-1" 
              style={{ color: "white", filter: "drop-shadow(0 2px 4px rgba(0,80,60,0.3))" }}
              fill="white"
              strokeWidth={0}
            />
          ) : (
            <Home 
              className="w-8 h-8 drop-shadow-md" 
              style={{ color: "white", filter: "drop-shadow(0 2px 4px rgba(0,80,60,0.3))" }}
              strokeWidth={2.5}
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}
