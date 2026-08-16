import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  rightElements?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  onBack,
  showBack = true,
  rightElements,
  className = "",
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    // location.key is "default" when this page is the first in-app history
    // entry — e.g. after an external redirect back from Stripe checkout.
    // navigate(-1) would return to the external page (which bounces the user
    // right back here in a loop), so go home instead. window.history.length
    // can't detect this: it counts the external pages too.
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <header className={`sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/30 ${className}`}>
      {/* 76px tall like the home header, so the search/bell icons land at
          the same vertical spot on every page */}
      <div className="flex items-center justify-between px-4 h-[76px] w-full">
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-3">
          {showBack && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 shadow-sm hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="text-xl font-display font-bold text-slate-800 uppercase tracking-wide"
          >
            {title}
          </motion.h1>
        </div>

        {/* Right: Action elements */}
        {rightElements && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            {rightElements}
          </motion.div>
        )}
      </div>
    </header>
  );
}
