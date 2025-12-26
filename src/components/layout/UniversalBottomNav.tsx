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
            <LottieNavIcon type="explore" size={104} />
          </NavButton>

          {/* Map */}
          <NavButton
            onClick={() => navigate("/adventure-map")}
            isActive={isActive("/adventure-map")}
            label={t("nav.map")}
          >
            <LottieNavIcon type="map" size={104} />
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
            <LottieNavIcon type="rank" size={104} />
          </NavButton>

          {/* Team */}
          <NavButton
            onClick={onTeamClick || (() => navigate("/team"))}
            isActive={isActive("/team")}
            label={t("nav.sound")}
          >
            <LottieNavIcon type="team" size={104} />
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
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Soft ambient glow */}
      <motion.div
        className="absolute -inset-3"
        style={{
          borderRadius: "32px",
          background: "radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)",
          filter: "blur(12px)",
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Subtle lift shadow - very soft, no dark colors */}
      <div 
        className="absolute inset-0"
        style={{
          borderRadius: "26px",
          background: "hsl(var(--primary) / 0.15)",
          transform: "translateY(3px)",
          filter: "blur(4px)",
        }}
      />
      
      {/* Main button container with soft border */}
      <div 
        className="relative w-[72px] h-[72px] p-[2px]"
        style={{
          borderRadius: "26px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)",
          boxShadow: "0 4px 16px hsl(var(--primary) / 0.2), 0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        {/* Main button face with primary color */}
        <div 
          className="w-full h-full overflow-hidden flex items-center justify-center"
          style={{
            borderRadius: "24px",
            background: "linear-gradient(160deg, hsl(var(--primary) / 0.85) 0%, hsl(var(--primary)) 50%, hsl(var(--primary) / 0.9) 100%)",
            boxShadow: `
              inset 0 2px 12px rgba(255,255,255,0.35),
              inset 0 -2px 8px hsl(var(--primary) / 0.3)
            `,
          }}
        >
          {/* Top shine */}
          <div
            className="absolute top-[5px] left-1/2 -translate-x-1/2 w-9 h-2.5"
            style={{
              borderRadius: "8px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)",
            }}
          />
          
          {/* Subtle floating particles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3,
                height: 3,
                background: "rgba(255,255,255,0.8)",
                left: `${30 + (i * 20)}%`,
                top: `${40 + (i * 8)}%`,
              }}
              animate={{
                y: [-4, 4, -4],
                opacity: [0.4, 0.9, 0.4],
              }}
              transition={{
                duration: 2.5 + (i * 0.3),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
          
          {/* Icon */}
          {isPlayButton ? (
            <Play 
              className="w-8 h-8 ml-0.5 relative z-10 text-primary-foreground" 
              fill="currentColor"
              strokeWidth={0}
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
            />
          ) : (
            <Home 
              className="w-7 h-7 relative z-10 text-primary-foreground" 
              strokeWidth={2.5}
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}
