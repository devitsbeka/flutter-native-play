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
        {/* Unified white container */}
        <div 
          className="relative max-w-md mx-auto"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.75) 100%)",
            borderRadius: "28px",
            padding: "12px 16px 14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.5)",
          }}
        >
          <div className="flex items-end justify-between">
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
            <div className="mb-6 -mt-6">
              <MagicalGreenPlayButton 
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

function MagicalGreenPlayButton({ onClick, isPlayButton }: { onClick: () => void; isPlayButton: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      className="relative"
      whileHover={{ scale: 1.08, y: -3 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Outer electric glow rings */}
      <motion.div
        className="absolute -inset-6"
        style={{
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,136,0.4) 0%, rgba(0,255,200,0.2) 40%, transparent 70%)",
          filter: "blur(16px)",
        }}
        animate={{
          opacity: [0.5, 0.9, 0.5],
          scale: [0.95, 1.1, 0.95],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Secondary pulsing glow */}
      <motion.div
        className="absolute -inset-4"
        style={{
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,170,0.5) 0%, rgba(0,220,150,0.25) 50%, transparent 75%)",
          filter: "blur(10px)",
        }}
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
      />

      {/* Glowing ring effect */}
      <motion.div
        className="absolute -inset-1"
        style={{
          borderRadius: "28px",
          background: "linear-gradient(135deg, rgba(0,255,170,0.8) 0%, rgba(0,200,120,0.6) 50%, rgba(0,255,200,0.8) 100%)",
          filter: "blur(3px)",
        }}
        animate={{
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* White border ring */}
      <div 
        className="relative w-[76px] h-[76px] p-[3px]"
        style={{
          borderRadius: "26px",
          background: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 100%)",
          boxShadow: "0 8px 32px rgba(0,255,150,0.4), 0 4px 16px rgba(0,200,120,0.3), 0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Main button face with electric green gradient */}
        <div 
          className="w-full h-full overflow-hidden flex items-center justify-center relative"
          style={{
            borderRadius: "23px",
            background: "linear-gradient(160deg, #00ff9d 0%, #00e68a 30%, #00cc77 60%, #00b368 100%)",
            boxShadow: `
              inset 0 3px 16px rgba(255,255,255,0.5),
              inset 0 -3px 12px rgba(0,100,60,0.3)
            `,
          }}
        >
          {/* Bright top shine */}
          <div
            className="absolute top-[4px] left-1/2 -translate-x-1/2 w-12 h-3"
            style={{
              borderRadius: "10px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)",
            }}
          />
          
          {/* Inner glow */}
          <div
            className="absolute inset-0"
            style={{
              borderRadius: "23px",
              background: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)",
            }}
          />
          
          {/* Floating sparkle particles */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: i % 2 === 0 ? 4 : 3,
                height: i % 2 === 0 ? 4 : 3,
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 0 6px rgba(255,255,255,0.8)",
                left: `${20 + (i * 15)}%`,
                top: `${25 + (i * 10)}%`,
              }}
              animate={{
                y: [-6, 6, -6],
                x: [i % 2 === 0 ? -3 : 3, i % 2 === 0 ? 3 : -3, i % 2 === 0 ? -3 : 3],
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + (i * 0.4),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}
          
          {/* Icon */}
          {isPlayButton ? (
            <Play 
              className="w-9 h-9 ml-1 relative z-10" 
              fill="white"
              stroke="white"
              strokeWidth={0}
              style={{ 
                filter: "drop-shadow(0 2px 4px rgba(0,80,50,0.3))",
              }}
            />
          ) : (
            <Home 
              className="w-8 h-8 relative z-10 text-white" 
              strokeWidth={2.5}
              style={{ 
                filter: "drop-shadow(0 2px 4px rgba(0,80,50,0.3))",
              }}
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}
