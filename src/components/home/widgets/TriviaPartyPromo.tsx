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
      onClick={() => navigate("/tv")}
      className="relative overflow-hidden rounded-2xl p-5 cursor-pointer group"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(160, 84%, 39%) 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute right-8 bottom-4 w-12 h-12 rounded-full bg-white/10" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Tv className="w-5 h-5 text-white" />
          <h3 className="text-lg font-bold text-white tracking-wide">
            TRIVIA PARTY
          </h3>
        </div>
        
        <p className="text-sm text-white/90 leading-relaxed">
          ითამაშე ტრივია მეგობრებთან ერთად ახლა უკვე TV-ში!
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
