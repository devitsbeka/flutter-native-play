import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Petal {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

export function SpringBackground() {
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    const newPetals: Petal[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 6,
      size: 12 + Math.random() * 16,
      rotation: Math.random() * 360,
    }));
    setPetals(newPetals);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #fdf2f8 0%, #fce7f3 30%, #fbcfe8 60%, #f9a8d4 100%)"
        }}
      />

      {/* Subtle grass gradient at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/3"
        style={{
          background: "linear-gradient(180deg, transparent 0%, #dcfce7 100%)"
        }}
      />

      {/* Floating cherry blossom petals */}
      {petals.map((petal) => (
        <motion.div
          key={petal.id}
          className="absolute"
          style={{
            left: `${petal.x}%`,
            top: -20,
            width: petal.size,
            height: petal.size,
          }}
          initial={{ y: -50, rotate: petal.rotation, opacity: 0 }}
          animate={{
            y: "110vh",
            rotate: petal.rotation + 360,
            opacity: [0, 1, 1, 0],
            x: [0, 30, -20, 10, 0],
          }}
          transition={{
            duration: petal.duration,
            delay: petal.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <ellipse 
              cx="12" 
              cy="12" 
              rx="10" 
              ry="6" 
              fill="#fda4af"
              opacity="0.8"
            />
          </svg>
        </motion.div>
      ))}

      {/* Butterflies */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={`butterfly-${i}`}
          className="absolute text-3xl"
          style={{ left: `${20 + i * 25}%`, top: `${30 + i * 10}%` }}
          animate={{
            x: [0, 50, -30, 20, 0],
            y: [0, -30, 20, -10, 0],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          🦋
        </motion.div>
      ))}

      {/* Subtle flowers at corners */}
      <div className="absolute bottom-20 left-10 text-5xl opacity-60">🌸</div>
      <div className="absolute bottom-40 right-10 text-4xl opacity-50">🌷</div>
      <div className="absolute top-1/4 left-5 text-3xl opacity-40">🌼</div>
    </div>
  );
}
