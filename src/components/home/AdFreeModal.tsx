import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import adFreeIcon from "@/assets/icons/icon-ad-free.png";

interface AdFreeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const benefits = [
  "No ads while playing",
  "Unlimited power-ups daily",
  "Exclusive avatar frames",
  "Priority matchmaking",
];

export function AdFreeModal({ isOpen, onClose }: AdFreeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="relative rounded-3xl overflow-hidden w-full max-w-sm"
              style={{
                background: "linear-gradient(180deg, #F8F6FC 0%, #EDE8F5 50%, #E5DEF0 100%)",
                boxShadow: "inset 0 4px 8px rgba(140,120,180,0.15), inset 0 -2px 4px rgba(255,255,255,0.8), 0 8px 0 #D8D0E8, 0 12px 32px rgba(0,0,0,0.2)",
                border: "4px solid rgba(255,255,255,0.95)",
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center z-10 hover:bg-white transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
              
              {/* Content */}
              <div className="p-6 pt-8">
                {/* Icon and title */}
                <div className="flex flex-col items-center mb-6">
                  <motion.div
                    className="relative mb-4"
                    animate={{ 
                      y: [0, -5, 0],
                      rotate: [0, 3, -3, 0],
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    <img 
                      src={adFreeIcon} 
                      alt="Ad-Free" 
                      className="w-20 h-20 object-contain drop-shadow-lg"
                    />
                    <motion.div
                      className="absolute -top-1 -right-1"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="w-6 h-6 text-yellow-500" />
                    </motion.div>
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">
                    Go Ad-Free!
                  </h2>
                  <p className="text-sm text-gray-600 text-center">
                    Unlock premium experience
                  </p>
                </div>
                
                {/* Benefits list */}
                <div className="space-y-3 mb-6">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={benefit}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
                        }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
                
                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                  style={{
                    background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
                    boxShadow: "0 4px 0 #6D28D9, 0 6px 20px rgba(139,92,246,0.4)",
                  }}
                >
                  Unlock for $4.99
                </motion.button>
                
                {/* Restore purchase link */}
                <button className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Restore Purchase
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}