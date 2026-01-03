import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChunkyButtonProps {
  variant?: "primary" | "secondary" | "success" | "danger" | "mint";
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  style?: React.CSSProperties;
  showParticles?: boolean;
}

const variantStyles = {
  primary: {
    face: "bg-gradient-to-b from-primary via-primary to-primary/90",
    textColor: "text-primary-foreground",
    depth: "hsl(270 50% 35%)", // Darker, more saturated for contrast
    border: "hsl(270 50% 45%)", // Border between face and depth
    innerBorder: "rgba(255,255,255,0.25)",
    glow: "hsl(var(--primary) / 0.4)",
    shine: "from-white/30 via-white/10 to-transparent",
    particle: "bg-primary-foreground/60",
  },
  secondary: {
    face: "bg-gradient-to-b from-secondary via-secondary to-secondary/90",
    textColor: "text-secondary-foreground",
    depth: "hsl(220 10% 65%)", // Darker gray for depth
    border: "hsl(220 10% 75%)", // Border between face and depth
    innerBorder: "rgba(255,255,255,0.3)",
    glow: "hsl(var(--secondary) / 0.3)",
    shine: "from-white/25 via-white/10 to-transparent",
    particle: "bg-secondary-foreground/60",
  },
  success: {
    face: "bg-gradient-to-b from-[#C5F5E3] via-[#A8E6CF] to-[#7DD4AA]",
    textColor: "text-[#1A4A3A]",
    depth: "#6BC4A0", // Lighter, polished mint depth
    border: "#8BD8B8", // Soft gradient border
    innerBorder: "#E5FBF2", // Light inner stroke
    glow: "rgba(168, 230, 207, 0.6)",
    shine: "from-white/50 via-white/20 to-transparent",
    particle: "bg-[#2D5A4A]/50",
  },
  danger: {
    face: "bg-gradient-to-b from-destructive via-destructive to-destructive/90",
    textColor: "text-destructive-foreground",
    depth: "hsl(0 60% 35%)", // Darker red for depth
    border: "hsl(0 60% 45%)", // Border between face and depth
    innerBorder: "rgba(255,255,255,0.2)",
    glow: "hsl(var(--destructive) / 0.4)",
    shine: "from-white/30 via-white/10 to-transparent",
    particle: "bg-destructive-foreground/60",
  },
  mint: {
    face: "bg-gradient-to-b from-[#C5F5E3] via-[#A8E6CF] to-[#7DD4AA]",
    textColor: "text-[#1A4A3A]",
    depth: "#6BC4A0", // Lighter, polished mint depth
    border: "#8BD8B8", // Soft gradient border
    innerBorder: "#E5FBF2", // Light inner stroke
    glow: "rgba(168, 230, 207, 0.6)",
    shine: "from-white/50 via-white/20 to-transparent",
    particle: "bg-[#2D5A4A]/50",
  },
};

const sizeStyles = {
  sm: "px-5 py-2.5 text-sm rounded-xl",
  md: "px-6 py-3 text-base rounded-xl",
  lg: "px-8 py-4 text-lg rounded-2xl",
  xl: "px-10 py-5 text-lg font-bold rounded-2xl",
};

const depthSizes = {
  sm: 4,
  md: 5,
  lg: 6,
  xl: 7,
};

// Floating particle component
const FloatingParticle = ({ delay, variant }: { delay: number; variant: string }) => {
  const styles = variantStyles[variant as keyof typeof variantStyles] || variantStyles.primary;
  
  return (
    <motion.div
      className={cn("absolute w-1.5 h-1.5 rounded-full", styles.particle)}
      initial={{ 
        opacity: 0, 
        scale: 0,
        x: Math.random() * 60 - 30,
        y: 10
      }}
      animate={{ 
        opacity: [0, 1, 1, 0], 
        scale: [0, 1, 1, 0.5],
        y: [10, -20, -40, -60],
        x: [Math.random() * 60 - 30, Math.random() * 80 - 40]
      }}
      transition={{ 
        duration: 2,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 2
      }}
    />
  );
};

export const ChunkyButton = React.forwardRef<HTMLButtonElement, ChunkyButtonProps>(
  ({ className, variant = "primary", size = "md", children, icon, disabled, type = "button", onClick, style, showParticles = false }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const styles = variantStyles[variant];
    const depth = depthSizes[size];

    return (
      <motion.button
        ref={ref}
        type={type}
        className={cn(
          "relative inline-flex items-center justify-center gap-2.5 font-semibold",
          "disabled:opacity-50 disabled:pointer-events-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "overflow-visible whitespace-nowrap",
          styles.face,
          styles.textColor,
          sizeStyles[size],
          className
        )}
        style={{
          transform: isPressed ? `translateY(${depth - 2}px)` : "translateY(0px)",
          boxShadow: isPressed 
            ? `
              inset 0 1px 2px 0 rgba(0,0,0,0.1),
              inset 0 -1px 0 0 ${styles.border},
              0 2px 0 0 ${styles.depth},
              0 4px 12px -2px ${styles.glow}
            `
            : `
              inset 0 2px 0 0 ${styles.innerBorder},
              inset 0 -2px 0 0 ${styles.border},
              0 ${depth}px 0 0 ${styles.depth},
              0 ${depth + 2}px 0 0 ${styles.border},
              0 ${depth + 6}px 24px -4px ${styles.glow}
            `,
          touchAction: "manipulation",
          ...style,
        }}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        disabled={disabled}
        onClick={onClick}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerLeave={() => { setIsPressed(false); setIsHovered(false); }}
        onPointerEnter={() => setIsHovered(true)}
      >
        {/* Shine effect overlay */}
        <div 
          className={cn(
            "absolute inset-0 rounded-[inherit] bg-gradient-to-b pointer-events-none",
            styles.shine
          )}
          style={{ 
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)'
          }}
        />
        
        {/* Animated shine sweep on hover */}
        <AnimatePresence>
          {isHovered && !disabled && (
            <motion.div
              className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inner highlight line at top */}
        <div 
          className="absolute top-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full pointer-events-none"
        />

        {/* Floating particles */}
        {showParticles && !disabled && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <FloatingParticle key={i} delay={i * 0.3} variant={variant} />
            ))}
          </div>
        )}

        {/* Button content */}
        <span className="relative z-10 flex items-center justify-center gap-2.5">
          {icon && <span className="text-xl drop-shadow-sm">{icon}</span>}
          <span className="drop-shadow-sm">{children}</span>
        </span>

        {/* Bottom inner shadow for depth */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1/3 rounded-b-[inherit] bg-gradient-to-t from-black/10 to-transparent pointer-events-none"
        />
      </motion.button>
    );
  }
);

ChunkyButton.displayName = "ChunkyButton";
