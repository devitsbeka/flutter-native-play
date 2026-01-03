import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useCategories } from "@/hooks/useCategories";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";

interface CloudCategoryFlightProps {
  isOpen: boolean;
  onCategorySelected: (categoryId: string, categoryName: string, videoUrl: string) => void;
}

type Phase = "floating" | "focusing" | "revealed" | "transitioning";

// Bubble positions - scattered nicely across screen
const BUBBLE_POSITIONS = [
  { x: -90, y: -130 },
  { x: 90, y: -100 },
  { x: -110, y: 20 },
  { x: 100, y: 50 },
  { x: -50, y: 130 },
  { x: 70, y: -170 },
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

    // Phase 1: Float for 1.8 seconds
    const focusTimer = setTimeout(() => setPhase("focusing"), 1800);
    
    // Phase 2: Reveal after focusing
    const revealTimer = setTimeout(() => {
      setPhase("revealed");
      
      // Confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#FFA500", "#FFFFFF"],
      });
    }, 2600);

    // Phase 3: Start transition out
    const transitionTimer = setTimeout(() => {
      setPhase("transitioning");
    }, 4000);

    // Phase 4: Complete and callback
    const completeTimer = setTimeout(() => {
      const winner = displayCategories[winnerIndex];
      const videoUrl = CATEGORY_VIDEOS[winner.id] || "/videos/galaxy.mp4";
      onCategorySelected(winner.uuid, winner.name, videoUrl);
    }, 4600);

    return () => {
      clearTimeout(focusTimer);
      clearTimeout(revealTimer);
      clearTimeout(transitionTimer);
      clearTimeout(completeTimer);
    };
  }, [isOpen, displayCategories, winnerIndex, onCategorySelected]);

  const getVideoUrl = (categoryId: string) => {
    return CATEGORY_VIDEOS[categoryId] || "/videos/galaxy.mp4";
  };

  if (!isOpen) return null;

  const winner = displayCategories[winnerIndex];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "transitioning" ? 0 : 1 }}
      transition={{ duration: phase === "transitioning" ? 0.6 : 0.3 }}
      style={{ background: "#7E7ADB" }}
    >
      {/* Title */}
      <motion.h1
        className="absolute top-20 left-0 right-0 text-center text-xl font-bold text-white/90 z-10"
        style={{ 
          textShadow: "0 2px 10px rgba(0,0,0,0.3)",
          fontFamily: "'TASolivare', sans-serif"
        }}
        animate={{ 
          opacity: phase === "revealed" || phase === "transitioning" ? 0 : 1,
          y: phase === "revealed" || phase === "transitioning" ? -20 : 0
        }}
        transition={{ duration: 0.4 }}
      >
        კატეგორიის არჩევა...
      </motion.h1>

      {/* Bubbles container - centered */}
      <div className="relative flex items-center justify-center">
        {displayCategories.map((category, index) => {
          const isWinner = index === winnerIndex;
          const pos = BUBBLE_POSITIONS[index];
          
          return (
            <motion.div
              key={category.uuid}
              className="absolute"
              initial={{ 
                x: pos.x, 
                y: pos.y, 
                scale: 0, 
                opacity: 0 
              }}
              animate={{
                x: phase === "focusing" || phase === "revealed" || phase === "transitioning"
                  ? (isWinner ? 0 : pos.x * 2) 
                  : pos.x,
                y: phase === "focusing" || phase === "revealed" || phase === "transitioning"
                  ? (isWinner ? 0 : pos.y * 2)
                  : pos.y,
                scale: phase === "transitioning" && isWinner 
                  ? 0.8 
                  : (phase === "revealed" && isWinner ? 1.5 : 1),
                opacity: phase === "focusing" || phase === "revealed" || phase === "transitioning"
                  ? (isWinner ? 1 : 0)
                  : 1,
              }}
              transition={{
                duration: phase === "floating" ? 0.5 : 0.7,
                delay: phase === "floating" ? index * 0.08 : 0,
                ease: "easeOut",
              }}
            >
              {/* Gentle floating animation */}
              <motion.div
                animate={phase === "floating" ? {
                  y: [0, -6, 0],
                } : {}}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: index * 0.15,
                }}
                className="flex flex-col items-center"
              >
                {/* Bubble */}
                <div 
                  className="w-20 h-20 rounded-full overflow-hidden"
                  style={{ 
                    border: (phase === "revealed" || phase === "transitioning") && isWinner 
                      ? "4px solid rgba(255,215,0,0.9)" 
                      : "3px solid rgba(255,255,255,0.5)",
                    boxShadow: (phase === "revealed" || phase === "transitioning") && isWinner
                      ? "0 0 30px rgba(255,215,0,0.5), 0 0 60px rgba(255,215,0,0.3)"
                      : "0 0 15px rgba(255,255,255,0.25)",
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

                {/* Category name - centered below bubble for winner */}
                <AnimatePresence>
                  {(phase === "revealed" || phase === "transitioning") && isWinner && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: phase === "transitioning" ? 0 : 1, 
                        y: 0 
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: phase === "revealed" ? 0.3 : 0, duration: 0.4 }}
                      className="mt-4 text-center"
                    >
                      <p 
                        className="text-xl font-bold text-white whitespace-nowrap"
                        style={{ 
                          fontFamily: "'TASolivare', sans-serif",
                          textShadow: "0 2px 10px rgba(0,0,0,0.4)"
                        }}
                      >
                        {category.name}
                      </p>
                    </motion.div>
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
