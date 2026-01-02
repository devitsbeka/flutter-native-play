import { motion } from "framer-motion";
import iconCoin from "@/assets/icons/icon-coin.png";
import iconGem from "@/assets/icons/icon-gem.png";

interface AvatarCircleProps {
  avatarUrl?: string | null;
  size?: number;
  coins?: number;
  gems?: number;
  xpProgress?: number; // 0-100 percentage
  xpCurrent?: number;
  xpTotal?: number;
}

export function AvatarCircle({ 
  avatarUrl, 
  size = 320, 
  coins = 0,
  gems = 0,
  xpProgress = 0,
  xpCurrent,
  xpTotal,
}: AvatarCircleProps) {
  const progressRingWidth = 10;
  const whiteRingWidth = 24; // Thick white chunky ring
  const ringGap = 6;
  
  // Calculate SVG dimensions for circular progress
  const outerRadius = size / 2;
  const progressRadius = outerRadius - progressRingWidth / 2 - 2;
  
  // Arc goes from bottom-left to bottom-right
  // Extends behind the level badge chip
  const totalArcDegrees = 310;
  const arcCircumference = (totalArcDegrees / 360) * 2 * Math.PI * progressRadius;
  const progressOffset = arcCircumference - (xpProgress / 100) * arcCircumference;
  
  // Start angle adjusted to go behind chip
  const startAngle = 115;
  
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Thick white chunky ring background */}
      <div 
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FC 50%, #F0ECF8 100%)",
          boxShadow: "inset 0 3px 8px rgba(140,120,180,0.2), 0 6px 16px rgba(0,0,0,0.12)",
          border: `${whiteRingWidth}px solid rgba(255,255,255,0.95)`,
          boxSizing: "border-box",
        }}
      />

      {/* Background track for progress ring */}
      <svg 
        className="absolute inset-0"
        width={size} 
        height={size}
        style={{ transform: `rotate(${startAngle}deg)` }}
      >
        <circle
          cx={outerRadius}
          cy={outerRadius}
          r={progressRadius}
          fill="none"
          stroke="rgba(200,190,220,0.4)"
          strokeWidth={progressRingWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcCircumference} ${2 * Math.PI * progressRadius}`}
        />
      </svg>
      
      {/* Purple progress ring SVG */}
      <svg 
        className="absolute inset-0"
        width={size} 
        height={size}
        style={{ transform: `rotate(${startAngle}deg)`, zIndex: 1 }}
      >
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
          <filter id="progressGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Progress arc */}
        <motion.circle
          cx={outerRadius}
          cy={outerRadius}
          r={progressRadius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={progressRingWidth - 2}
          strokeLinecap="round"
          strokeDasharray={`${arcCircumference} ${2 * Math.PI * progressRadius}`}
          initial={{ strokeDashoffset: arcCircumference }}
          animate={{ strokeDashoffset: progressOffset }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          filter="url(#progressGlow)"
        />
      </svg>

      {/* Inner white background circle */}
      <div 
        className="absolute rounded-full bg-white"
        style={{
          inset: progressRingWidth + ringGap,
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.05)",
        }}
      />

      {/* Avatar image */}
      {avatarUrl ? (
        <motion.img 
          src={avatarUrl} 
          alt="Avatar" 
          className="relative z-10 rounded-full object-cover"
          style={{
            width: size - (progressRingWidth + ringGap) * 2 - 8,
            height: size - (progressRingWidth + ringGap) * 2 - 8,
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      ) : (
        <div 
          className="relative z-10 rounded-full flex items-center justify-center"
          style={{
            width: size - (progressRingWidth + ringGap) * 2 - 8,
            height: size - (progressRingWidth + ringGap) * 2 - 8,
            background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3FA 50%, #EDE8F5 100%)",
            boxShadow: "inset 0 4px 8px rgba(140,120,180,0.1), inset 0 -2px 4px rgba(255,255,255,0.9), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.12)",
            border: "3px solid rgba(255,255,255,0.95)",
          }}
        >
          <span className="text-6xl">🎮</span>
        </div>
      )}

      {/* XP text overlay at top */}
      {xpCurrent !== undefined && xpTotal !== undefined && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 px-4 py-1.5 rounded-full"
          style={{
            background: "linear-gradient(180deg, rgba(168,85,247,0.95) 0%, rgba(147,51,234,0.95) 100%)",
            boxShadow: "0 2px 8px rgba(147,51,234,0.4)",
          }}
        >
          <span className="text-xs font-bold text-white whitespace-nowrap">
            {xpCurrent} / {xpTotal} XP
          </span>
        </div>
      )}

      {/* Coins & Gems badge at bottom center - 3D chunky white style */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 z-20">
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3FA 50%, #EDE8F5 100%)",
            boxShadow: "inset 0 4px 8px rgba(140,120,180,0.1), inset 0 -2px 4px rgba(255,255,255,0.9), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.12)",
            border: "3px solid rgba(255,255,255,0.95)",
          }}
        >
          <div className="flex items-center gap-1">
            <img src={iconCoin} alt="Coins" className="w-5 h-5" />
            <span className="font-bold text-gray-700 text-sm">{coins}</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <img src={iconGem} alt="Gems" className="w-5 h-5" />
            <span className="font-bold text-gray-700 text-sm">{gems}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
