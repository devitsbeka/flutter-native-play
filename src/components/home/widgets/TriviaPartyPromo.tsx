import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tv } from "lucide-react";

export function TriviaPartyPromo() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      whileTap={{ y: 2 }}
      onClick={() => navigate("/tv")}
      className="relative overflow-hidden rounded-2xl p-4 cursor-pointer group border-2"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(160, 84%, 39%) 100%)",
        borderColor: "hsl(var(--primary) / 0.3)",
        boxShadow: "inset 0 2px 0 0 rgba(255,255,255,0.2), 0 4px 0 0 hsl(160, 84%, 30%), 0 6px 15px -3px rgba(0,0,0,0.25)",
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/5 blur-2xl" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tv className="w-5 h-5 text-white" />
          <h3 className="text-base font-bold text-white tracking-wide">
            TRIVIA PARTY
          </h3>
        </div>
        
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-white/70 group-hover:text-white transition-colors"
        >
          <path
            d="M6 3L11 8L6 13"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      <p className="relative z-10 text-sm text-white/90 mt-1.5 font-medium">
        TV-ზე მეგობრებთან ერთად
      </p>
    </motion.div>
  );
}
