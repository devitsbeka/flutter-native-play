import { motion, useSpring, useMotionValue, AnimatePresence } from "framer-motion";
import { useRef, useState, useCallback } from "react";

// Highly irregular blob paths for morphing animation
const irregularBlobPaths = [
  // Squished left blob
  "M0.15,0.45 C0.08,0.25 0.25,0.05 0.5,0.08 C0.78,0.02 0.95,0.18 0.92,0.42 C0.98,0.65 0.88,0.88 0.62,0.95 C0.38,0.98 0.12,0.85 0.08,0.62 C0.05,0.52 0.1,0.48 0.15,0.45",
  // Top bulge
  "M0.52,0.02 C0.82,0.05 0.98,0.32 0.88,0.55 C0.95,0.78 0.72,0.98 0.45,0.92 C0.18,0.95 0.02,0.72 0.12,0.48 C0.05,0.22 0.28,0.08 0.52,0.02",
  // Right stretch
  "M0.48,0.12 C0.72,0.02 0.98,0.25 0.95,0.52 C0.98,0.82 0.75,0.98 0.48,0.88 C0.22,0.95 0.02,0.68 0.08,0.45 C0.02,0.22 0.25,0.08 0.48,0.12",
  // Diamond-ish
  "M0.5,0.05 C0.75,0.15 0.92,0.35 0.88,0.55 C0.95,0.75 0.7,0.95 0.5,0.92 C0.28,0.98 0.08,0.72 0.15,0.5 C0.05,0.28 0.28,0.08 0.5,0.05",
  // Bottom heavy
  "M0.45,0.08 C0.72,0.02 0.92,0.28 0.85,0.52 C0.95,0.78 0.68,0.98 0.42,0.95 C0.18,0.98 0.02,0.75 0.12,0.48 C0.02,0.25 0.22,0.05 0.45,0.08",
  // Organic blob
  "M0.55,0.05 C0.85,0.12 0.95,0.42 0.82,0.65 C0.92,0.88 0.58,0.98 0.35,0.88 C0.12,0.92 0.02,0.58 0.18,0.38 C0.05,0.18 0.32,0.02 0.55,0.05",
];

// Border blob paths (slightly larger)
const borderBlobPaths = irregularBlobPaths.map(path => 
  path.replace(/0\.02/g, '0').replace(/0\.05/g, '0.02').replace(/0\.08/g, '0.05').replace(/0\.98/g, '1').replace(/0\.95/g, '0.98').replace(/0\.92/g, '0.95')
);


interface InteractiveBlobVideoProps {
  videoSrc: string;
  isLocked: boolean;
  showCategorySlot: boolean;
}

export function InteractiveBlobVideo({ videoSrc, isLocked, showCategorySlot }: InteractiveBlobVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPoking, setIsPoking] = useState(false);
  const [pathIndex, setPathIndex] = useState(0);
  
  // Spring physics for wobble effect
  const wobbleX = useSpring(0, { stiffness: 300, damping: 15 });
  const wobbleY = useSpring(0, { stiffness: 300, damping: 15 });
  const wobbleScale = useSpring(1, { stiffness: 400, damping: 20 });
  const wobbleRotate = useSpring(0, { stiffness: 200, damping: 12 });

  // Handle touch/click interaction
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const pokeX = e.clientX - rect.left - centerX;
    const pokeY = e.clientY - rect.top - centerY;
    
    // Calculate wobble direction (opposite of poke)
    const wobbleStrength = 15;
    wobbleX.set(-pokeX * 0.15);
    wobbleY.set(-pokeY * 0.15);
    wobbleScale.set(0.95);
    wobbleRotate.set(pokeX * 0.08);
    
    setIsPoking(true);
    
    // Cycle to next path on poke
    setPathIndex(prev => (prev + 1) % irregularBlobPaths.length);
  }, [wobbleX, wobbleY, wobbleScale, wobbleRotate]);

  const handlePointerUp = useCallback(() => {
    wobbleX.set(0);
    wobbleY.set(0);
    wobbleScale.set(1);
    wobbleRotate.set(0);
    setIsPoking(false);
  }, [wobbleX, wobbleY, wobbleScale, wobbleRotate]);

  // Auto-cycle paths for continuous morphing
  const currentPath = irregularBlobPaths[pathIndex];
  const currentBorderPath = borderBlobPaths[pathIndex];

  return (
    <div 
      ref={containerRef}
      className="relative w-[300px] h-[300px] cursor-pointer select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* SVG Definitions */}
      <svg className="absolute w-0 h-0">
        <defs>
          {/* Main blob clip path - morphing */}
          <clipPath id="mainBlobClip" clipPathUnits="objectBoundingBox">
            <motion.path
              animate={{
                d: isLocked 
                  ? "M0.5,0.06 C0.82,0.06 0.94,0.18 0.94,0.5 C0.94,0.82 0.82,0.94 0.5,0.94 C0.18,0.94 0.06,0.82 0.06,0.5 C0.06,0.18 0.18,0.06 0.5,0.06"
                  : irregularBlobPaths
              }}
              transition={{
                d: isLocked 
                  ? { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }
                  : { duration: 8, repeat: Infinity, ease: "easeInOut", times: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1] }
              }}
            />
          </clipPath>
          
          {/* Border blob clip */}
          <clipPath id="borderBlobClip" clipPathUnits="objectBoundingBox">
            <motion.path
              animate={{
                d: isLocked 
                  ? "M0.5,0.04 C0.84,0.04 0.96,0.16 0.96,0.5 C0.96,0.84 0.84,0.96 0.5,0.96 C0.16,0.96 0.04,0.84 0.04,0.5 C0.04,0.16 0.16,0.04 0.5,0.04"
                  : borderBlobPaths
              }}
              transition={{
                d: isLocked 
                  ? { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }
                  : { duration: 8, repeat: Infinity, ease: "easeInOut", times: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1] }
              }}
            />
          </clipPath>

        </defs>
      </svg>

      {/* Main interactive blob container */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: wobbleX,
          y: wobbleY,
          scale: wobbleScale,
          rotate: wobbleRotate,
        }}
      >
        {/* Gradient border blob - yellowish frame */}
        <motion.div
          className="absolute inset-0"
          style={{
            clipPath: "url(#borderBlobClip)",
            background: isLocked 
              ? "linear-gradient(135deg, hsl(45 95% 65%), hsl(35 95% 55%), hsl(25 95% 60%), hsl(45 95% 65%))"
              : "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.5), rgba(255,255,255,0.7))",
          }}
        />

        {/* Video container */}
        <motion.div
          className="absolute inset-[8px]"
          style={{
            clipPath: "url(#mainBlobClip)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.video
              key={videoSrc}
              src={videoSrc}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scale(1.3)" }}
              initial={{ opacity: 0, scale: 1.5 }}
              animate={{ opacity: 1, scale: 1.3 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>
        </motion.div>

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
                background: i % 2 === 0 ? "hsl(45 95% 65%)" : "hsl(35 95% 55%)",
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