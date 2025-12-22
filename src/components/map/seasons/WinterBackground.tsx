import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

export function WinterBackground() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    const newSnowflakes: Snowflake[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 10,
      size: 8 + Math.random() * 16,
      opacity: 0.4 + Math.random() * 0.6,
    }));
    setSnowflakes(newSnowflakes);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Cold gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #1e3a5f 0%, #3b82f6 30%, #93c5fd 60%, #dbeafe 100%)"
        }}
      />

      {/* Aurora effect */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1/3 opacity-30"
        style={{
          background: "linear-gradient(90deg, #22d3ee 0%, #a855f7 50%, #22d3ee 100%)",
          filter: "blur(40px)",
        }}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      {/* Snow ground */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/4"
        style={{
          background: "linear-gradient(180deg, transparent 0%, #f8fafc 30%, #ffffff 100%)"
        }}
      />

      {/* Falling snowflakes */}
      {snowflakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="absolute text-white"
          style={{ 
            left: `${flake.x}%`, 
            top: -20,
            fontSize: flake.size,
            opacity: flake.opacity,
          }}
          initial={{ y: -30, opacity: 0 }}
          animate={{
            y: "110vh",
            opacity: [0, flake.opacity, flake.opacity, 0],
            x: [0, 15, -10, 5, 0],
          }}
          transition={{
            duration: flake.duration,
            delay: flake.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          ❄️
        </motion.div>
      ))}

      {/* Twinkling stars */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 40}%`,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 2,
            repeat: Infinity,
          }}
        />
      ))}

      {/* Snowy trees */}
      <div className="absolute bottom-5 left-5 text-6xl">🎄</div>
      <div className="absolute bottom-10 right-10 text-5xl">🌲</div>
      <div className="absolute bottom-8 left-1/4 text-4xl">🎄</div>

      {/* Winter items */}
      <div className="absolute bottom-3 left-1/3 text-3xl">⛄</div>
      <div className="absolute bottom-20 right-1/4 text-2xl">🦌</div>

      {/* Icicles at top */}
      <div className="absolute top-0 left-0 right-0 flex justify-around">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={`icicle-${i}`}
            className="w-3 bg-gradient-to-b from-cyan-200 to-transparent"
            style={{
              height: 20 + Math.random() * 30,
              clipPath: "polygon(50% 100%, 0 0, 100% 0)",
            }}
            animate={{ opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Cozy cabin */}
      <div className="absolute bottom-8 right-5 text-3xl">🏔️</div>
    </div>
  );
}
