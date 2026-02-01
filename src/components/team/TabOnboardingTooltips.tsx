import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Sparkles, HelpCircle } from "lucide-react";

const ONBOARDING_TOOLTIPS_KEY = "mytrivia_tab_tooltips_shown";

export interface TabOnboardingTooltipsRef {
  showTooltips: () => void;
}

interface TabOnboardingTooltipsProps {
  activeTab: string;
}

export const TabOnboardingTooltips = forwardRef<TabOnboardingTooltipsRef, TabOnboardingTooltipsProps>(
  ({ activeTab }, ref) => {
    const [showTooltips, setShowTooltips] = useState(false);
    
    // Expose showTooltips method to parent
    useImperativeHandle(ref, () => ({
      showTooltips: () => {
        setShowTooltips(true);
      }
    }));
    
    useEffect(() => {
      // Check if user has seen tooltips before
      const hasSeenTooltips = localStorage.getItem(ONBOARDING_TOOLTIPS_KEY);
      
      if (!hasSeenTooltips && activeTab === "rooms") {
        // Small delay to let the page load
        const showTimer = setTimeout(() => {
          setShowTooltips(true);
        }, 500);
        
        return () => clearTimeout(showTimer);
      }
    }, [activeTab]);
    
    // Auto-dismiss after 5 seconds
    useEffect(() => {
      if (showTooltips) {
        const timer = setTimeout(() => {
          dismissTooltips();
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }, [showTooltips]);
    
    const dismissTooltips = useCallback(() => {
      setShowTooltips(false);
      localStorage.setItem(ONBOARDING_TOOLTIPS_KEY, "true");
    }, []);
    
    // Dismiss on any interaction
    useEffect(() => {
      if (!showTooltips) return;
      
      const handleInteraction = () => {
        dismissTooltips();
      };
      
      // Listen for any touch or click
      document.addEventListener("touchstart", handleInteraction, { passive: true });
      document.addEventListener("click", handleInteraction);
      
      return () => {
        document.removeEventListener("touchstart", handleInteraction);
        document.removeEventListener("click", handleInteraction);
      };
    }, [showTooltips, dismissTooltips]);
    
    if (!showTooltips) return null;
    
    return (
      <AnimatePresence>
        {showTooltips && (
          <div className="fixed inset-x-0 top-0 pointer-events-none" style={{ zIndex: 9999 }}>
            {/* Tooltip container positioned at tab bar level */}
            <div className="absolute bottom-auto top-[140px] left-0 right-0 px-4">
              <div className="relative max-w-md mx-auto flex justify-between">
                {/* Explore tab tooltip */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 25,
                    delay: 0.1 
                  }}
                >
                  <div className="relative bg-white text-gray-700 px-3 py-2 rounded-xl shadow-lg border border-gray-200 max-w-[140px]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Compass className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs font-semibold">აღმოაჩინე</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      იპოვე სხვების ტრივიები
                    </p>
                    {/* Arrow pointing down */}
                    <div 
                      className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45"
                    />
                  </div>
                </motion.div>
                
                {/* MyTrivia tab tooltip */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 25,
                    delay: 0.2 
                  }}
                >
                  <div className="relative bg-white text-gray-700 px-3 py-2 rounded-xl shadow-lg border border-gray-200 max-w-[140px]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs font-semibold">ჩემი ტრივია</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      შექმენი შენი ტრივია
                    </p>
                    {/* Arrow pointing down */}
                    <div 
                      className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);

TabOnboardingTooltips.displayName = "TabOnboardingTooltips";

// Button to manually trigger tooltips
export function TooltipTriggerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
      aria-label="Show tips"
    >
      <HelpCircle className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}