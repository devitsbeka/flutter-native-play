import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChunkyButtonProps {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost" | "purple" | "white";
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  style?: React.CSSProperties;
}

const variantStyles = {
  primary: {
    face: "bg-primary text-primary-foreground",
    depth: "bg-primary/70",
    shadow: "shadow-[0_6px_0_0_hsl(var(--primary)/0.5)]",
    pressed: "shadow-[0_2px_0_0_hsl(var(--primary)/0.5)]",
  },
  secondary: {
    face: "bg-secondary text-secondary-foreground",
    depth: "bg-secondary/70",
    shadow: "shadow-[0_6px_0_0_hsl(var(--secondary)/0.8)]",
    pressed: "shadow-[0_2px_0_0_hsl(var(--secondary)/0.8)]",
  },
  success: {
    face: "bg-success text-success-foreground",
    depth: "bg-success/70",
    shadow: "shadow-[0_6px_0_0_hsl(var(--success)/0.5)]",
    pressed: "shadow-[0_2px_0_0_hsl(var(--success)/0.5)]",
  },
  danger: {
    face: "bg-destructive text-destructive-foreground",
    depth: "bg-destructive/70",
    shadow: "shadow-[0_6px_0_0_hsl(var(--destructive)/0.5)]",
    pressed: "shadow-[0_2px_0_0_hsl(var(--destructive)/0.5)]",
  },
  ghost: {
    face: "bg-card text-foreground border-2 border-border",
    depth: "bg-muted",
    shadow: "shadow-[0_6px_0_0_hsl(var(--border))]",
    pressed: "shadow-[0_2px_0_0_hsl(var(--border))]",
  },
  purple: {
    face: "bg-[#3D3D5C] text-white",
    depth: "bg-[#2D2D4C]",
    shadow: "shadow-[0_6px_0_0_#1D1D3C]",
    pressed: "shadow-[0_2px_0_0_#1D1D3C]",
  },
  white: {
    face: "bg-white text-gray-900",
    depth: "bg-gray-200",
    shadow: "shadow-[0_6px_0_0_#d1d5db]",
    pressed: "shadow-[0_2px_0_0_#d1d5db]",
  },
};

const sizeStyles = {
  sm: "px-5 py-2.5 text-sm rounded-xl",
  md: "px-6 py-3 text-base rounded-xl",
  lg: "px-8 py-4 text-lg rounded-2xl",
  xl: "px-10 py-5 text-lg font-bold rounded-2xl",
};

export const ChunkyButton = React.forwardRef<HTMLButtonElement, ChunkyButtonProps>(
  ({ className, variant = "primary", size = "md", children, icon, disabled, type = "button", onClick, style }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false);
    const styles = variantStyles[variant];

    return (
      <motion.button
        ref={ref}
        type={type}
        className={cn(
          "relative inline-flex items-center justify-center gap-2.5 font-semibold transition-all",
          "disabled:opacity-50 disabled:pointer-events-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          styles.face,
          isPressed ? styles.pressed : styles.shadow,
          sizeStyles[size],
          className
        )}
        style={{
          transform: isPressed ? "translateY(4px)" : "translateY(0px)",
          ...style,
        }}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        disabled={disabled}
        onClick={onClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
      >
        {icon && <span className="text-xl">{icon}</span>}
        {children}
      </motion.button>
    );
  }
);

ChunkyButton.displayName = "ChunkyButton";
