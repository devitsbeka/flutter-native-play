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
        className="relative px-4 pb-2"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
      >
        {/* Unified white container */}
        <div 
          className="relative max-w-md mx-auto"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.78) 100%)",
            borderRadius: "24px",
            padding: "8px 12px 10px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.5)",
          }}
        >
          <div className="flex items-center justify-between">
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
            <div className="-mt-10">
              <Hex3DPlayButton 
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

function Hex3DPlayButton({ onClick, isPlayButton }: { onClick: () => void; isPlayButton: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      className="relative"
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95, y: 2 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute -inset-4"
        style={{
          background: "radial-gradient(circle, rgba(120,200,80,0.5) 0%, rgba(100,180,60,0.3) 40%, transparent 70%)",
          filter: "blur(12px)",
        }}
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* 3D Pentagon/Hexagon container */}
      <div className="relative" style={{ width: 80, height: 90 }}>
        {/* Bottom 3D depth layer - darker green */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 76,
            height: 70,
            background: "linear-gradient(180deg, #4a9e3a 0%, #3d8530 50%, #2d6a24 100%)",
            clipPath: "polygon(50% 100%, 0% 65%, 0% 20%, 50% 0%, 100% 20%, 100% 65%)",
            boxShadow: "0 4px 20px rgba(50,100,40,0.5)",
          }}
        />
        
        {/* Inner bevel edge - medium green */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 70,
            height: 64,
            background: "linear-gradient(180deg, #5cb848 0%, #4da03c 100%)",
            clipPath: "polygon(50% 100%, 0% 65%, 0% 20%, 50% 0%, 100% 20%, 100% 65%)",
          }}
        />
        
        {/* Main top face - bright lime green */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 68,
            height: 62,
            background: "linear-gradient(160deg, #8ed656 0%, #7bc842 30%, #6ab838 60%, #5aa830 100%)",
            clipPath: "polygon(50% 100%, 0% 65%, 0% 20%, 50% 0%, 100% 20%, 100% 65%)",
            boxShadow: "inset 0 4px 12px rgba(255,255,255,0.4), inset 0 -4px 8px rgba(50,100,40,0.2)",
          }}
        >
          {/* Top highlight shine */}
          <div
            style={{
              position: "absolute",
              top: 6,
              left: "50%",
              transform: "translateX(-50%)",
              width: 40,
              height: 12,
              background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)",
              borderRadius: "8px",
            }}
          />
          
          {/* Inner subtle gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 50% 25%, rgba(255,255,255,0.25) 0%, transparent 50%)",
              clipPath: "polygon(50% 100%, 0% 65%, 0% 20%, 50% 0%, 100% 20%, 100% 65%)",
            }}
          />
          
          {/* Icon container */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: 8 }}>
            {isPlayButton ? (
              <Play 
                className="w-8 h-8 ml-1" 
                fill="white"
                stroke="white"
                strokeWidth={0}
                style={{ 
                  filter: "drop-shadow(0 2px 4px rgba(50,100,40,0.4))",
                }}
              />
            ) : (
              <Home 
                className="w-7 h-7 text-white" 
                strokeWidth={2.5}
                style={{ 
                  filter: "drop-shadow(0 2px 4px rgba(50,100,40,0.4))",
                }}
              />
            )}
          </div>
        </div>
        
        {/* Sparkle particles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 0 8px rgba(255,255,255,0.9)",
              left: `${25 + (i * 18)}%`,
              top: `${20 + (i * 12)}%`,
            }}
            animate={{
              y: [-4, 4, -4],
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 1.8 + (i * 0.3),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.25,
            }}
          />
        ))}
      </div>
    </motion.button>
  );
}
