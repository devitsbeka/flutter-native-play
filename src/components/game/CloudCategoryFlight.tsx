import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useCategories } from "@/hooks/useCategories";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";

interface CloudCategoryFlightProps {
  isOpen: boolean;
  onCategorySelected: (categoryId: string, categoryName: string) => void;
}

type Phase = "floating" | "focusing" | "revealed";

// Bubble positions - scattered nicely across screen
const BUBBLE_POSITIONS = [
  { x: -100, y: -120 },
  { x: 100, y: -80 },
  { x: -80, y: 40 },
  { x: 120, y: 60 },
  { x: -40, y: 140 },
  { x: 60, y: -160 },
];

export function CloudCategoryFlight({ isOpen, onCategorySelected }: CloudCategoryFlightProps) {
  const { categories } = useCategories();
  const [displayCategories, setDisplayCategories] = useState<typeof categories>([]);
  const [winnerIndex, setWinnerIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("floating");

  // Initialize on open
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      const shuffled = [...categories].sort(() => Math.random() - 0.5);
      setDisplayCategories(shuffled.slice(0, 6));
      setWinnerIndex(Math.floor(Math.random() * 6));
      setPhase("floating");
    }
  }, [isOpen, categories]);

  // Animation timeline
  useEffect(() => {
    if (!isOpen || displayCategories.length === 0) return;

    // Phase 1: Float for 2 seconds
    const focusTimer = setTimeout(() => setPhase("focusing"), 2000);
    
    // Phase 2: Reveal after 1 more second
    const revealTimer = setTimeout(() => {
      setPhase("revealed");
      
      // Confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#FFA500", "#FFFFFF"],
      });

      // Callback after short delay
      const winner = displayCategories[winnerIndex];
      setTimeout(() => {
        onCategorySelected(winner.uuid, winner.name);
      }, 1200);
    }, 3000);

    return () => {
      clearTimeout(focusTimer);
      clearTimeout(revealTimer);
    };
  }, [isOpen, displayCategories, winnerIndex, onCategorySelected]);

  const getVideoUrl = (categoryId: string) => {
    return CATEGORY_VIDEOS[categoryId] || "/videos/galaxy.mp4";
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Sky gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #1e3a5f 0%, #3b6ea5 50%, #7ec8e3 100%)"
        }}
      />

      {/* Title */}
      <motion.h1
        className="absolute top-20 left-0 right-0 text-center text-xl font-bold text-white/90"
        style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
        animate={{ opacity: phase === "revealed" ? 0 : 1 }}
      >
        კატეგორიის არჩევა...
      </motion.h1>

      {/* Bubbles container */}
      <div className="relative">
        {displayCategories.map((category, index) => {
          const isWinner = index === winnerIndex;
          const pos = BUBBLE_POSITIONS[index];
          
          return (
            <motion.div
              key={category.uuid}
              className="absolute"
              style={{ left: "50%", top: "50%", marginLeft: -40, marginTop: -40 }}
              initial={{ 
                x: pos.x, 
                y: pos.y, 
                scale: 0, 
                opacity: 0 
              }}
              animate={{
                x: phase === "focusing" || phase === "revealed" 
                  ? (isWinner ? 0 : pos.x * 1.5) 
                  : pos.x,
                y: phase === "focusing" || phase === "revealed"
                  ? (isWinner ? 0 : pos.y * 1.5)
                  : pos.y,
                scale: phase === "revealed" && isWinner ? 1.6 : 1,
                opacity: phase === "focusing" || phase === "revealed"
                  ? (isWinner ? 1 : 0)
                  : 1,
              }}
              transition={{
                duration: phase === "floating" ? 0.6 : 0.8,
                delay: phase === "floating" ? index * 0.1 : 0,
                ease: "easeOut",
              }}
            >
              {/* Gentle floating animation */}
              <motion.div
                animate={phase === "floating" ? {
                  y: [0, -8, 0],
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.2,
                }}
              >
                {/* Bubble */}
                <div 
                  className="w-20 h-20 rounded-full overflow-hidden"
                  style={{ 
                    border: phase === "revealed" && isWinner 
                      ? "4px solid rgba(255,215,0,0.9)" 
                      : "3px solid rgba(255,255,255,0.6)",
                    boxShadow: phase === "revealed" && isWinner
                      ? "0 0 30px rgba(255,215,0,0.5), 0 0 60px rgba(255,215,0,0.3)"
                      : "0 0 20px rgba(255,255,255,0.3)",
                  }}
                >
                  <video
                    src={getVideoUrl(category.id)}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Category name - only for winner when revealed */}
                <AnimatePresence>
                  {phase === "revealed" && isWinner && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-lg font-bold text-white"
                      style={{ 
                        fontFamily: "'TASolivare', sans-serif",
                        textShadow: "0 2px 10px rgba(0,0,0,0.4)"
                      }}
                    >
                      {category.name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
