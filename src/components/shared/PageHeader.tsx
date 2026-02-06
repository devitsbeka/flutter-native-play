import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/profile');
    }
  };

  return (
    <header className={`sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/30 ${className}`}>
      <div className="flex items-center justify-between px-4 h-16 safe-top w-full">
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
