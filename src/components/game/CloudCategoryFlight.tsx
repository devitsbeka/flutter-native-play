import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import { useCategories } from "@/hooks/useCategories";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";

interface CloudCategoryFlightProps {
  isOpen: boolean;
  onCategorySelected: (categoryId: string, categoryName: string) => void;
}

type FlightPhase = "flying" | "revealing" | "complete";

// Cloud component for parallax effect
const Cloud = ({ 
  delay, 
  duration, 
  size, 
  startX, 
  startY 
}: { 
  delay: number; 
  duration: number; 
  size: number; 
  startX: number; 
  startY: number;
}) => (
  <motion.div
    className="absolute rounded-full bg-white/20 blur-2xl pointer-events-none"
    style={{ width: size, height: size * 0.6 }}
    initial={{ 
      x: startX, 
      y: startY, 
      scale: 0.2, 
      opacity: 0 
    }}
    animate={{ 
      x: startX * 4, 
      y: startY * 4, 
      scale: 3, 
      opacity: [0, 0.6, 0] 
    }}
    transition={{ 
      duration, 
      delay, 
      repeat: Infinity, 
      ease: "linear" 
    }}
  />
);

// Flying clouds rushing from center outward
const RushingClouds = () => {
  const clouds = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * Math.PI * 2,
      delay: i * 0.25,
      duration: 2 + Math.random(),
      size: 80 + Math.random() * 120,
    })), 
  []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {clouds.map((cloud) => (
        <Cloud
          key={cloud.id}
          delay={cloud.delay}
          duration={cloud.duration}
          size={cloud.size}
          startX={Math.cos(cloud.angle) * 50}
          startY={Math.sin(cloud.angle) * 50}
        />
      ))}
    </div>
  );
};

