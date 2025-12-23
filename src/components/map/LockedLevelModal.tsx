import { motion, AnimatePresence } from "framer-motion";
import { Lock, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: number;
  requiredLevel: number;
}

export function LockedLevelModal({ isOpen, onClose, levelId, requiredLevel }: LockedLevelModalProps) {
  // Calculate points required (each level = 100 points roughly)
  const pointsRequired = (requiredLevel - 1) * 100;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[85%] max-w-xs"
            initial={{ opacity: 0, scale: 0.8, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.8, x: "-50%", y: "-50%" }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <div className="relative bg-gradient-to-b from-amber-100 to-amber-50 rounded-3xl border-4 border-amber-400 shadow-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-amber-200 hover:bg-amber-300 transition-colors"
              >
                <X className="w-4 h-4 text-amber-700" />
              </button>
              
              {/* Header decoration */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
              
              {/* Content */}
              <div className="pt-8 pb-6 px-6 flex flex-col items-center">
                {/* Lock icon with glow */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-gray-300 to-gray-400 flex items-center justify-center border-4 border-gray-500 shadow-lg">
                    <Lock className="w-10 h-10 text-gray-600" />
                  </div>
                </div>
                
                {/* Level title */}
                <h2 className="text-2xl font-bold text-amber-800 mb-1">
                  Level {levelId}
                </h2>
                <p className="text-amber-600 font-medium mb-4">Locked</p>
                
                {/* Requirements box */}
                <div className="w-full bg-white/80 rounded-2xl p-4 border-2 border-amber-200 mb-4">
                  <p className="text-sm text-amber-700 font-medium text-center mb-3">
                    Complete previous levels to unlock!
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 text-amber-800">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="font-bold">
                      Complete Level {requiredLevel}
                    </span>
                  </div>
                </div>
                
                {/* Action button */}
                <Button
                  onClick={onClose}
                  className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-900 font-bold rounded-xl border-2 border-amber-600 shadow-lg"
                >
                  Got it!
                </Button>
              </div>
              
              {/* Bottom decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
