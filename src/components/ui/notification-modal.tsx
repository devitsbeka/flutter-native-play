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
}: NotificationModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  const displayIcon = icon || typeIcons[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
                    className="text-5xl mb-4"
                  >
                    {typeof displayIcon === "string" ? (
                      <span>{displayIcon}</span>
                    ) : (
                      displayIcon
                    )}
                  </motion.div>

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
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
