import { memo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Single bird with flapping wings - BIGGER
const Bird = memo(({ offsetX, offsetY, flapSpeed, scale = 1 }: { offsetX: number; offsetY: number; flapSpeed: number; scale?: number }) => (
  <motion.svg
    className="absolute will-change-transform"
    width={24 * scale}
    height={16 * scale}
    viewBox="0 0 24 12"
    style={{ 
      left: offsetX, 
      top: offsetY,
    }}
  >
    <motion.path
      d="M0 6 Q6 0, 12 6 Q18 0, 24 6"
      stroke="hsl(var(--foreground) / 0.85)"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      animate={{ 
        d: [
          "M0 6 Q6 0, 12 6 Q18 0, 24 6",
          "M0 6 Q6 12, 12 6 Q18 12, 24 6",
          "M0 6 Q6 0, 12 6 Q18 0, 24 6",
        ]
      }}
      transition={{ 
        duration: flapSpeed, 
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  </motion.svg>
));

Bird.displayName = 'Bird';

interface FlockData {
  id: number;
  startY: number;
  birdCount: number;
  speed: number;
  direction: 'left' | 'right';
  scale: number;
}

// Flock of birds flying together - V formation
const BirdFlock = memo(({ flock }: { flock: FlockData }) => {
  // Create V-formation pattern
  const birds = Array.from({ length: flock.birdCount }, (_, i) => {
    const isLeft = i % 2 === 0;
    const rowIndex = Math.floor(i / 2);
    return {
      offsetX: i * 28 * flock.scale + Math.random() * 10,
      offsetY: isLeft 
        ? rowIndex * 18 * flock.scale 
        : rowIndex * 18 * flock.scale + 8,
      flapSpeed: 0.25 + Math.random() * 0.12,
      scale: flock.scale * (0.9 + Math.random() * 0.2),
    };
  });

  const fromX = flock.direction === 'left' ? 'calc(100vw + 80px)' : '-150px';
  const toX = flock.direction === 'left' ? '-150px' : 'calc(100vw + 80px)';

  return (
    <motion.div
      className="absolute pointer-events-none will-change-transform"
      style={{ top: `${flock.startY}%` }}
      initial={{ x: fromX }}
      animate={{ x: toX }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: flock.speed, 
        ease: "linear" 
      }}
    >
      {birds.map((bird, i) => (
        <Bird key={i} {...bird} />
      ))}
    </motion.div>
  );
});

BirdFlock.displayName = 'BirdFlock';

export const FlyingBirds = memo(function FlyingBirds() {
  const [flocks, setFlocks] = useState<FlockData[]>([]);
  const nextIdRef = useRef(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  const spawnFlock = useCallback(() => {
    const newFlock: FlockData = {
      id: nextIdRef.current++,
      startY: 5 + Math.random() * 30, // Top portion of screen
      birdCount: 4 + Math.floor(Math.random() * 5), // 4-8 birds
      speed: 12 + Math.random() * 6, // 12-18 seconds to cross
      direction: Math.random() > 0.3 ? 'left' : 'right', // 70% right-to-left
      scale: 1.2 + Math.random() * 0.6, // 1.2x to 1.8x scale
    };
    
    setFlocks(prev => [...prev, newFlock]);
    
    // Remove flock after animation completes
    const removeTimeout = setTimeout(() => {
      setFlocks(prev => prev.filter(f => f.id !== newFlock.id));
    }, (newFlock.speed + 2) * 1000);
    
    timeoutRefs.current.push(removeTimeout);
  }, []);

  useEffect(() => {
    // Initial flock immediately
    spawnFlock();
    
    // Second flock after 4 seconds
    const secondTimeout = setTimeout(spawnFlock, 4000);
    timeoutRefs.current.push(secondTimeout);
    
    // Recurring spawns every 6-12 seconds
    const scheduleNext = () => {
      const delay = 6000 + Math.random() * 6000;
      const timeout = setTimeout(() => {
        spawnFlock();
        scheduleNext();
      }, delay);
      timeoutRefs.current.push(timeout);
    };
    
    scheduleNext();

    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [spawnFlock]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[7]">
      <AnimatePresence>
        {flocks.map(flock => (
          <BirdFlock key={flock.id} flock={flock} />
        ))}
      </AnimatePresence>
    </div>
  );
});
