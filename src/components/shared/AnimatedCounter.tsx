import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({ value, className = "", duration = 0.5 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  
  const spring = useSpring(prevValue.current, {
    stiffness: 100,
    damping: 20,
    duration: duration * 1000,
  });
  
  const display = useTransform(spring, (latest) => Math.round(latest));

  useEffect(() => {
    if (value !== prevValue.current) {
      spring.set(value);
      prevValue.current = value;
    }
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [display]);

  const isIncreasing = value > prevValue.current;

  return (
    <motion.span 
      className={className}
      animate={isIncreasing ? { scale: [1, 1.2, 1] } : undefined}
      transition={{ duration: 0.3 }}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  );
}
