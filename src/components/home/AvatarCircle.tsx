import { motion } from "framer-motion";

interface AvatarCircleProps {
  avatarUrl?: string | null;
  size?: number;
}

export function AvatarCircle({ avatarUrl, size = 320 }: AvatarCircleProps) {
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Main circle with 3D chunky styling */}
      <div 
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #F8F6FC 0%, #EDE8F5 50%, #E5DEF0 100%)",
          boxShadow: `
            inset 0 6px 12px rgba(140,120,180,0.15),
            inset 0 -3px 6px rgba(255,255,255,0.9),
            0 8px 0 #D8D0E8,
            0 12px 24px rgba(0,0,0,0.12),
            0 0 40px rgba(147,112,219,0.15)
          `,
          border: "4px solid rgba(255,255,255,0.95)",
        }}
      />

      {/* Inner subtle glow */}
      <div 
        className="absolute rounded-full"
        style={{
          inset: 8,
          background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6) 0%, transparent 60%)",
        }}
      />

      {/* Avatar image */}
      {avatarUrl ? (
        <motion.img 
          src={avatarUrl} 
          alt="Avatar" 
          className="relative z-10 rounded-full object-cover"
          style={{
            width: size - 16,
            height: size - 16,
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      ) : (
        <div 
          className="relative z-10 rounded-full flex items-center justify-center"
          style={{
            width: size - 16,
            height: size - 16,
            background: "rgba(255,255,255,0.3)",
          }}
        >
          <span className="text-7xl">🎮</span>
        </div>
      )}
    </div>
  );
}
