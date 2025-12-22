import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Gift, Star, Gem, Zap } from "lucide-react";

interface TreasureChestNodeProps {
  levelPosition: number; // 5, 10, 15, etc.
  x: number;
  y: number;
  isUnlocked: boolean;
  isOpened: boolean;
  onOpen: () => void;
}

interface LootItem {
  type: "xp" | "gem" | "powerup";
  amount: number;
  icon: React.ReactNode;
  color: string;
}

export function TreasureChestNode({ 
  levelPosition, 
  x, 
  y, 
  isUnlocked, 
  isOpened, 
  onOpen 
}: TreasureChestNodeProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [showLoot, setShowLoot] = useState(false);
  const [loot, setLoot] = useState<LootItem[]>([]);

  const generateLoot = (): LootItem[] => {
    const items: LootItem[] = [
      { 
        type: "xp", 
        amount: 100 + levelPosition * 10, 
        icon: <Zap className="w-4 h-4" />, 
        color: "from-amber-400 to-orange-500" 
      },
    ];

    // Add gem at every 10th level
    if (levelPosition % 10 === 0) {
      items.push({ 
        type: "gem", 
        amount: Math.floor(levelPosition / 10), 
        icon: <Gem className="w-4 h-4" />, 
        color: "from-purple-400 to-pink-500" 
      });
    }

    // Random powerup chance
    if (Math.random() > 0.5) {
      items.push({ 
        type: "powerup", 
        amount: 1, 
        icon: <Star className="w-4 h-4" />, 
        color: "from-cyan-400 to-blue-500" 
      });
    }

    return items;
  };

  const handleOpen = async () => {
    if (!isUnlocked || isOpened || isOpening) return;

    setIsOpening(true);
    const generatedLoot = generateLoot();
    setLoot(generatedLoot);

    // Wait for opening animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FFD700", "#FFA500", "#FF69B4", "#00CED1", "#9370DB"],
    });

    setShowLoot(true);
    onOpen();

    // Hide loot after display
    setTimeout(() => {
      setShowLoot(false);
      setIsOpening(false);
    }, 3000);
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}vh`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Sparkle effects for unlocked chest */}
      {isUnlocked && !isOpened && !isOpening && (
        <>
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${50 + Math.cos((i / 4) * Math.PI * 2) * 50}%`,
                top: `${50 + Math.sin((i / 4) * Math.PI * 2) * 50}%`,
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
            </motion.div>
          ))}
        </>
      )}

      {/* Glow effect */}
      {isUnlocked && !isOpened && (
        <motion.div
          className="absolute inset-0 -m-6 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(45 100% 50% / 0.4) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Chest container */}
      <motion.button
        onClick={handleOpen}
        disabled={!isUnlocked || isOpened}
        className="relative"
        whileHover={isUnlocked && !isOpened ? { scale: 1.15 } : {}}
        whileTap={isUnlocked && !isOpened ? { scale: 0.95 } : {}}
        animate={
          isUnlocked && !isOpened
            ? { y: [0, -5, 0] }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Chest emoji with states */}
        <motion.div
          className={`text-5xl ${!isUnlocked ? "grayscale opacity-50" : ""}`}
          animate={isOpening ? { rotateX: [0, -30, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {isOpened || isOpening ? "📭" : "🎁"}
        </motion.div>

        {/* Lock indicator */}
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
        )}
      </motion.button>

      {/* Loot display */}
      <AnimatePresence>
        {showLoot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: -60 }}
            exit={{ opacity: 0, y: -100 }}
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            {loot.map((item, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: index * 0.2, type: "spring" }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${item.color} shadow-lg`}
              >
                <span className="text-white">{item.icon}</span>
                <span className="text-sm font-bold text-white">
                  +{item.amount} {item.type === "xp" ? "XP" : item.type === "gem" ? "💎" : "⭐"}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level requirement label */}
      <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap ${
        isUnlocked ? "text-amber-600" : "text-muted-foreground"
      }`}>
        Lvl {levelPosition}
      </div>
    </div>
  );
}
