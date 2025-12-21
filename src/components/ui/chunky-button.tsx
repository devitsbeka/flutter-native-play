import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChunkyButtonProps {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

const variantStyles = {
  primary: "bg-primary text-primary-foreground shadow-lg hover:shadow-xl",
  secondary: "bg-secondary text-secondary-foreground shadow-lg hover:shadow-xl",
  success: "bg-emerald-500 text-white shadow-lg hover:shadow-xl",
  danger: "bg-destructive text-destructive-foreground shadow-lg hover:shadow-xl",
  ghost: "bg-card/50 text-foreground border-2 border-border hover:bg-card",
};

const sizeStyles = {
  sm: "px-4 py-2 text-sm rounded-xl",
  md: "px-6 py-3 text-base rounded-2xl",
  lg: "px-8 py-4 text-lg rounded-2xl",
  xl: "px-10 py-6 text-xl font-bold rounded-3xl",
};

export const ChunkyButton = React.forwardRef<HTMLButtonElement, ChunkyButtonProps>(
  ({ className, variant = "primary", size = "md", children, icon, disabled, type = "button", onClick }, ref) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        className={cn(
          "relative inline-flex items-center justify-center gap-3 font-semibold transition-all duration-200",
          "active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          "focus:outline-none focus:ring-4 focus:ring-ring/30",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
        whileTap={{ scale: disabled ? 1 : 0.95, y: disabled ? 0 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        disabled={disabled}
        onClick={onClick}
      >
        {icon && <span className="text-2xl">{icon}</span>}
        {children}
      </motion.button>
    );
  }
);

ChunkyButton.displayName = "ChunkyButton";
