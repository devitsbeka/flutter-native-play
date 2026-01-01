import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

interface Particle {
  id: number;
  x: number;
  y: number;
  delay: number;
  scale: number;
  rotation: number;
}

interface FlyingCurrencyProps {
  type: "coins" | "gems";
  amount: number;
  isActive: boolean;
  onComplete?: () => void;
  originX?: number;
  originY?: number;
}

export function FlyingCurrency({ 
  type, 
  amount, 
  isActive, 
  onComplete,
  originX = 50,
  originY = 50,
}: FlyingCurrencyProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isActive && amount > 0) {
      // Create particles based on amount (max 15 for performance)
      const particleCount = Math.min(Math.ceil(amount / 10), 15);
      const newParticles: Particle[] = [];
      
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: Date.now() + i,
          x: originX + (Math.random() - 0.5) * 60,
          y: originY + (Math.random() - 0.5) * 40,
          delay: i * 0.05,
          scale: 0.6 + Math.random() * 0.4,
          rotation: Math.random() * 360,
        });
      }
      
      setParticles(newParticles);
      
      // Clear particles after animation and call onComplete
      const timeout = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 1500);
      
      return () => clearTimeout(timeout);
    }
  }, [isActive, amount, originX, originY, onComplete]);

  const icon = type === "coins" ? coinIcon : gemIcon;
  const glowColor = type === "coins" ? "rgba(255, 215, 0, 0.6)" : "rgba(168, 85, 247, 0.6)";

  return (
    <AnimatePresence>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="fixed pointer-events-none z-[200]"
          initial={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: 0,
            scale: 0,
            rotate: particle.rotation,
          }}
          animate={{
            left: ["calc(50% - 20px)", "calc(50% + 30px)", "85%"],
            top: ["50%", "30%", "8%"],
            opacity: [0, 1, 1, 0],
            scale: [0, particle.scale, particle.scale * 0.8, 0],
            rotate: [particle.rotation, particle.rotation + 180, particle.rotation + 360],
          }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{
            duration: 1.2,
            delay: particle.delay,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.2, 0.7, 1],
          }}
        >
          <motion.img
            src={icon}
            alt=""
            className="w-8 h-8"
            style={{
              filter: `drop-shadow(0 0 12px ${glowColor})`,
            }}
            animate={{
              filter: [
                `drop-shadow(0 0 8px ${glowColor})`,
                `drop-shadow(0 0 20px ${glowColor})`,
                `drop-shadow(0 0 8px ${glowColor})`,
              ],
            }}
            transition={{ duration: 0.4, repeat: 2 }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// Hook for easy use in components
export function useFlyingCurrency() {
  const [flyingState, setFlyingState] = useState<{
    type: "coins" | "gems";
    amount: number;
    isActive: boolean;
  }>({
    type: "coins",
    amount: 0,
    isActive: false,
  });

  const triggerFlyingCurrency = (type: "coins" | "gems", amount: number) => {
    setFlyingState({ type, amount, isActive: true });
    
    // Reset after animation
    setTimeout(() => {
      setFlyingState(prev => ({ ...prev, isActive: false }));
    }, 1600);
  };

  return {
    flyingState,
    triggerFlyingCurrency,
    FlyingCurrencyComponent: () => (
      <FlyingCurrency
        type={flyingState.type}
        amount={flyingState.amount}
        isActive={flyingState.isActive}
      />
    ),
  };
}
