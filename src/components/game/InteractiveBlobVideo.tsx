import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useCallback } from "react";

// Soft rounded rectangle path (consistent shape)
const roundedRectPath = "M0.5,0.06 C0.82,0.06 0.94,0.18 0.94,0.5 C0.94,0.82 0.82,0.94 0.5,0.94 C0.18,0.94 0.06,0.82 0.06,0.5 C0.06,0.18 0.18,0.06 0.5,0.06";
const borderRectPath = "M0.5,0.04 C0.84,0.04 0.96,0.16 0.96,0.5 C0.96,0.84 0.84,0.96 0.5,0.96 C0.16,0.96 0.04,0.84 0.04,0.5 C0.04,0.16 0.16,0.04 0.5,0.04";

interface InteractiveBlobVideoProps {
  imageSrc: string;
  isLocked: boolean;
  showCategorySlot: boolean;
}

export function InteractiveBlobVideo({ imageSrc, isLocked, showCategorySlot }: InteractiveBlobVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPoking, setIsPoking] = useState(false);
  const [flipKey, setFlipKey] = useState(0);

  // Handle touch/click interaction - trigger a flip
  const handlePointerDown = useCallback(() => {
    if (!isLocked) {
      setFlipKey(prev => prev + 1);
    }
    setIsPoking(true);
  }, [isLocked]);

  const handlePointerUp = useCallback(() => {
    setIsPoking(false);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-[300px] h-[300px] cursor-pointer select-none touch-none"
      style={{ perspective: "1000px" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* SVG Definitions */}
      <svg className="absolute w-0 h-0">
        <defs>
          <clipPath id="mainBlobClip" clipPathUnits="objectBoundingBox">
            <path d={roundedRectPath} />
          </clipPath>
          <clipPath id="borderBlobClip" clipPathUnits="objectBoundingBox">
            <path d={borderRectPath} />
          </clipPath>
        </defs>
      </svg>

      {/* Main container with flip animation */}
      <motion.div
        className="absolute inset-0"
        animate={{
          scale: isPoking ? 0.95 : 1,
        }}
        transition={{ duration: 0.15 }}
      >
        {/* Pastel yellow border */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: "url(#borderBlobClip)",
            background: isLocked 
              ? "linear-gradient(135deg, hsl(48 70% 80%), hsl(42 65% 75%), hsl(38 60% 78%), hsl(48 70% 80%))"
              : "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.5), rgba(255,255,255,0.7))",
          }}
        />

        {/* Video container with flip */}
        <div
          className="absolute inset-[8px]"
          style={{
            clipPath: "url(#mainBlobClip)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${imageSrc}-${flipKey}`}
              className="w-full h-full"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: [0.4, 0, 0.2, 1]
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <img
                src={imageSrc}
                alt="Category"
                className="w-full h-full object-cover"
                style={{ transform: "scale(1.3)" }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Touch ripple effect */}
        <AnimatePresence>
          {isPoking && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: "url(#mainBlobClip)",
                background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating particles when locked */}
      {isLocked && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 6 + (i % 3) * 4,
                height: 6 + (i % 3) * 4,
                background: i % 2 === 0 ? "hsl(48 70% 80%)" : "hsl(42 65% 75%)",
                left: `${15 + i * 10}%`,
                top: `${20 + (i % 4) * 15}%`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                y: [-5, -50],
                x: [0, (i % 2 === 0 ? 1 : -1) * 15],
              }}
              transition={{
                duration: 2,
                delay: i * 0.12,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            />
          ))}
        </>
      )}

      {/* Hint text */}
      {!isLocked && showCategorySlot && (
        <motion.p
          className="absolute -bottom-1 left-0 right-0 text-center text-white/50 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          შეეხე 👆
        </motion.p>
      )}
    </div>
  );
}
