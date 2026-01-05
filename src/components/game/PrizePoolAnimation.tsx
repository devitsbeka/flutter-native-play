import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import coinIcon from "@/assets/icons/icon-coin.png";
import { REWARDS } from "@/config/rewardConfig";

interface PrizePoolAnimationProps {
  isVisible: boolean;
  playerCoins: number;
  opponentCoins: number;
}

// Individual flying coin component
const FlyingCoin = ({ 
  delay, 
  fromSide, 
  onComplete 
}: { 
  delay: number; 
  fromSide: "left" | "right"; 
  onComplete: () => void;
}) => {
  const startX = fromSide === "left" ? -60 : 60;
  
  return (
    <motion.div
      className="absolute"
      initial={{ 
        x: startX, 
        y: 30, 
        opacity: 0,
        scale: 0.6 
      }}
      animate={{ 
        x: 0, 
        y: 0, 
        opacity: [0, 1, 1, 0],
        scale: [0.6, 1, 0.8, 0.5]
      }}
      transition={{ 
        delay, 
        duration: 0.6,
        ease: "easeOut",
        times: [0, 0.3, 0.7, 1]
      }}
      onAnimationComplete={onComplete}
    >
      <img src={coinIcon} alt="" className="w-5 h-5" />
    </motion.div>
  );
};

export function PrizePoolAnimation({ 
  isVisible, 
  playerCoins, 
  opponentCoins 
}: PrizePoolAnimationProps) {
  const [poolAmount, setPoolAmount] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState<Array<{ id: number; side: "left" | "right" }>>([]);
  const [coinIdCounter, setCoinIdCounter] = useState(0);
  const targetAmount = REWARDS.GAME_WIN_REWARD; // 1000 coins
  const stakePerPlayer = REWARDS.GAME_STAKE; // 500 coins each

  // Animate coins flowing into pool
  useEffect(() => {
    if (!isVisible) {
      setPoolAmount(0);
      setFlyingCoins([]);
      return;
    }

    // Generate flying coins
    const coinInterval = setInterval(() => {
      if (poolAmount >= targetAmount) {
        clearInterval(coinInterval);
        return;
      }

      setCoinIdCounter(prev => prev + 1);
      const newSide = Math.random() > 0.5 ? "left" : "right";
      setFlyingCoins(prev => [...prev, { id: coinIdCounter, side: newSide as "left" | "right" }]);
    }, 80);

    // Count up the pool amount
    const countInterval = setInterval(() => {
      setPoolAmount(prev => {
        if (prev >= targetAmount) {
          clearInterval(countInterval);
          return targetAmount;
        }
        return Math.min(prev + 50, targetAmount);
      });
    }, 50);

    return () => {
      clearInterval(coinInterval);
      clearInterval(countInterval);
    };
  }, [isVisible, poolAmount, targetAmount, coinIdCounter]);

  const removeFlyingCoin = (id: number) => {
    setFlyingCoins(prev => prev.filter(c => c.id !== id));
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute -top-[200px] left-0 right-0 z-20 flex justify-center px-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            {/* Pool Container */}
            <div 
              className="relative px-6 py-3 rounded-2xl backdrop-blur-md flex items-center gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.15) 100%)",
                border: "2px solid rgba(255,215,0,0.4)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              {/* Flying coins container */}
              <div className="absolute inset-0 flex items-center justify-center overflow-visible">
                {flyingCoins.slice(-10).map(coin => (
                  <FlyingCoin
                    key={coin.id}
                    delay={0}
                    fromSide={coin.side}
                    onComplete={() => removeFlyingCoin(coin.id)}
                  />
                ))}
              </div>

              {/* Trophy/Pool Icon */}
              <motion.div
                className="relative w-10 h-10 flex items-center justify-center"
                animate={poolAmount < targetAmount ? { 
                  scale: [1, 1.1, 1],
                  rotate: [-2, 2, -2]
                } : {
                  scale: [1, 1.15, 1],
                }}
                transition={{ 
                  duration: poolAmount < targetAmount ? 0.3 : 0.5, 
                  repeat: poolAmount < targetAmount ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                <img 
                  src={coinIcon} 
                  alt="" 
                  className="w-8 h-8 drop-shadow-lg" 
                />
                {/* Glow effect when full */}
                {poolAmount >= targetAmount && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ 
                      opacity: [0.5, 0, 0.5],
                      scale: [1, 1.5, 1]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      background: "radial-gradient(circle, rgba(255,215,0,0.6) 0%, transparent 70%)",
                    }}
                  />
                )}
              </motion.div>

              {/* Prize Pool Text */}
              <div className="flex flex-col items-start">
                <span className="text-white/60 text-xs font-medium uppercase tracking-wide">
                  პრიზი
                </span>
                <motion.div 
                  className="flex items-center gap-1"
                  key={poolAmount}
                >
                  <motion.span
                    className="text-2xl font-black text-amber-300"
                    style={{ 
                      fontFamily: "'TASolivare', sans-serif",
                      textShadow: "0 2px 8px rgba(255,165,0,0.5)"
                    }}
                    animate={poolAmount >= targetAmount ? {
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {poolAmount.toLocaleString()}
                  </motion.span>
                  <span className="text-amber-300/80 text-sm font-medium">
                    ₾
                  </span>
                </motion.div>
              </div>

              {/* Progress indicator */}
              {poolAmount < targetAmount && (
                <motion.div 
                  className="absolute -bottom-1 left-4 right-4 h-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ 
                      background: "linear-gradient(90deg, #FFD700, #FFA500)",
                      width: `${(poolAmount / targetAmount) * 100}%`
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </motion.div>
              )}
            </div>

            {/* Side indicators showing coins flowing from players */}
            <div className="flex items-center justify-center gap-8 mt-2">
              {/* Left player contribution */}
              <motion.div
                className="flex items-center gap-1 text-white/50 text-xs"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span>-{stakePerPlayer}</span>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  →
                </motion.div>
              </motion.div>

              {/* Right player contribution */}
              <motion.div
                className="flex items-center gap-1 text-white/50 text-xs"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  animate={{ x: [0, -5, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  ←
                </motion.div>
                <span>-{stakePerPlayer}</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
