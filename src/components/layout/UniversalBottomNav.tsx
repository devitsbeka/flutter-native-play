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
    <div className="fixed bottom-0 left-0 right-0 z-20 safe-bottom overflow-visible">
      <div className="relative overflow-visible">
        {/* Elegant curved wave SVG */}
        <svg 
          className="absolute left-0 right-0 w-full pointer-events-none"
          style={{ bottom: "calc(100% - 8px)", height: 55 }}
          viewBox="0 0 400 55" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="navCurveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F8F6FC" stopOpacity="0" />
              <stop offset="30%" stopColor="#F8F6FC" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#F8F6FC" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#F8F6FC" />
            </linearGradient>
          </defs>
          {/* Smooth bezier curve wave */}
          <path 
            d="M0,55 L0,30 C80,48 150,12 200,18 C250,24 320,48 400,30 L400,55 Z" 
            fill="url(#navCurveGradient)"
          />
          {/* Top highlight stroke */}
          <path 
            d="M0,30 C80,48 150,12 200,18 C250,24 320,48 400,30" 
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
          />
        </svg>
        
        {/* Blur transition layer */}
        <div 
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: -4,
            height: 12,
            background: "linear-gradient(180deg, transparent 0%, #F8F6FC 100%)",
            filter: "blur(4px)",
          }}
        />
        
        {/* Main container - minimal height so play button overlaps background more */}
        <div 
          className="relative overflow-visible"
          style={{
            background: "linear-gradient(180deg, #F8F6FC 0%, #EDE8F5 50%, #E5DEF0 100%)",
            padding: "0px 20px 4px",
            marginTop: -14,
            boxShadow: "inset 0 4px 8px rgba(140,120,180,0.08), inset 0 -2px 4px rgba(255,255,255,0.9)",
          }}
        >
          <div className="flex items-center justify-around overflow-visible">
            {/* Explore */}
            <NavButton
              onClick={() => navigate("/discover")}
              isActive={isActive("/discover")}
              label={t("nav.explore")}
              icon={Compass}
            />

            {/* Map */}
            <NavButton
              onClick={() => navigate("/adventure-map")}
              isActive={isActive("/adventure-map")}
              label={t("nav.map")}
              icon={Map}
            />

            {/* Center Button - positioned to float above */}
            <div className="relative" style={{ width: 90 }}>
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -14 }}>
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
              icon={Trophy}
            />

            {/* Team */}
            <NavButton
              onClick={onTeamClick || (() => navigate("/team"))}
              isActive={isActive("/team")}
              label={t("nav.sound")}
              icon={Headphones}
              badgeCount={pendingChallenges.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({ 
  onClick, 
  isActive, 
  label,
  icon: Icon,
  badgeCount = 0,
}: { 
  onClick: () => void;
  isActive: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="relative flex items-center justify-center min-w-[56px]"
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.9 }}
    >
      <div className="relative" style={{ opacity: isActive ? 1 : 0.5 }}>
        {/* Icon container - no background, just opacity change */}
        <div className="w-12 h-12 flex items-center justify-center">
          <Icon 
            className="w-6 h-6 text-gray-700" 
          />
        </div>
        
        {/* Badge */}
        {badgeCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(180deg, #FF6B6B 0%, #EF4444 100%)",
              boxShadow: "0 2px 4px rgba(239, 68, 68, 0.5)",
            }}
          >
            <span className="text-[10px] font-bold text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          </motion.div>
        )}
      </div>
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
