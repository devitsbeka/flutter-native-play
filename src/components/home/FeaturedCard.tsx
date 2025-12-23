import { motion } from "framer-motion";

interface FeaturedCardProps {
  title: string;
  subtitle?: string;
  icon: string;
  bgGradient?: string;
  size?: "small" | "medium" | "large";
  coinCost?: number;
  questionCount?: number;
  progress?: { current: number; total: number };
  onClick?: () => void;
  index?: number;
}

// Different gradient backgrounds for variety
const getGradient = (index: number) => {
  const gradients = [
    "from-teal-300 to-cyan-400",
    "from-violet-400 to-purple-500", 
    "from-rose-400 to-pink-500",
    "from-amber-300 to-orange-400",
    "from-emerald-300 to-teal-400",
    "from-fuchsia-400 to-pink-500",
    "from-lime-300 to-green-400",
    "from-sky-300 to-blue-400",
    "from-orange-300 to-red-400",
    "from-indigo-400 to-violet-500",
  ];
  return gradients[index % gradients.length];
};

export function FeaturedCard({ 
  title, 
  icon, 
  coinCost = 10,
  questionCount = 10,
  progress = { current: 0, total: 10 },
  onClick,
  index = 0,
}: FeaturedCardProps) {
  const isCompleted = progress.current >= progress.total;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full"
    >
      {/* Paper/Polaroid Frame */}
      <div className="relative w-full bg-gradient-to-b from-amber-50 to-amber-100 rounded-2xl shadow-xl shadow-black/25 p-3">
        {/* Inner colored area with icon */}
        <div className={`relative w-full aspect-square rounded-xl bg-gradient-to-br ${getGradient(index)} flex items-center justify-center overflow-hidden`}>
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/25 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/20 rounded-full blur-xl" />
          
          {/* Large Icon */}
          <span className="relative z-10 text-7xl drop-shadow-lg">
            {icon}
          </span>

          {/* Completed badge */}
          {isCompleted && (
            <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-xs font-bold w-7 h-7 rounded-full shadow-md flex items-center justify-center">
              ✓
            </div>
          )}
        </div>

        {/* Bottom info area */}
        <div className="mt-3 space-y-2">
          {/* Category name */}
          <h3 className="font-display font-bold text-amber-900 text-base leading-tight text-center truncate px-1">
            {title}
          </h3>

          {/* Stats row */}
          <div className="flex items-center justify-between px-1">
            {/* Coin cost */}
            <div className="flex items-center gap-1">
              <span className="text-lg">🪙</span>
              <span className="font-bold text-amber-700 text-sm">{coinCost}</span>
            </div>

            {/* Question count */}
            <div className="flex items-center gap-1">
              <span className="text-lg">❓</span>
              <span className="font-bold text-amber-700 text-sm">{questionCount}</span>
            </div>

            {/* Progress */}
            <div className="flex items-center">
              <span className={`font-bold text-base ${isCompleted ? "text-emerald-600" : "text-amber-600"}`}>
                {progress.current}
              </span>
              <span className="text-amber-400 font-bold text-base">/</span>
              <span className="font-bold text-amber-800 text-base">{progress.total}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
