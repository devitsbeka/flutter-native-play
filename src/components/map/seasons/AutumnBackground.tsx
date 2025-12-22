import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Leaf {
  id: number;
  x: number;
  delay: number;
  duration: number;
  emoji: string;
  rotation: number;
}

const leafEmojis = ["🍂", "🍁", "🍃", "🍂", "🍁"];

export function AutumnBackground() {
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  useEffect(() => {
    const newLeaves: Leaf[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 8,
      emoji: leafEmojis[Math.floor(Math.random() * leafEmojis.length)],
      rotation: Math.random() * 360,
    }));
    setLeaves(newLeaves);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Warm gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #fed7aa 0%, #fdba74 30%, #fb923c 60%, #ea580c 100%)"
        }}
      />

      {/* Misty overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: "linear-gradient(180deg, transparent 0%, #fef3c7 50%, transparent 100%)"
        }}
      />

      {/* Falling leaves */}
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          className="absolute text-2xl"
          style={{ left: `${leaf.x}%`, top: -30 }}
          initial={{ y: -50, rotate: leaf.rotation, opacity: 0 }}
          animate={{
            y: "110vh",
            rotate: leaf.rotation + 720,
            opacity: [0, 1, 1, 0],
            x: [0, 40, -30, 20, -10, 0],
          }}
          transition={{
            duration: leaf.duration,
            delay: leaf.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {leaf.emoji}
        </motion.div>
      ))}

      {/* Trees silhouettes */}
      <div className="absolute bottom-0 left-5 text-7xl opacity-60">🌳</div>
      <div className="absolute bottom-0 right-10 text-6xl opacity-50">🌲</div>
      <div className="absolute bottom-10 left-1/4 text-5xl opacity-40">🌳</div>

      {/* Pumpkins */}
      <div className="absolute bottom-5 left-1/3 text-4xl">🎃</div>
      <div className="absolute bottom-8 right-1/4 text-3xl">🎃</div>

      {/* Acorns and mushrooms */}
      <div className="absolute bottom-3 left-1/2 text-2xl">🌰</div>
      <div className="absolute bottom-5 right-1/3 text-xl">🍄</div>

      {/* Wind effect - subtle moving lines */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={`wind-${i}`}
          className="absolute h-px bg-amber-200/30"
          style={{ 
            left: 0, 
            right: 0, 
            top: `${20 + i * 20}%`,
            height: 2,
          }}
          animate={{ 
            x: ["-100%", "100%"],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 4 + i,
            delay: i * 0.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Cozy cabin in distance */}
      <div className="absolute bottom-20 right-5 text-3xl opacity-50">🏠</div>
    </div>
  );
}
