import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Play, Compass, Map, Trophy, Headphones } from "lucide-react";
import { t } from "@/lib/i18n";
import { usePendingChallenges } from "@/hooks/usePendingChallenges";

interface UniversalBottomNavProps {
  onPlayClick?: () => void;
  onTeamClick?: () => void;
}

export function UniversalBottomNav({ onPlayClick, onTeamClick }: UniversalBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingChallenges } = usePendingChallenges();
  
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
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Wave divider at top */}
      <svg 
        className="absolute w-full" 
        style={{ top: -8, left: 0, right: 0 }}
        height="10" 
        viewBox="0 0 1440 10" 
        preserveAspectRatio="none"
      >
        <path 
          d="M0,8 C180,0 360,10 540,4 C720,0 900,10 1080,6 C1260,2 1380,8 1440,4 L1440,10 L0,10 Z" 
          fill="#F8F9FA"
        />
      </svg>
      
      {/* Solid color container */}
      <div 
        className="relative"
        style={{
          background: "#F8F9FA",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Navigation items container */}
        <div className="flex items-center justify-around px-2 py-2">
          {/* Explore */}
          <NavButton
            onClick={() => navigate("/discover")}
            isActive={isActive("/discover")}
            icon={Compass}
            label="აღმოჩენა"
          />

          {/* Map */}
          <NavButton
            onClick={() => navigate("/adventure-map")}
            isActive={isActive("/adventure-map")}
            icon={Map}
            label="რუკა"
          />

          {/* Center Play Button - floats above, overlapping nav bar */}
          <div className="relative flex flex-col items-center justify-center" style={{ width: 72, height: 48 }}>
            <div className="absolute" style={{ bottom: -8 }}>
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
            icon={Trophy}
            label="რანგი"
          />

          {/* Team */}
          <NavButton
            onClick={onTeamClick || (() => navigate("/team"))}
            isActive={isActive("/team")}
            icon={Headphones}
            label="გუნდი"
            badgeCount={pendingChallenges.length}
          />
        </div>
      </div>
    </div>
  );
}

function NavButton({ 
  onClick, 
  isActive, 
  icon: Icon,
  label,
  badgeCount = 0,
}: { 
  onClick: () => void;
  isActive: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badgeCount?: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center min-w-[56px] py-1"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative" style={{ opacity: isActive ? 1 : 0.5 }}>
        {/* Icon */}
        <div className="w-8 h-8 flex items-center justify-center">
          <Icon className="w-6 h-6 text-gray-800" />
        </div>
        
        {/* Badge */}
        {badgeCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(180deg, #FF6B6B 0%, #EF4444 100%)",
              boxShadow: "0 2px 4px rgba(239, 68, 68, 0.5)",
            }}
          >
            <span className="text-[9px] font-bold text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          </motion.div>
        )}
      </div>
      
      {/* Label */}
      <span 
        className="text-gray-900 font-medium mt-0.5"
        style={{ 
          fontSize: 13, 
          fontFamily: "'Google Sans', sans-serif",
          opacity: isActive ? 1 : 0.5,
        }}
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
      style={{ width: 90, height: 90 }}
    >
      {/* Soft outer glow - using box-shadow on button itself */}
      
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
