import { motion } from "framer-motion";
import { ReactNode, useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
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
}

export function ActionButtonWithParticles({
  iconSrc,
  alt,
  onClick,
  background,
  shadowColor,
  badge,
  delay = 0,
  particleColor = "rgba(255,255,255,0.8)",
}: ActionButtonWithParticlesProps) {
  // Generate random particles
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 60 - 30, // -30 to 30
      y: Math.random() * 60 - 30,
      size: Math.random() * 4 + 2, // 2 to 6px
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2, // 2-4s
    }));
  }, []);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      onClick={onClick}
      className="relative rounded-full flex items-center justify-center overflow-visible"
      style={{
        width: 73,
        height: 73,
        background,
        boxShadow: `0 4px 12px rgba(0,0,0,0.1), 0 3px 0 ${shadowColor}`,
        border: "3px solid rgba(255,255,255,0.9)",
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: particle.size,
            height: particle.size,
            background: particleColor,
            left: "50%",
            top: "50%",
            marginLeft: -particle.size / 2,
            marginTop: -particle.size / 2,
          }}
          animate={{
            x: [0, particle.x, 0],
            y: [0, particle.y, 0],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Floating Icon */}
      <motion.img
        src={iconSrc}
        alt={alt}
        className="object-contain relative z-10"
        style={{ width: 52, height: 52 }}
        animate={{
          y: [0, -4, 0],
          rotate: [0, 2, 0, -2, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Badge */}
      {badge}
    </motion.button>
  );
}
