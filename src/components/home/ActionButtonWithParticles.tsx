import { motion } from "framer-motion";
import { ReactNode, useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
}

interface ActionButtonWithParticlesProps {
  iconSrc: string;
  alt: string;
  onClick: () => void;
  background: string;
  shadowColor: string;
  badge?: ReactNode;
  delay?: number;
  particleColor?: string;
  glowColor?: string;
  idleOffset?: number; // Offset for idle animation timing
  size?: number; // Button size in pixels
}

// Star SVG component for sparkle particles
const StarSparkle = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

export function ActionButtonWithParticles({
  iconSrc,
  alt,
  onClick,
  background,
  shadowColor,
  badge,
  delay = 0,
  particleColor = "rgba(255,255,255,0.8)",
  glowColor = "rgba(255,255,255,0.4)",
  idleOffset = 0,
  size = 73,
}: ActionButtonWithParticlesProps) {
  const iconSize = Math.round(size * 0.71); // ~52px for 73px button
  // Generate random particles with varied timing
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 70 - 35, // -35 to 35
      y: Math.random() * 70 - 35,
      size: Math.random() * 8 + 6, // 6 to 14px
      delay: Math.random() * 3 + idleOffset,
      duration: 2.5 + Math.random() * 2, // 2.5-4.5s
      rotation: Math.random() * 360,
    }));
  }, [idleOffset]);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      onClick={onClick}
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background,
        boxShadow: `0 4px 12px rgba(0,0,0,0.1), 0 3px 0 ${shadowColor}`,
        border: "3px solid rgba(255,255,255,0.9)",
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Pulsing Glow Aura */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 2 + idleOffset * 0.3,
          delay: idleOffset * 0.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Star Sparkle Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute pointer-events-none"
          style={{
            left: "50%",
            top: "50%",
            marginLeft: -particle.size / 2,
            marginTop: -particle.size / 2,
          }}
          animate={{
            x: [0, particle.x, particle.x * 0.5, 0],
            y: [0, particle.y, particle.y * 0.5, 0],
            opacity: [0, 1, 0.6, 0],
            scale: [0.3, 1, 0.8, 0.3],
            rotate: [0, particle.rotation, particle.rotation + 180, particle.rotation + 360],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <StarSparkle size={particle.size} color={particleColor} />
        </motion.div>
      ))}

      {/* Floating Icon with unique timing */}
      <motion.img
        src={iconSrc}
        alt={alt}
        className="object-contain relative z-10"
        style={{ width: iconSize, height: iconSize }}
        animate={{
          y: [0, -2, 0],
          rotate: [-2, 2, -2],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 2.5 + idleOffset * 0.4,
          delay: idleOffset * 0.15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Badge */}
      {badge}
    </motion.button>
  );
}
