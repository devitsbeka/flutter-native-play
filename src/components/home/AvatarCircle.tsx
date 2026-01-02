import { motion } from "framer-motion";

interface AvatarCircleProps {
  avatarUrl?: string | null;
  size?: number;
  level?: number;
  totalStars?: number;
  xpProgress?: number; // 0-100 percentage
  xpCurrent?: number;
  xpTotal?: number;
}

export function AvatarCircle({ 
  avatarUrl, 
  size = 320, 
  level, 
  totalStars,
  xpProgress = 0,
  xpCurrent,
  xpTotal,
}: AvatarCircleProps) {
  const ringWidth = 12;
  const progressRingWidth = 10;
  const progressRingGap = 4;
  
  // Calculate SVG dimensions for circular progress
  const outerRadius = size / 2;
  const progressRadius = outerRadius - progressRingWidth / 2 - 2;
  const circumference = 2 * Math.PI * progressRadius;
  const progressOffset = circumference - (xpProgress / 100) * circumference;
  
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background track for progress ring - 3D chunky white style */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(180deg, #F8F6FC 0%, #EDE8F5 50%, #E5DEF0 100%)",
          boxShadow: "inset 0 4px 8px rgba(140,120,180,0.2), inset 0 -2px 4px rgba(255,255,255,0.8), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.1)",
          border: "3px solid rgba(255,255,255,0.9)",
        }}
      />
      
      {/* Purple progress ring SVG */}
      <svg 
        className="absolute inset-0 -rotate-90"
        width={size} 
        height={size}
        style={{ zIndex: 1 }}
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
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: progressOffset }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          filter="url(#progressGlow)"
        />
      </svg>

      {/* Inner colored gradient ring (original multicolor) */}
      <div 
        className="absolute rounded-full"
        style={{
          inset: progressRingWidth + progressRingGap,
          background: "conic-gradient(from 180deg, #3B82F6 0deg, #06B6D4 90deg, #EF4444 180deg, #EC4899 270deg, #3B82F6 360deg)",
          boxShadow: `
            0 4px 12px rgba(59,130,246,0.2),
            0 0 20px rgba(236,72,153,0.15)
          `,
        }}
      />

      {/* Inner white background circle */}
      <div 
        className="absolute rounded-full bg-white"
        style={{
          inset: progressRingWidth + progressRingGap + ringWidth,
        }}
      />

      {/* Avatar image */}
      {avatarUrl ? (
        <motion.img 
          src={avatarUrl} 
          alt="Avatar" 
          className="relative z-10 rounded-full object-cover"
          style={{
            width: size - (progressRingWidth + progressRingGap + ringWidth) * 2 - 8,
            height: size - (progressRingWidth + progressRingGap + ringWidth) * 2 - 8,
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      ) : (
        <div 
          className="relative z-10 rounded-full flex items-center justify-center"
          style={{
            width: size - (progressRingWidth + progressRingGap + ringWidth) * 2 - 8,
            height: size - (progressRingWidth + progressRingGap + ringWidth) * 2 - 8,
            background: "rgba(240,240,245,1)",
          }}
        >
          <span className="text-6xl">🎮</span>
        </div>
      )}

      {/* XP text overlay at top */}
      {xpCurrent !== undefined && xpTotal !== undefined && (
        <div 
          className="absolute top-1 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full"
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

      {/* Level + Stars badge at bottom center - 3D chunky white style */}
      {level !== undefined && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20">
          <div 
            className="flex items-center px-4 py-2 rounded-full whitespace-nowrap"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3FA 50%, #EDE8F5 100%)",
              boxShadow: "inset 0 4px 8px rgba(140,120,180,0.1), inset 0 -2px 4px rgba(255,255,255,0.9), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.12)",
              border: "3px solid rgba(255,255,255,0.95)",
            }}
          >
            <span className="font-bold text-gray-700 text-sm">დონე {level} · ⭐ {totalStars ?? 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}
