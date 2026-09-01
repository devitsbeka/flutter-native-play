import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "./chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";

// Sparkle particle for background decoration - memoized to prevent re-renders
const ModalSparkle = React.memo(({ index }: { index: number }) => {
  // Use index-based deterministic values instead of random
  const duration = 2 + (index % 3);
  const delay = (index * 0.3) % 2;
  const x = (index * 17) % 100;
  const y = (index * 23) % 100;
  
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
});

// Floating decorative stars - memoized with deterministic values
const FloatingStar = React.memo(({ index }: { index: number }) => {
  const side = index % 2 === 0 ? "left" : "right";
  const topOffset = 10 + (index * 15) % 60;
  // Use index-based deterministic offset instead of random
  const sideOffset = 5 + (index * 7) % 10;
  const animDuration = 2 + (index % 2);
  
  return (
    <motion.div
      className="absolute text-2xl pointer-events-none"
      style={{
        [side]: `${sideOffset}%`,
        top: `${topOffset}%`,
      }}
      animate={{
        y: [0, -8, 0],
        rotate: [-5, 5, -5],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: animDuration,
        delay: index * 0.3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      ✦
    </motion.div>
  );
});

// Modals must escape ancestors that establish a containing block for fixed
// positioning (content-visibility, contain, transform) or they get clipped
const portal = (node: React.ReactNode) =>
  typeof document === "undefined" ? node : createPortal(node, document.body);

export type GameModalVariant = "primary" | "success" | "gold" | "info";

interface GameModalProps {
  isOpen: boolean;
  onClose?: () => void;
  variant?: GameModalVariant;
  icon?: React.ReactNode;
  iconEmoji?: string;
  iconSrc?: string;
  title: React.ReactNode;
  // Small icon shown next to the title in the fullScreen header bar
  titleIcon?: React.ReactNode;
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
  disableBackdropClick?: boolean;
  fullScreen?: boolean;
  headerActions?: React.ReactNode;
  // Preview/inline mode - renders without fixed positioning (for admin showcase)
  inline?: boolean;
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
  iconSrc,
  title,
  titleIcon,
  subtitle,
  children,
  footer,
  showSparkles = false,
  showStars = false,
  className,
  hideCloseButton = false,
  hideFooter = false,
  showBackButton = false,
  onBack,
  disableBackdropClick = false,
  fullScreen = true,
  headerActions,
  inline = false,
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
  const handleBack = onBack || onClose || (() => {});

  // Escape always dismisses an open modal (same as the back/close buttons)
  React.useEffect(() => {
    if (!isOpen || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Full-screen modal layout: edge-to-edge on mobile; on md+ it becomes a
  // centered panel over a dimmed backdrop (~60% of the page) so the page
  // underneath stays visible.
  if (fullScreen) {
    // Portalled to <body>: an ancestor with content-visibility/contain or a
    // transform becomes the containing block for fixed children, which
    // clipped modals rendered inside feed cards
    return portal(
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            // No safe-screen on this wrapper. It is transparent on mobile, so
            // padding it by the insets left two uncovered strips — behind the
            // status bar and behind the home indicator — showing whatever page
            // the modal opened over. Over a game that was two purple bands
            // bracketing a lavender screen. The panel now reaches both edges
            // and the insets are paid inside it, by the header and footer.
            className="fixed inset-0 z-[100] flex md:items-center md:justify-center md:bg-black/50 md:backdrop-blur-[2px] md:p-6"
            onClick={!disableBackdropClick && onClose ? handleClose : undefined}
          >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full h-full md:h-auto md:max-h-[85vh] md:w-[60%] md:min-w-[560px] md:max-w-3xl md:rounded-3xl md:overflow-hidden md:shadow-2xl"
            style={{
              background: "linear-gradient(180deg, #FDFAFF 0%, #F6E8FF 100%)",
            }}
          >
            {/* Ambient brand blobs - the same soft bubble background the rest
                of the app floats on, instead of a flat white sheet */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
              <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-purple-300/30 blur-3xl" />
              <div className="absolute top-1/3 -right-28 w-[28rem] h-[28rem] rounded-full bg-violet-300/25 blur-3xl" />
              <div className="absolute bottom-[-6rem] left-1/4 w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl" />
              <div className="absolute top-2/3 left-[-5rem] w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />
            </div>

            {/* Fixed Header. Carries the status-bar inset itself, so the bar
                sits on this surface — its translucent white over the panel's
                near-white gradient reads as one continuous top, instead of a
                differently-coloured strip above the header. min-h rather than
                h: a fixed height is border-box, so the inset padding would
                squash the row instead of extending it. */}
            <motion.div
              className="sticky top-0 z-10 flex items-center min-h-14 px-2 border-b border-purple-900/10 backdrop-blur-md"
              style={{
                background: "rgba(255,255,255,0.72)",
                paddingTop: "var(--safe-top)",
              }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {/* Back button */}
              <motion.button
                onClick={handleBack}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </motion.button>
              
              {/* Centered title (with optional small icon) */}
              <div className="flex-1 flex items-center justify-center gap-2 px-2 min-w-0">
                {titleIcon}
                <h1 className="font-display text-lg font-bold text-gray-900 truncate">
                  {title}
                </h1>
              </div>
              
              {/* Right spacer or actions */}
              <div className={cn("flex items-center justify-center", headerActions ? "shrink-0" : "w-10")}>
                {headerActions}
              </div>
            </motion.div>
            
            {/* Scrollable content area */}
            <motion.div 
              // overflow-x-hidden on purpose: overflow-y-auto alone makes the x axis
              // compute to auto, so any child that bleeds a few pixels wide turns
              // the sheet into a horizontal scroller.
              className={cn("flex-1 overflow-y-auto overflow-x-hidden flex flex-col", className)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {/* Centered content wrapper with max-width for tablet/desktop */}
              <div className="flex-1 flex flex-col w-full max-w-xl mx-auto py-6">
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
                
                {/* Subtitle section if provided */}
                {subtitle && (
                  <div className="px-5 pb-2 text-center">
                    <p className="text-sm text-gray-500">{subtitle}</p>
                  </div>
                )}
                
                {/* Icon section if provided */}
                {(icon || iconEmoji || iconSrc) && (
                  <div className="flex justify-center pb-2">
                    {iconSrc ? (
                      <motion.div
                        className="relative"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.2, stiffness: 300 }}
                      >
                        <motion.img 
                          src={iconSrc}
                          alt=""
                          className="w-14 h-14 object-contain"
                          animate={{ 
                            rotate: [-5, 5, -5],
                            y: [0, -3, 0],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </motion.div>
                    ) : iconEmoji ? (
                      <motion.div
                        className="relative"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.2, stiffness: 300 }}
                      >
                        <motion.span 
                          className="text-5xl"
                          animate={{ 
                            rotate: [-5, 5, -5],
                            y: [0, -3, 0],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {iconEmoji}
                        </motion.span>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.2, stiffness: 300 }}
                      >
                        {icon}
                      </motion.div>
                    )}
                  </div>
                )}
                
                {/* Main content */}
                <div className="px-6 pb-5">
                  {children}
                </div>
              </div>
            </motion.div>
            
            {/* Fixed Footer. No surface of its own — the white card it used
                to paint behind the button was a second colour on a screen
                that is supposed to be one background, and the button carries
                its own weight. It pays the home-indicator inset on top of its
                padding, since the panel now runs to the bottom edge. */}
            {effectiveFooter && (
              <motion.div
                className="sticky bottom-0 px-5 pt-4"
                style={{
                  paddingBottom: "calc(1rem + var(--safe-bottom))",
                }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-full max-w-xl mx-auto">
                  {effectiveFooter}
                </div>
              </motion.div>
            )}
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Inline mode - renders card without fixed positioning/backdrop (for admin previews)
  if (inline && isOpen) {
    return (
      <div className={cn("relative w-full max-w-sm", className)}>
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
          
          {/* Close button - 3D chunky style */}
          {!hideCloseButton && onClose && (
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              style={{
                boxShadow: "0 3px 0 #D1D5DB",
              }}
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
          
          {/* Header with icon badge */}
          <div className="relative pt-8 pb-4 px-6 text-center">
            {(icon || iconEmoji || iconSrc) && (
              <div className="relative mx-auto mb-3 flex items-center justify-center">
                {iconSrc ? (
                  <div 
                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                      boxShadow: "0 5px 0 #C4B5FD, inset 0 2px 4px rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    <img src={iconSrc} alt="" className="w-10 h-10 object-contain" />
                  </div>
                ) : iconEmoji ? (
                  <div 
                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                      boxShadow: "0 5px 0 #C4B5FD, inset 0 2px 4px rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    <span className="text-4xl">{iconEmoji}</span>
                  </div>
                ) : (
                  icon
                )}
              </div>
            )}
            
            <h2 className="font-display text-2xl font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          
          {/* Content */}
          <div className="px-6 pb-5">
            {children}
          </div>
          
          {/* Footer */}
          {effectiveFooter}
        </div>
      </div>
    );
  }

  // Original card modal layout (when fullScreen is false)
  return portal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, pointerEvents: "none" }}
          animate={{ opacity: 1, pointerEvents: "auto" }}
          exit={{ opacity: 0, pointerEvents: "none" }}
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
          onClick={!disableBackdropClick && onClose ? handleClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, duration: 0.15 }}
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
        {(icon || iconEmoji || iconSrc) && (
          <motion.div
            className="relative mx-auto mb-3 flex items-center justify-center"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.1, stiffness: 300 }}
          >
            {iconSrc ? (
              <>
                {/* Subtle glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-full blur-lg"
                  style={{
                    background: "radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                <div 
                  className="relative w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                    boxShadow: "0 5px 0 #C4B5FD, inset 0 2px 4px rgba(255, 255, 255, 0.6)",
                  }}
                >
                  <motion.img 
                    src={iconSrc}
                    alt=""
                    className="w-10 h-10 object-contain"
                    animate={{ 
                      rotate: [-5, 5, -5],
                      y: [0, -3, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </>
            ) : iconEmoji ? (
              <>
                {/* Subtle glow ring - only for emoji icons */}
                <motion.div
                  className="absolute inset-0 rounded-full blur-lg"
                  style={{
                    background: "radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Default badge container - only for emoji icons */}
                <div 
                  className="relative w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                    boxShadow: "0 5px 0 #C4B5FD, inset 0 2px 4px rgba(255, 255, 255, 0.6)",
                  }}
                >
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
                </div>
              </>
            ) : (
              // Custom icon - render directly, let it handle its own styling
              icon
            )}
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
              
              {/* Content area - scrollable */}
              {children && (
                <motion.div 
                  className="px-5 pb-5 max-h-[60vh] overflow-y-auto"
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
  const { t } = useLanguage();
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
        {isLoading ? t("common.loading") : primaryLabel}
      </ChunkyButton>
      
      {secondaryLabel && onSecondary && (
        <ChunkyButton
          onClick={onSecondary}
          variant="secondary"
          size="md"
          className="w-full"
        >
          {secondaryLabel}
        </ChunkyButton>
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
