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
      className="relative overflow-hidden rounded-2xl p-5 cursor-pointer group"
      style={{
        background: "linear-gradient(135deg, hsl(187, 92%, 69%) 0%, hsl(181, 77%, 47%) 100%)",
      }}
    >
      {/* Decorative elements */}
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute left-4 bottom-2 w-16 h-16 rounded-full bg-white/5 blur-xl" />
      
      {/* Floating sparkles */}
      <motion.div
        className="absolute right-6 top-4"
        animate={{ 
          rotate: [0, 15, -15, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      >
        <Sparkles className="w-5 h-5 text-white/70" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-white" />
          <h3 className="text-base font-bold text-white">
            განსაკუთრებული შეთავაზება!
          </h3>
        </div>
        
        <p className="text-sm text-white/90 leading-relaxed">
          გაიგე რა საჩუქრები გელოდება მაღაზიაში
        </p>

        {/* Arrow indicator */}
        <motion.div
          className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-white transform group-hover:translate-x-0.5 transition-transform"
          >
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
