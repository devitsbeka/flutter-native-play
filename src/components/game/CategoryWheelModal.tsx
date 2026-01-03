import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";
import confetti from "canvas-confetti";

interface CategoryWheelModalProps {
  isOpen: boolean;
  onCategorySelected: (categoryId: string, categoryName: string) => void;
  playerAvatar?: string | null;
  opponentAvatar?: string | null;
}

const WHEEL_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD",
];

export function CategoryWheelModal({ 
  isOpen, 
  onCategorySelected,
  playerAvatar,
  opponentAvatar,
}: CategoryWheelModalProps) {
  const { categories } = useCategories();
  const [wheelCategories, setWheelCategories] = useState<Array<{ id: string; name: string; icon: string }>>([]);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [phase, setPhase] = useState<"ready" | "spinning" | "revealing" | "done">("ready");
  const spinStarted = useRef(false);

  // Select 6 random categories when modal opens
  useEffect(() => {
    if (isOpen && categories.length > 0 && wheelCategories.length === 0) {
      const shuffled = [...categories].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 6).map(c => ({
        id: c.category_id || c.id,
        name: c.name,
        icon: c.icon || "📚",
      }));
      setWheelCategories(selected);
    }
  }, [isOpen, categories]);

  // Auto-start spin when modal opens
  useEffect(() => {
    if (isOpen && wheelCategories.length > 0 && !spinStarted.current) {
      spinStarted.current = true;
      setTimeout(() => {
        startSpin();
      }, 800);
    }
  }, [isOpen, wheelCategories]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      spinStarted.current = false;
      setWheelCategories([]);
      setRotation(0);
      setIsSpinning(false);
      setSelectedCategory(null);
      setPhase("ready");
    }
  }, [isOpen]);

  const startSpin = () => {
    if (isSpinning || wheelCategories.length === 0) return;
    
    setIsSpinning(true);
    setPhase("spinning");
    
    // Random winning segment (0-5)
    const winningIndex = Math.floor(Math.random() * 6);
    
    // Calculate rotation: multiple full spins + precise landing
    const segmentAngle = 360 / 6;
    const baseRotation = 360 * 5; // 5 full spins
    // Land on winning segment (pointing UP means segment at top = -90deg offset)
    const targetAngle = baseRotation + (360 - (winningIndex * segmentAngle)) - segmentAngle / 2;
    
    setRotation(targetAngle);

    // After spin completes
    setTimeout(() => {
      setIsSpinning(false);
      setPhase("revealing");
      const winner = wheelCategories[winningIndex];
      setSelectedCategory(winner);
      
      // Celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
      });

      // Auto-proceed after reveal
      setTimeout(() => {
        setPhase("done");
        onCategorySelected(winner.id, winner.name);
      }, 2000);
    }, 4000);
  };

  if (!isOpen) return null;

  const segmentAngle = 360 / 6;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 
            className="text-3xl font-black text-white mb-2"
            style={{ fontFamily: "'TASolivare', sans-serif" }}
          >
            {phase === "spinning" ? "ბრუნვა..." : phase === "revealing" || phase === "done" ? "კატეგორია!" : "კატეგორიის არჩევა"}
          </h1>
          <p className="text-white/60 text-sm">ბორბალი აირჩევს თამაშის კატეგორიას</p>
        </motion.div>

        {/* Player Avatars watching */}
        <div className="flex items-center justify-center gap-8 mb-4">
          {/* Player */}
          <motion.div
            animate={{ y: isSpinning ? [0, -5, 0] : 0 }}
            transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0 }}
            className="w-16 h-16 rounded-full overflow-hidden border-3 border-white/30"
            style={{ background: "linear-gradient(135deg, #5EE8B5, #3FC99A)" }}
          >
            {playerAvatar ? (
              <img src={playerAvatar} alt="You" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
            )}
          </motion.div>

          {/* VS */}
          <span className="text-white/40 font-bold text-lg">VS</span>

          {/* Opponent */}
          <motion.div
            animate={{ y: isSpinning ? [0, -5, 0] : 0 }}
            transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0, delay: 0.25 }}
            className="w-16 h-16 rounded-full overflow-hidden border-3 border-white/30"
            style={{ background: "linear-gradient(135deg, #FF6B6B, #EE5A5A)" }}
          >
            {opponentAvatar ? (
              <img src={opponentAvatar} alt="Opponent" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🤖</div>
            )}
          </motion.div>
        </div>

        {/* Wheel Container */}
        <div className="relative" style={{ width: 280, height: 280 }}>
          {/* Pointer */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10"
            style={{
              width: 0,
              height: 0,
              borderLeft: "15px solid transparent",
              borderRight: "15px solid transparent",
              borderTop: "25px solid #FFD700",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
            }}
          />

          {/* Wheel */}
          <motion.div
            className="relative w-full h-full rounded-full overflow-hidden"
            style={{
              boxShadow: "0 0 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.1)",
              border: "4px solid rgba(255,255,255,0.2)",
            }}
            animate={{ rotate: rotation }}
            transition={{
              duration: 4,
              ease: [0.17, 0.67, 0.12, 0.99],
            }}
          >
            {wheelCategories.map((cat, index) => {
              const startAngle = index * segmentAngle;
              const midAngle = startAngle + segmentAngle / 2;
              
              return (
                <div
                  key={cat.id}
                  className="absolute w-full h-full"
                  style={{
                    clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + segmentAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle + segmentAngle - 90) * Math.PI / 180)}%)`,
                    background: WHEEL_COLORS[index % WHEEL_COLORS.length],
                  }}
                >
                  {/* Category label */}
                  <div
                    className="absolute flex flex-col items-center justify-center"
                    style={{
                      left: `${50 + 30 * Math.cos((midAngle - 90) * Math.PI / 180)}%`,
                      top: `${50 + 30 * Math.sin((midAngle - 90) * Math.PI / 180)}%`,
                      transform: `translate(-50%, -50%) rotate(${midAngle}deg)`,
                    }}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span 
                      className="text-[9px] font-bold text-white max-w-[50px] text-center leading-tight"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                    >
                      {cat.name.length > 12 ? cat.name.slice(0, 10) + "..." : cat.name}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Center circle */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full"
              style={{
                background: "radial-gradient(circle, #FFD700 0%, #FFA500 100%)",
                boxShadow: "0 0 15px rgba(255,215,0,0.5)",
              }}
            />
          </motion.div>
        </div>

        {/* Selected Category Reveal */}
        <AnimatePresence>
          {selectedCategory && (phase === "revealing" || phase === "done") && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="mt-6 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="text-5xl mb-2"
              >
                {selectedCategory.icon}
              </motion.div>
              <h2 
                className="text-2xl font-black text-white"
                style={{ fontFamily: "'TASolivare', sans-serif" }}
              >
                {selectedCategory.name}
              </h2>
              <p className="text-white/60 text-sm mt-1">თამაში იწყება...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Decorative particles */}
        {isSpinning && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: WHEEL_COLORS[i % WHEEL_COLORS.length],
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -200],
                  x: [0, (Math.random() - 0.5) * 100],
                  opacity: [1, 0],
                  scale: [1, 0],
                }}
                transition={{
                  duration: 1 + Math.random(),
                  repeat: Infinity,
                  delay: Math.random() * 0.5,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
