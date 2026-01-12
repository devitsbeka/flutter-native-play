import { memo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Single bird with flapping wings
const Bird = memo(({ offsetX, offsetY, flapSpeed }: { offsetX: number; offsetY: number; flapSpeed: number }) => (
  <motion.svg
    className="absolute will-change-transform"
    width="12"
    height="8"
    viewBox="0 0 24 12"
    style={{ 
      left: offsetX, 
      top: offsetY,
    }}
  >
    <motion.path
      d="M0 6 Q6 0, 12 6 Q18 0, 24 6"
      stroke="hsl(var(--foreground) / 0.7)"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      animate={{ 
        d: [
          "M0 6 Q6 0, 12 6 Q18 0, 24 6",
          "M0 6 Q6 10, 12 6 Q18 10, 24 6",
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
}

// Flock of birds flying together
const BirdFlock = memo(({ flock }: { flock: FlockData }) => {
  const birds = Array.from({ length: flock.birdCount }, (_, i) => ({
    offsetX: i * 18 + Math.random() * 8,
    offsetY: (i % 2) * 10 + Math.random() * 6,
    flapSpeed: 0.3 + Math.random() * 0.15,
  }));

  const fromX = flock.direction === 'left' ? 'calc(100vw + 50px)' : '-100px';
  const toX = flock.direction === 'left' ? '-100px' : 'calc(100vw + 50px)';

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
      startY: 8 + Math.random() * 25, // Top portion of screen
      birdCount: 3 + Math.floor(Math.random() * 4), // 3-6 birds
      speed: 14 + Math.random() * 8, // 14-22 seconds to cross
      direction: Math.random() > 0.3 ? 'left' : 'right', // 70% left-to-right
    };
    
    setFlocks(prev => [...prev, newFlock]);
    
    // Remove flock after animation completes
    const removeTimeout = setTimeout(() => {
      setFlocks(prev => prev.filter(f => f.id !== newFlock.id));
    }, (newFlock.speed + 2) * 1000);
    
    timeoutRefs.current.push(removeTimeout);
  }, []);

  useEffect(() => {
    // Initial flock after short delay
    const initialTimeout = setTimeout(spawnFlock, 3000);
    timeoutRefs.current.push(initialTimeout);
    
    // Recurring spawns every 10-18 seconds
    const scheduleNext = () => {
      const delay = 10000 + Math.random() * 8000;
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
