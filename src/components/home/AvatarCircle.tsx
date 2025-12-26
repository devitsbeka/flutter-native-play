import { motion } from "framer-motion";
import { useMemo } from "react";

interface AvatarParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface AvatarCircleProps {
  avatarUrl?: string | null;
  size?: number;
}

export function AvatarCircle({ avatarUrl, size = 320 }: AvatarCircleProps) {
  // Generate random particles
  const particles = useMemo<AvatarParticle[]>(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      opacity: 0.4 + Math.random() * 0.5,
    }));
  }, []);

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer glow effect */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size + 40,
          height: size + 40,
          background: "radial-gradient(circle, rgba(147,112,219,0.25) 0%, rgba(100,149,237,0.15) 40%, transparent 70%)",
          filter: "blur(20px)",
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Main circle with studio gradient background */}
      <div 
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #f8f9fa 0%, #e9ecef 25%, #dee2e6 50%, #e9ecef 75%, #f8f9fa 100%)",
          boxShadow: `
            0 0 40px rgba(147,112,219,0.2),
            0 0 80px rgba(100,149,237,0.15),
            0 20px 60px rgba(0,0,0,0.15),
            0 8px 25px rgba(0,0,0,0.1),
            inset 0 2px 4px rgba(255,255,255,0.9),
            inset 0 -2px 4px rgba(0,0,0,0.05)
          `,
          border: "3px solid rgba(255,255,255,0.8)",
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

      {/* Floating particles overlay */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-20">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              background: `radial-gradient(circle, rgba(255,255,255,${particle.opacity}) 0%, rgba(200,180,240,${particle.opacity * 0.6}) 100%)`,
              boxShadow: `0 0 ${particle.size * 2}px rgba(255,255,255,0.5)`,
            }}
            animate={{
              y: [-10, 10, -10],
              x: [-5, 5, -5],
              opacity: [particle.opacity, particle.opacity * 0.6, particle.opacity],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Sparkle effects */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = (size / 2) * 0.7;
        const x = 50 + Math.cos(angle) * (radius / (size / 2)) * 50;
        const y = 50 + Math.sin(angle) * (radius / (size / 2)) * 50;
        
        return (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute z-20 pointer-events-none"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: 4,
              height: 4,
              transform: "translate(-50%, -50%)",
            }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div 
              className="w-full h-full"
              style={{
                background: "white",
                borderRadius: "50%",
                boxShadow: "0 0 8px 2px rgba(255,255,255,0.8)",
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
