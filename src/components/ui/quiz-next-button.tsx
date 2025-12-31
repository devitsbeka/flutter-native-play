import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuizNextButtonProps {
  text?: string;
  duration?: number;
  onClick: () => void;
  autoClickEnabled?: boolean;
  className?: string;
}

const QuizNextButton = React.forwardRef<HTMLButtonElement, QuizNextButtonProps>(
  (
    {
      text = "შემდეგი კითხვა",
      duration = 3000,
      onClick,
      autoClickEnabled = true,
      className,
    },
    ref
  ) => {
    const [progress, setProgress] = React.useState(0);
    const startTimeRef = React.useRef<number | null>(null);
    const animationFrameRef = React.useRef<number | null>(null);

    React.useEffect(() => {
      if (!autoClickEnabled) return;

      startTimeRef.current = Date.now();

      const animate = () => {
        if (!startTimeRef.current) return;

        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);

        if (newProgress >= 100) {
          onClick();
        } else {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [duration, onClick, autoClickEnabled]);

    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative w-full h-[60px] rounded-2xl overflow-hidden",
          "font-bold text-lg",
          className
        )}
        style={{
          backgroundColor: "#5DDFC0",
          boxShadow: "0 4px 0 #3CB896",
          color: "#1A5A4A",
        }}
        onClick={onClick}
        whileTap={{ y: 2, boxShadow: "0 2px 0 #3CB896" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Progress fill from left to right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, #83F7DA 0%, #6EE7C8 100%)",
            width: `${progress}%`,
            transition: "width 50ms linear",
          }}
        />

        {/* Button text */}
        <span className="relative z-10">{text}</span>
      </motion.button>
    );
  }
);

QuizNextButton.displayName = "QuizNextButton";

export { QuizNextButton };
