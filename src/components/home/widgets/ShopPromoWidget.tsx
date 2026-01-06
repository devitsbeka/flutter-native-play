import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, Gift } from "lucide-react";

export function ShopPromoWidget() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      onClick={() => navigate("/shop")}
      className="relative overflow-hidden rounded-xl p-4 cursor-pointer group"
      style={{
        background: "linear-gradient(135deg, hsl(187, 92%, 69%) 0%, hsl(181, 77%, 47%) 100%)",
      }}
    >
      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/10 blur-xl" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold text-white">
            საჩუქრები მაღაზიაში
          </h3>
        </div>
        
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="text-white/70 group-hover:text-white transition-colors"
        >
          <path
            d="M6 3L11 8L6 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </motion.div>
  );
}
