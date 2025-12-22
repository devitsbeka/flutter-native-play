import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Petal {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  color: string;
}

interface Butterfly {
  id: number;
  x: number;
  y: number;
  color1: string;
  color2: string;
  duration: number;
}

const petalColors = ["#fda4af", "#f9a8d4", "#fecdd3", "#fbcfe8"];

export function SpringBackground() {
  const [petals, setPetals] = useState<Petal[]>([]);
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);

  useEffect(() => {
    const newPetals: Petal[] = Array.from({ length: 35 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 6,
      size: 12 + Math.random() * 16,
      rotation: Math.random() * 360,
      color: petalColors[Math.floor(Math.random() * petalColors.length)],
    }));
    setPetals(newPetals);

    const newButterflies: Butterfly[] = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      x: 20 + i * 30,
      y: 25 + i * 15,
      color1: i === 0 ? "#8b5cf6" : i === 1 ? "#ec4899" : "#06b6d4",
      color2: i === 0 ? "#a78bfa" : i === 1 ? "#f472b6" : "#22d3ee",
      duration: 8 + i * 2,
    }));
    setButterflies(newButterflies);
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

      {/* Floating cherry blossom petals - SVG shapes */}
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
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-sm">
            <ellipse 
              cx="12" 
              cy="12" 
              rx="10" 
              ry="6" 
              fill={petal.color}
              opacity="0.85"
            />
            <ellipse 
              cx="12" 
              cy="10" 
              rx="7" 
              ry="3" 
              fill="white"
              opacity="0.3"
            />
          </svg>
        </motion.div>
      ))}

      {/* SVG Butterflies */}
      {butterflies.map((butterfly) => (
        <motion.div
          key={`butterfly-${butterfly.id}`}
          className="absolute"
          style={{ left: `${butterfly.x}%`, top: `${butterfly.y}%` }}
          animate={{
            x: [0, 50, -30, 20, 0],
            y: [0, -30, 20, -10, 0],
          }}
          transition={{
            duration: butterfly.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.svg 
            width="32" 
            height="24" 
            viewBox="0 0 32 24"
            animate={{ rotateY: [0, 180, 0] }}
            transition={{ duration: 0.3, repeat: Infinity }}
          >
            {/* Left wing */}
            <ellipse 
              cx="8" 
              cy="12" 
              rx="7" 
              ry="10" 
              fill={butterfly.color1}
              opacity="0.9"
            />
            <ellipse 
              cx="7" 
              cy="10" 
              rx="4" 
              ry="5" 
              fill={butterfly.color2}
              opacity="0.7"
            />
            {/* Right wing */}
            <ellipse 
              cx="24" 
              cy="12" 
              rx="7" 
              ry="10" 
              fill={butterfly.color1}
              opacity="0.9"
            />
            <ellipse 
              cx="25" 
              cy="10" 
              rx="4" 
              ry="5" 
              fill={butterfly.color2}
              opacity="0.7"
            />
            {/* Body */}
            <ellipse cx="16" cy="12" rx="2" ry="8" fill="#1f2937" />
            {/* Antennae */}
            <line x1="14" y1="4" x2="12" y2="1" stroke="#1f2937" strokeWidth="0.5" />
            <line x1="18" y1="4" x2="20" y2="1" stroke="#1f2937" strokeWidth="0.5" />
          </motion.svg>
        </motion.div>
      ))}

      {/* SVG Flowers at corners */}
      <motion.div 
        className="absolute bottom-20 left-10"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <FlowerSVG color="#f472b6" size={48} />
      </motion.div>
      <motion.div 
        className="absolute bottom-40 right-10"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
      >
        <TulipSVG color="#ec4899" size={40} />
      </motion.div>
      <motion.div 
        className="absolute top-1/4 left-5"
        animate={{ rotate: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        <DaisySVG color="#fbbf24" size={32} />
      </motion.div>
    </div>
  );
}

function FlowerSVG({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="opacity-60">
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="24"
          cy="12"
          rx="8"
          ry="10"
          fill={color}
          transform={`rotate(${angle} 24 24)`}
          opacity="0.8"
        />
      ))}
      <circle cx="24" cy="24" r="6" fill="#fbbf24" />
      <circle cx="24" cy="24" r="3" fill="#f59e0b" />
    </svg>
  );
}

function TulipSVG({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 48" className="opacity-50">
      <path
        d="M20 8 C12 8 8 16 8 24 C8 32 16 36 20 36 C24 36 32 32 32 24 C32 16 28 8 20 8"
        fill={color}
      />
      <path
        d="M20 8 C18 12 18 20 20 36"
        stroke="#22c55e"
        strokeWidth="3"
        fill="none"
      />
      <ellipse cx="17" cy="16" rx="4" ry="6" fill="white" opacity="0.3" />
    </svg>
  );
}

function DaisySVG({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="opacity-40">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <ellipse
          key={angle}
          cx="16"
          cy="6"
          rx="3"
          ry="6"
          fill="white"
          transform={`rotate(${angle} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="5" fill={color} />
    </svg>
  );
}