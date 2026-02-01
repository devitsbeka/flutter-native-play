import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Sparkles } from "lucide-react";

const ONBOARDING_TOOLTIPS_KEY = "mytrivia_tab_tooltips_shown";

interface TabOnboardingTooltipsProps {
  activeTab: string;
}

export function TabOnboardingTooltips({ activeTab }: TabOnboardingTooltipsProps) {
  const [showTooltips, setShowTooltips] = useState(false);
  
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
        <div className="absolute inset-0 pointer-events-none z-50">
          {/* Explore tab tooltip - positioned above first tab */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              delay: 0.1 
            }}
            className="absolute left-[5%] bottom-full mb-2"
          >
            <div className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-3 py-2 rounded-xl shadow-lg max-w-[140px]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Compass className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">აღმოაჩინე</span>
              </div>
              <p className="text-[10px] opacity-90 leading-tight">
                იპოვე სხვების ტრივიები
              </p>
              {/* Arrow pointing down */}
              <div 
                className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gradient-to-br from-primary to-primary/80 rotate-45"
              />
            </div>
          </motion.div>
          
          {/* MyTrivia tab tooltip - positioned above third tab */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              delay: 0.2 
            }}
            className="absolute right-[5%] bottom-full mb-2"
          >
            <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 text-white px-3 py-2 rounded-xl shadow-lg max-w-[140px]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">ჩემი ტრივია</span>
              </div>
              <p className="text-[10px] opacity-90 leading-tight">
                შექმენი შენი ტრივია
              </p>
              {/* Arrow pointing down */}
              <div 
                className="absolute -bottom-1.5 right-4 w-3 h-3 bg-gradient-to-br from-amber-500 to-orange-500 rotate-45"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
