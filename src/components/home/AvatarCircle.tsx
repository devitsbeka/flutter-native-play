import { motion } from "framer-motion";

interface AvatarCircleProps {
  avatarUrl?: string | null;
  size?: number;
  level?: number;
  totalStars?: number;
}

export function AvatarCircle({ avatarUrl, size = 320, level, totalStars }: AvatarCircleProps) {
  const ringWidth = 8;
  
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Multicolor gradient ring */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 180deg, #3B82F6 0deg, #06B6D4 90deg, #EF4444 180deg, #EC4899 270deg, #3B82F6 360deg)",
          boxShadow: `
            0 8px 24px rgba(59,130,246,0.3),
            0 0 40px rgba(236,72,153,0.2)
          `,
        }}
      />

      {/* Inner white background circle */}
      <div 
        className="absolute rounded-full bg-white"
        style={{
          inset: ringWidth,
        }}
      />

      {/* Avatar image */}
      {avatarUrl ? (
        <motion.img 
          src={avatarUrl} 
          alt="Avatar" 
          className="relative z-10 rounded-full object-cover"
          style={{
            width: size - ringWidth * 2 - 8,
            height: size - ringWidth * 2 - 8,
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      ) : (
        <div 
          className="relative z-10 rounded-full flex items-center justify-center"
          style={{
            width: size - ringWidth * 2 - 8,
            height: size - ringWidth * 2 - 8,
            background: "rgba(240,240,245,1)",
          }}
        >
          <span className="text-7xl">🎮</span>
        </div>
      )}

      {/* Level + Stars badge at bottom center - 3D chunky white style */}
      {level !== undefined && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20">
          <div 
            className="flex items-center gap-3 px-5 py-2.5 rounded-full whitespace-nowrap"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3FA 50%, #EDE8F5 100%)",
              boxShadow: "inset 0 4px 8px rgba(140,120,180,0.1), inset 0 -2px 4px rgba(255,255,255,0.9), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.12)",
              border: "3px solid rgba(255,255,255,0.95)",
            }}
          >
            {/* Level section */}
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🎮</span>
              <span className="font-bold text-gray-700 text-sm">დონე {level}</span>
            </div>
            
            {/* Separator */}
            <div className="w-px h-4 bg-gray-300" />
            
            {/* Stars section */}
            <div className="flex items-center gap-1.5">
              <span className="text-lg">⭐</span>
              <span className="font-bold text-gray-700 text-sm">{totalStars ?? 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
