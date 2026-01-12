import { motion } from "framer-motion";
import { ReactNode } from "react";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
}

// League tier gradient configurations
const TIER_GRADIENTS: Record<number, { colors: string[]; name: string }> = {
  1: {
    name: "Bronze",
    colors: ["#CD7F32", "#8B4513", "#D2691E", "#A0522D"],
  },
  2: {
    name: "Silver",
    colors: ["#C0C0C0", "#A8A8A8", "#808080", "#B8B8B8"],
  },
  3: {
    name: "Gold",
    colors: ["#FFD700", "#FFA500", "#DAA520", "#F4C430"],
  },
  4: {
    name: "Diamond",
    colors: ["#00CED1", "#40E0D0", "#48D1CC", "#00BFFF"],
  },
  5: {
    name: "Champion",
    colors: ["#9400D3", "#8A2BE2", "#9932CC", "#BA55D3"],
  },
};

export function LeaderboardHeroBackground({ tier, children }: LeaderboardHeroBackgroundProps) {
  const gradientConfig = TIER_GRADIENTS[tier] || TIER_GRADIENTS[1];
  
  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        {/* Base gradient layer */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${gradientConfig.colors[0]}40 0%, ${gradientConfig.colors[1]}30 25%, ${gradientConfig.colors[2]}40 50%, ${gradientConfig.colors[3]}30 75%, ${gradientConfig.colors[0]}40 100%)`,
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        
        {/* Floating orbs for visual interest */}
        <motion.div
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-30"
          style={{
            background: `radial-gradient(circle, ${gradientConfig.colors[0]} 0%, transparent 70%)`,
            top: "-20%",
            left: "-10%",
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div
          className="absolute w-48 h-48 rounded-full blur-3xl opacity-25"
          style={{
            background: `radial-gradient(circle, ${gradientConfig.colors[2]} 0%, transparent 70%)`,
            top: "10%",
            right: "-15%",
          }}
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        
        <motion.div
          className="absolute w-32 h-32 rounded-full blur-2xl opacity-20"
          style={{
            background: `radial-gradient(circle, ${gradientConfig.colors[1]} 0%, transparent 70%)`,
            bottom: "10%",
            left: "20%",
          }}
          animate={{
            x: [0, 25, 0],
            y: [0, -15, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${gradientConfig.colors[0]} 50%, transparent 100%)`,
            backgroundSize: "200% 100%",
          }}
          animate={{
            backgroundPosition: ["-100% 0%", "200% 0%"],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 2,
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
