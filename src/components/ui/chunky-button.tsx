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
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success text-success-foreground",
  danger: "bg-destructive text-destructive-foreground",
  ghost: "bg-secondary/50 text-foreground",
};

const sizeStyles = {
  sm: "px-5 py-2.5 text-sm rounded-full",
  md: "px-6 py-3 text-base rounded-full",
  lg: "px-8 py-4 text-lg rounded-full",
  xl: "px-10 py-5 text-lg font-semibold rounded-full",
};

export const ChunkyButton = React.forwardRef<HTMLButtonElement, ChunkyButtonProps>(
  ({ className, variant = "primary", size = "md", children, icon, disabled, type = "button", onClick }, ref) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        className={cn(
          "relative inline-flex items-center justify-center gap-2.5 font-medium transition-all",
          "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        disabled={disabled}
        onClick={onClick}
      >
        {icon && <span className="text-xl">{icon}</span>}
        {children}
      </motion.button>
    );
  }
);

ChunkyButton.displayName = "ChunkyButton";
