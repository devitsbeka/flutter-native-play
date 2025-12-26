import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "./chunky-button";

// Sparkle particle for background decoration
const ModalSparkle = ({ index, color = "primary" }: { index: number; color?: "primary" | "gold" | "green" }) => {
  const duration = 2 + Math.random() * 2;
  const delay = Math.random() * 2;
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  
  const colorMap = {
    primary: "rgba(147, 51, 234, 0.5)",
    gold: "rgba(251, 191, 36, 0.5)",
    green: "rgba(34, 197, 94, 0.5)",
  };
  
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        background: `radial-gradient(circle, ${colorMap[color]} 0%, transparent 70%)`,
      }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0.5, 1.5, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

// Floating decorative stars
const FloatingStar = ({ index }: { index: number }) => {
  const side = index % 2 === 0 ? "left" : "right";
  const topOffset = 10 + (index * 15) % 60;
  
  return (
    <motion.div
      className="absolute text-2xl pointer-events-none"
      style={{
        [side]: `${5 + Math.random() * 10}%`,
        top: `${topOffset}%`,
      }}
      animate={{
        y: [0, -8, 0],
        rotate: [-5, 5, -5],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 2 + Math.random(),
        delay: index * 0.3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      ✨
    </motion.div>
  );
};

export type GameModalVariant = "primary" | "success" | "gold" | "info";

interface GameModalProps {
  isOpen: boolean;
  onClose?: () => void;
  variant?: GameModalVariant;
  icon?: React.ReactNode;
  iconEmoji?: string;
  title: React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  showSparkles?: boolean;
  showStars?: boolean;
  className?: string;
  hideCloseButton?: boolean;
  hideFooter?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  // Quick footer props (alternative to custom footer)
  primaryLabel?: string;
  primaryIcon?: React.ReactNode;
  onPrimaryClick?: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
}

const variantStyles: Record<GameModalVariant, {
  border: string;
  headerGradient: string;
  iconGradient: string;
  sparkleColor: "primary" | "gold" | "green";
}> = {
  primary: {
    border: "from-purple-500 via-pink-500 to-purple-500",
    headerGradient: "from-purple-100 to-pink-50",
    iconGradient: "from-purple-500 to-pink-500",
    sparkleColor: "primary",
  },
  success: {
    border: "from-green-400 via-emerald-400 to-green-400",
    headerGradient: "from-green-100 to-emerald-50",
    iconGradient: "from-green-400 to-emerald-500",
    sparkleColor: "green",
  },
  gold: {
    border: "from-amber-400 via-yellow-300 to-amber-400",
    headerGradient: "from-amber-100 to-yellow-50",
    iconGradient: "from-amber-400 to-yellow-500",
    sparkleColor: "gold",
  },
  info: {
    border: "from-blue-400 via-cyan-400 to-blue-400",
    headerGradient: "from-blue-100 to-cyan-50",
    iconGradient: "from-blue-400 to-cyan-500",
    sparkleColor: "primary",
  },
};

export function GameModal({
  isOpen,
  onClose,
  variant = "primary",
  icon,
  iconEmoji,
  title,
  subtitle,
  children,
  footer,
  showSparkles = true,
  showStars = false,
  className,
  hideCloseButton = false,
  hideFooter = false,
  showBackButton = false,
  onBack,
  primaryLabel,
  primaryIcon,
  onPrimaryClick,
  primaryDisabled,
  secondaryLabel,
  onSecondaryClick,
}: GameModalProps) {
  const styles = variantStyles[variant];
  const sparkles = Array.from({ length: 12 }, (_, i) => i);
  const stars = Array.from({ length: 4 }, (_, i) => i);
  
  // Build footer from props if not provided
  const effectiveFooter = footer || (!hideFooter && primaryLabel && onPrimaryClick ? (
    <GameModalFooter
      primaryLabel={primaryLabel}
      onPrimary={onPrimaryClick}
      primaryIcon={primaryIcon}
      secondaryLabel={secondaryLabel}
      onSecondary={onSecondaryClick}
      primaryVariant={variant === "success" ? "success" : "primary"}
      isLoading={primaryDisabled}
    />
  ) : null);

  const handleClose = onClose || (() => {});

  return (
    <AnimatePresence>
      {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
            onClick={onClose ? handleClose : undefined}
          >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={cn("relative w-full max-w-sm", className)}
          >
            {/* Outer glow */}
            <div className={cn(
              "absolute -inset-1 rounded-[28px] bg-gradient-to-r opacity-60 blur-md",
              styles.border
            )} />
            
            {/* Thick gradient border frame */}
            <div className={cn(
              "absolute inset-0 rounded-[26px] p-[4px] bg-gradient-to-b",
              styles.border
            )}>
              <div className="w-full h-full rounded-[22px] bg-card" />
            </div>
            
            {/* Main content container */}
            <div className="relative rounded-[22px] overflow-hidden bg-card">
              {/* Background sparkles */}
              {showSparkles && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {sparkles.map((i) => (
                    <ModalSparkle key={i} index={i} color={styles.sparkleColor} />
                  ))}
                </div>
              )}
              
              {/* Floating stars */}
              {showStars && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {stars.map((i) => (
                    <FloatingStar key={i} index={i} />
                  ))}
                </div>
              )}
              
              {/* Back button */}
              {showBackButton && onBack && (
                <motion.button
                  onClick={onBack}
                  className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                  style={{
                    boxShadow: "0 3px 0 0 hsl(var(--border))",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, y: 2 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </motion.button>
              )}
              
              {/* Close button - 3D chunky style */}
              {!hideCloseButton && onClose && (
                <motion.button
                  onClick={handleClose}
                  className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                  style={{
                    boxShadow: "0 3px 0 0 hsl(var(--border))",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, y: 2 }}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              )}
              
              {/* Header with icon badge */}
              <div className={cn(
                "relative pt-8 pb-4 px-6 text-center bg-gradient-to-b",
                styles.headerGradient
              )}>
                {/* Icon badge */}
                {(icon || iconEmoji) && (
                  <motion.div
                    className="relative mx-auto mb-3"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.1, stiffness: 300 }}
                  >
                    {/* Glow ring */}
                    <motion.div
                      className={cn(
                        "absolute inset-0 rounded-full bg-gradient-to-r opacity-40 blur-lg",
                        styles.border
                      )}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    
                    {/* Icon container */}
                    <div 
                      className={cn(
                        "relative w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-b",
                        styles.iconGradient
                      )}
                      style={{
                        boxShadow: "0 6px 0 0 rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.3)",
                      }}
                    >
                      {iconEmoji ? (
                        <motion.span 
                          className="text-4xl"
                          animate={{ 
                            rotate: [-5, 5, -5],
                            y: [0, -3, 0],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {iconEmoji}
                        </motion.span>
                      ) : (
                        <div className="text-white">
                          {icon}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                
                {/* Title */}
                <motion.h2 
                  className="font-display text-2xl font-bold text-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {title}
                </motion.h2>
                
                {/* Subtitle */}
                {subtitle && (
                  <motion.p 
                    className="text-sm text-muted-foreground mt-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>
              
              {/* Content area */}
              {children && (
                <motion.div 
                  className="px-5 pb-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  {children}
                </motion.div>
              )}
              
              {/* Footer with action buttons */}
              {effectiveFooter && (
                <motion.div 
                  className="px-5 pb-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {effectiveFooter}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Pre-built footer components for common patterns
interface GameModalFooterProps {
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryIcon?: React.ReactNode;
  primaryVariant?: "primary" | "success" | "secondary";
  isLoading?: boolean;
}

export function GameModalFooter({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryIcon,
  primaryVariant = "primary",
  isLoading = false,
}: GameModalFooterProps) {
  return (
    <div className="space-y-2">
      <ChunkyButton
        variant={primaryVariant}
        size="lg"
        className="w-full"
        onClick={onPrimary}
        disabled={isLoading}
        icon={primaryIcon}
      >
        {isLoading ? "Loading..." : primaryLabel}
      </ChunkyButton>
      
      {secondaryLabel && onSecondary && (
        <button
          onClick={onSecondary}
          className="w-full text-center text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}

// Stat card component for modals
interface GameModalStatProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  highlight?: boolean;
}

export function GameModalStat({ icon, value, label, highlight }: GameModalStatProps) {
  return (
    <div className={cn(
      "rounded-2xl p-3 text-center",
      highlight 
        ? "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30" 
        : "bg-muted/50"
    )}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={cn(
        "text-lg font-bold",
        highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground"
      )}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// Info row for modal content
interface GameModalInfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

export function GameModalInfoRow({ icon, label, value, color }: GameModalInfoRowProps) {
  return (
    <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-xl">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}
