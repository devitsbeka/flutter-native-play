import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft } from "lucide-react";
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
        background: "radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)",
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
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
          onClick={onClose ? handleClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className={cn("relative w-full max-w-sm", className)}
          >
            {/* Main content container - Whitish 3D chunky style */}
            <div 
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
                boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0, 0, 0, 0.18)",
                border: "3px solid rgba(255, 255, 255, 0.95)",
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
                  className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  style={{
                    boxShadow: "0 3px 0 #D1D5DB",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, y: 2 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </motion.button>
              )}
              
              {/* Close button - 3D chunky style */}
              {!hideCloseButton && onClose && (
                <motion.button
                  onClick={handleClose}
                  className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  style={{
                    boxShadow: "0 3px 0 #D1D5DB",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, y: 2 }}
                >
                  <X className="w-4 h-4 text-gray-600" />
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
                    {/* Subtle glow ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full blur-lg"
                      style={{
                        background: "radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)",
                      }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    
                    {/* Icon container - 3D chunky badge */}
                    <div 
                      className="relative w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                        boxShadow: "0 5px 0 #C4B5FD, inset 0 2px 4px rgba(255, 255, 255, 0.6)",
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
                        <div className="text-purple-600">
                          {icon}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                
                {/* Title - Dark text */}
                <motion.h2 
                  className="font-display text-2xl font-bold text-gray-900"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {title}
                </motion.h2>
                
                {/* Subtitle - Medium gray text */}
                {subtitle && (
                  <motion.p 
                    className="text-sm text-gray-500 mt-1"
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
          className="w-full text-center text-sm text-gray-500 py-2 hover:text-gray-700 transition-colors font-medium"
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}

// Stat card component for modals - 3D chunky style
interface GameModalStatProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  highlight?: boolean;
}

export function GameModalStat({ icon, value, label, highlight }: GameModalStatProps) {
  return (
    <div 
      className={cn(
        "rounded-2xl p-3 text-center",
        highlight 
          ? "bg-amber-50" 
          : "bg-gray-100"
      )}
      style={{
        boxShadow: highlight 
          ? "0 3px 0 #FCD34D, inset 0 1px 2px rgba(255, 255, 255, 0.8)" 
          : "0 3px 0 #E5E7EB, inset 0 1px 2px rgba(255, 255, 255, 0.8)",
      }}
    >
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={cn(
        "text-lg font-bold",
        highlight ? "text-amber-600" : "text-gray-900"
      )}>
        {value}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

// Info row for modal content - 3D chunky style
interface GameModalInfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

export function GameModalInfoRow({ icon, label, value, color }: GameModalInfoRowProps) {
  return (
    <div 
      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl"
      style={{
        boxShadow: "0 2px 0 #E5E7EB, inset 0 1px 2px rgba(255, 255, 255, 0.8)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className={color || "text-purple-600"}>{icon}</span>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}
