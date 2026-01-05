import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 safe-area-inset-top"
        >
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">ინტერნეტ კავშირი არ არის</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
