import { useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export type NotificationType = "info" | "success" | "error" | "warning";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: NotificationType;
  title: string;
  description?: string;
  icon?: string | React.ReactNode;
  duration?: number;
  imageUrl?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

const typeIcons: Record<NotificationType, string> = {
  info: "ℹ️",
  success: "✅",
  error: "❌",
  warning: "⚠️",
};

const typeColors: Record<NotificationType, string> = {
  info: "from-blue-500/20 to-purple-500/20",
  success: "from-green-500/20 to-emerald-500/20",
  error: "from-red-500/20 to-rose-500/20",
  warning: "from-orange-500/20 to-amber-500/20",
};

export const NotificationModal = memo(function NotificationModal({
  isOpen,
  onClose,
  type,
  title,
  description,
  icon,
  duration = 3500,
  imageUrl,
  actionButton,
  secondaryButton,
}: NotificationModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    // Don't auto-close if there's an action button (user needs to interact)
    if (actionButton) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose, actionButton]);

  const displayIcon = icon || typeIcons[type];

  const handleActionClick = () => {
    actionButton?.onClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 safe-screen z-[9999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm"
          >
            {/* Glass container */}
            <div
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${typeColors[type]} backdrop-blur-xl border border-white/30 shadow-2xl`}
            >
              {/* Inner white layer */}
              <div className="bg-white/90 dark:bg-slate-900/90 p-6 relative">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-muted/80 hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Content */}
                <div className="flex flex-col items-center text-center pt-2">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1, bounce: 0.5 }}
                    className="text-5xl mb-4 [&_img]:w-16 [&_img]:h-16 [&_img]:object-contain"
                  >
                    {typeof displayIcon === "string" ? (
                      <span>{displayIcon}</span>
                    ) : (
                      displayIcon
                    )}
                  </motion.div>

                  {/* Generated Image Preview */}
                  {imageUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 }}
                      className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-primary/20 shadow-lg mb-4"
                    >
                      <img
                        src={imageUrl}
                        alt="Generated"
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  )}

                  {/* Title */}
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-lg font-bold text-foreground mb-1"
                  >
                    {title}
                  </motion.h3>

                  {/* Description */}
                  {description && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-sm text-muted-foreground"
                    >
                      {description}
                    </motion.p>
                  )}

                  {/* Action Buttons */}
                  {(actionButton || secondaryButton) && (
                    <div className="mt-4 flex flex-col gap-2 w-full">
                      {actionButton && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          onClick={handleActionClick}
                          className="w-full px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                        >
                          {actionButton.label}
                        </motion.button>
                      )}
                      {secondaryButton && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          onClick={() => {
                            secondaryButton.onClick();
                            onClose();
                          }}
                          disabled={secondaryButton.disabled}
                          className="w-full px-6 py-2.5 rounded-full bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {secondaryButton.label}
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
