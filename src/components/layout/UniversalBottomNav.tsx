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
            fill="rgba(255,255,255,0.95)"
          />
        </svg>
        
        {/* Unified white container */}
        <div 
          className="relative overflow-visible"
          style={{
            background: "rgba(255,255,255,0.95)",
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
              className="mr-[20px]"
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
              className="ml-[20px]"
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
      <span 
        className={`text-[10px] uppercase tracking-wider font-semibold drop-shadow-sm ${
          isActive ? "text-primary font-bold" : "text-foreground/80"
        }`}
        style={{ marginTop: -8 }}
      >
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
      whileTap={{ scale: 0.92, y: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      style={{ width: 88, height: 88 }}
    >
      {/* Soft outer glow - box-shadow only, no filter */}
      <div
        className="absolute rounded-full"
        style={{
          inset: -8,
          background: "radial-gradient(circle, rgba(110,255,194,0.25) 0%, rgba(80,230,170,0.1) 50%, transparent 70%)",
          boxShadow: "0 0 25px rgba(110,255,194,0.4), 0 0 50px rgba(80,230,170,0.2)",
        }}
      />
      
      {/* Bottom 3D depth layer - lighter mint-teal */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 0,
          top: 6,
          background: "linear-gradient(180deg, #5DD8B0 0%, #4BC9A0 50%, #3DB890 100%)",
        }}
      />
      
      {/* Middle bevel layer - light mint */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 3,
          top: 4,
          bottom: 8,
          background: "linear-gradient(180deg, #7EECC5 0%, #6ADDB5 100%)",
        }}
      />
      
      {/* Main face - mint green radial gradient */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          inset: 4,
          top: 0,
          bottom: 12,
          background: "radial-gradient(circle at 40% 35%, #8AFFDA 0%, #6EFFC2 25%, #5EE8B5 50%, #4DD8A5 75%, #3FC99A 100%)",
        }}
      >
        
        {/* Mint green sparkle particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 2 === 0 ? 4 : 3,
              height: i % 2 === 0 ? 4 : 3,
              background: "rgba(180,255,220,0.95)",
              boxShadow: "0 0 6px rgba(150,255,210,0.9), 0 0 10px rgba(100,230,180,0.6)",
              left: `${20 + (i * 12)}%`,
              top: `${25 + ((i % 3) * 18)}%`,
            }}
            animate={{
              y: [-5, 5, -5],
              x: [i % 2 === 0 ? -3 : 3, i % 2 === 0 ? 3 : -3, i % 2 === 0 ? -3 : 3],
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 1.5 + (i * 0.25),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
        
        {/* Icon */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}
        >
          {isPlayButton ? (
            <Play 
              className="w-8 h-8 ml-1" 
              fill="#ffffff"
              stroke="#ffffff"
              strokeWidth={0}
            />
          ) : (
            <Home 
              className="w-7 h-7" 
              color="#ffffff"
              strokeWidth={2.5}
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}
