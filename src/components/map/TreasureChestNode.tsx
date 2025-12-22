import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Star, Gem, Zap, Lock } from "lucide-react";

interface TreasureChestNodeProps {
  levelPosition: number;
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

    if (levelPosition % 10 === 0) {
      items.push({ 
        type: "gem", 
        amount: Math.floor(levelPosition / 10), 
        icon: <Gem className="w-4 h-4" />, 
        color: "from-purple-400 to-pink-500" 
      });
    }

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

    await new Promise(resolve => setTimeout(resolve, 500));
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FFD700", "#FFA500", "#FF69B4", "#00CED1", "#9370DB"],
    });

    setShowLoot(true);
    onOpen();

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
        {/* SVG Treasure Chest */}
        <motion.div
          className={`${!isUnlocked ? "grayscale opacity-50" : ""}`}
          animate={isOpening ? { rotateX: [0, -30, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <ChestSVG isOpen={isOpened || isOpening} />
        </motion.div>

        {/* Lock indicator */}
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
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
                  +{item.amount} {item.type.toUpperCase()}
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

function ChestSVG({ isOpen }: { isOpen: boolean }) {
  return (
    <svg width="56" height="48" viewBox="0 0 56 48">
      {/* Chest body */}
      <rect x="4" y="20" width="48" height="24" rx="4" fill="#92400e" />
      <rect x="6" y="22" width="44" height="20" rx="3" fill="#b45309" />
      
      {/* Gold trim */}
      <rect x="4" y="30" width="48" height="4" fill="#fbbf24" />
      
      {/* Lock plate */}
      <rect x="22" y="26" width="12" height="14" rx="2" fill="#fbbf24" />
      <circle cx="28" cy="33" r="3" fill="#92400e" />
      
      {/* Chest lid */}
      <motion.g
        animate={{ rotateX: isOpen ? -60 : 0 }}
        style={{ transformOrigin: "28px 20px" }}
        transition={{ duration: 0.3 }}
      >
        <path
          d="M4 20 L4 12 C4 8 10 4 28 4 C46 4 52 8 52 12 L52 20 L4 20"
          fill="#92400e"
        />
        <path
          d="M6 18 L6 12 C6 9 12 6 28 6 C44 6 50 9 50 12 L50 18 L6 18"
          fill="#b45309"
        />
        {/* Lid gold trim */}
        <rect x="4" y="16" width="48" height="4" fill="#fbbf24" />
        {/* Lid lock */}
        <rect x="24" y="10" width="8" height="8" rx="1" fill="#fbbf24" />
      </motion.g>
      
      {/* Treasure glow when open */}
      {isOpen && (
        <motion.ellipse
          cx="28"
          cy="28"
          rx="16"
          ry="8"
          fill="#fbbf24"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
      
      {/* Gems inside when open */}
      {isOpen && (
        <>
          <circle cx="20" cy="32" r="4" fill="#ec4899" />
          <circle cx="28" cy="30" r="5" fill="#8b5cf6" />
          <circle cx="36" cy="32" r="4" fill="#06b6d4" />
        </>
      )}
    </svg>
  );
}