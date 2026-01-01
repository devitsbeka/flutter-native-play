import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "./chunky-button";

// Sparkle particle for background decoration
const ModalSparkle = ({ index }: { index: number }) => {
  const duration = 2 + Math.random() * 2;
  const delay = Math.random() * 2;
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
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
      primaryVariant="success"
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
            {/* Main content container - Unified purple background */}
            <div 
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: "#7E7BDC",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Background sparkles */}
              {showSparkles && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {sparkles.map((i) => (
                    <ModalSparkle key={i} index={i} />
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
                  className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, y: 2 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </motion.button>
              )}
              
              {/* Close button - Dark circular style */}
              {!hideCloseButton && onClose && (
                <motion.button
                  onClick={handleClose}
                  className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-gray-900/80 flex items-center justify-center hover:bg-gray-900 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4 text-white" />
                </motion.button>
              )}
              
              {/* Header with icon badge */}
              <div className="relative pt-8 pb-4 px-6 text-center">
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
                      className="absolute inset-0 rounded-full bg-white/20 blur-lg"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    
                    {/* Icon container */}
                    <div 
                      className="relative w-20 h-20 rounded-full flex items-center justify-center bg-white/25"
                      style={{
                        boxShadow: "0 6px 0 0 rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.3)",
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
                  className="font-display text-2xl font-bold text-white"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {title}
                </motion.h2>
                
                {/* Subtitle */}
                {subtitle && (
                  <motion.p 
                    className="text-sm text-white/70 mt-1"
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
  primaryVariant = "success",
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
          className="w-full text-center text-sm text-white/70 py-2 hover:text-white transition-colors"
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
        ? "bg-amber-400/30" 
        : "bg-white/15"
    )}>
      <div className="flex justify-center mb-1 text-white">{icon}</div>
      <p className={cn(
        "text-lg font-bold",
        highlight ? "text-amber-200" : "text-white"
      )}>
        {value}
      </p>
      <p className="text-xs text-white/70">{label}</p>
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
    <div className="flex items-center justify-between p-2.5 bg-white/15 rounded-xl">
      <div className="flex items-center gap-2">
        <span className={color || "text-white"}>{icon}</span>
        <span className="text-sm text-white">{label}</span>
      </div>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}