// Category video circle floating in clouds
const CategoryCircle = ({
  category,
  videoUrl,
  index,
  isWinner,
  phase,
  onRevealComplete,
}: {
  category: { id: string; name: string; category_id: string };
  videoUrl: string;
  index: number;
  isWinner: boolean;
  phase: FlightPhase;
  onRevealComplete?: () => void;
}) => {
  // Random starting positions scattered around center
  const startAngle = (index / 6) * Math.PI * 2 + Math.random() * 0.5;
  const startRadius = 60 + Math.random() * 40;
  const startX = Math.cos(startAngle) * startRadius;
  const startY = Math.sin(startAngle) * startRadius;

  // End positions far off screen
  const endX = Math.cos(startAngle) * 400;
  const endY = Math.sin(startAngle) * 400;

  if (isWinner) {
    return (
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ 
          x: startX, 
          y: startY, 
          scale: 1, 
          opacity: 1 
        }}
        animate={phase === "revealing" || phase === "complete" ? { 
          x: 0, 
          y: 0, 
          scale: 1.8,
        } : {
          x: startX,
          y: startY,
          scale: 1,
        }}
        transition={{ 
          duration: 0.8, 
          ease: "easeOut",
        }}
        onAnimationComplete={() => {
          if (phase === "revealing" && onRevealComplete) {
            onRevealComplete();
          }
        }}
      >
        <motion.div
          className="relative"
          animate={phase === "complete" ? {
            boxShadow: [
              "0 0 30px rgba(255,215,0,0.4)",
              "0 0 60px rgba(255,215,0,0.8)",
              "0 0 30px rgba(255,215,0,0.4)",
            ]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div 
            className="w-24 h-24 rounded-full overflow-hidden border-4"
            style={{ 
              borderColor: phase === "complete" ? "rgba(255,215,0,0.9)" : "rgba(255,255,255,0.6)",
              boxShadow: phase === "complete" 
                ? "0 0 40px rgba(255,215,0,0.6), inset 0 0 20px rgba(255,255,255,0.3)"
                : "0 0 25px rgba(255,255,255,0.4), inset 0 0 15px rgba(255,255,255,0.2)"
            }}
          >
            <video
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover scale-125"
            />
          </div>
        </motion.div>
        
        {/* Category name reveal */}
        <AnimatePresence>
          {phase === "complete" && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <h2 
                className="text-2xl font-black text-white text-center"
                style={{ 
                  fontFamily: "'TASolivare', sans-serif",
                  textShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 40px rgba(255,215,0,0.3)"
                }}
              >
                {category.name}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Non-winner categories fly away
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      initial={{ 
        x: startX, 
        y: startY, 
        scale: 1, 
        opacity: 0 
      }}
      animate={{ 
        x: endX, 
        y: endY, 
        scale: 0.3, 
        opacity: [0, 1, 1, 0] 
      }}
      transition={{ 
        duration: 3.5, 
        delay: 0.3 + index * 0.1,
        ease: "easeIn",
        opacity: { times: [0, 0.1, 0.7, 1] }
      }}
    >
      <div 
        className="w-20 h-20 rounded-full overflow-hidden border-3"
        style={{ 
          borderColor: "rgba(255,255,255,0.5)",
          boxShadow: "0 0 20px rgba(255,255,255,0.3), inset 0 0 10px rgba(255,255,255,0.2)"
        }}
      >
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover scale-125"
        />
      </div>
    </motion.div>
  );
};

export function CloudCategoryFlight({ isOpen, onCategorySelected }: CloudCategoryFlightProps) {
  const { categories } = useCategories();
  const [displayCategories, setDisplayCategories] = useState<typeof categories>([]);
  const [winnerIndex, setWinnerIndex] = useState<number>(0);
  const [phase, setPhase] = useState<FlightPhase>("flying");

  // Select 6 random categories when modal opens
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      const shuffled = [...categories].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 6);
      setDisplayCategories(selected);
      setWinnerIndex(Math.floor(Math.random() * selected.length));
      setPhase("flying");
    }
  }, [isOpen, categories]);

  // Animation timeline
  useEffect(() => {
    if (!isOpen || displayCategories.length === 0) return;

    // Start revealing winner after others fly away
    const revealTimer = setTimeout(() => {
      setPhase("revealing");
    }, 3000);

    return () => clearTimeout(revealTimer);
  }, [isOpen, displayCategories]);

  // Handle reveal complete
  const handleRevealComplete = () => {
    setPhase("complete");
    
    // Confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 },
      colors: ["#FFD700", "#FFA500", "#FFFFFF", "#87CEEB"],
    });

    // Callback after celebration
    const winner = displayCategories[winnerIndex];
    setTimeout(() => {
      onCategorySelected(winner.uuid, winner.name);
    }, 1500);
  };

  // Get video URL for category
  const getVideoUrl = (categoryId: string) => {
    return CATEGORY_VIDEOS[categoryId] || "/videos/galaxy.mp4";
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Sky gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #1e3a5f 30%, #3b82f6 60%, #7dd3fc 100%)"
        }}
      />

      {/* Rushing clouds effect */}
      <RushingClouds />

      {/* Static cloud layers for depth */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-40 h-24 bg-white/10 rounded-full blur-3xl"
          animate={{ x: [-20, 20, -20], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-60 h-32 bg-white/10 rounded-full blur-3xl"
          animate={{ x: [20, -20, 20], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/3 w-32 h-20 bg-white/15 rounded-full blur-2xl"
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* Title */}
      <motion.div
        className="absolute top-16 left-0 right-0 text-center z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: phase === "complete" ? 0 : 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 
          className="text-xl font-bold text-white/90"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
        >
          {phase === "flying" ? "კატეგორიის არჩევა..." : ""}
        </h1>
      </motion.div>

      {/* Category circles flying through */}
      <div className="relative w-full h-full">
        {displayCategories.map((category, index) => (
          <CategoryCircle
            key={category.uuid}
            category={{
              id: category.uuid,
              name: category.name,
              category_id: category.id,
            }}
            videoUrl={getVideoUrl(category.id)}
            index={index}
            isWinner={index === winnerIndex}
            phase={phase}
            onRevealComplete={index === winnerIndex ? handleRevealComplete : undefined}
          />
        ))}
      </div>

      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)"
        }}
      />
    </motion.div>
  );
}
