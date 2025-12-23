import { motion } from "framer-motion";
import { Lock } from "lucide-react";

interface CategoryCardProps {
  name: string;
  icon: string;
  description: string;
  color?: string;
  progress: number;
  totalLevels: number;
  isLocked?: boolean;
  onClick?: () => void;
  index?: number;
}

// Random subtle rotation for playful polaroid effect
const getRandomRotation = (index: number) => {
  const rotations = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 2.5, -1, 1.5];
  return rotations[index % rotations.length];
};

// Different gradient backgrounds for variety based on index
const getGradient = (index: number) => {
  const gradients = [
    "from-indigo-500 to-purple-600",
    "from-pink-400 to-rose-500", 
    "from-cyan-400 to-blue-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-violet-400 to-purple-500",
    "from-lime-400 to-green-500",
    "from-fuchsia-400 to-pink-500",
    "from-sky-400 to-blue-500",
    "from-red-400 to-rose-500",
    "from-teal-400 to-cyan-500",
    "from-yellow-400 to-amber-500",
    "from-purple-400 to-indigo-500",
    "from-green-400 to-emerald-500",
    "from-orange-400 to-red-500",
  ];
  return gradients[index % gradients.length];
};

export function CategoryCard({
  name,
  icon,
  progress,
  totalLevels,
  isLocked = false,
  onClick,
  index = 0,
}: CategoryCardProps) {
  const isCompleted = progress >= totalLevels;

  return (
    <motion.button
      onClick={isLocked ? undefined : onClick}
      whileHover={isLocked ? undefined : { scale: 1.03, rotate: 0, y: -8 }}
      whileTap={isLocked ? undefined : { scale: 0.97 }}
      className={`relative w-full h-full ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ 
        transform: `rotate(${getRandomRotation(index)}deg)`,
      }}
    >
      {/* Paper/Polaroid Frame */}
      <div className="relative w-full h-full bg-gradient-to-b from-amber-50 to-amber-100 rounded-lg shadow-xl shadow-black/30 p-2 pb-3">
        {/* Inner colored area with icon */}
        <div className={`relative w-full aspect-square rounded-md bg-gradient-to-br ${getGradient(index)} flex items-center justify-center overflow-hidden`}>
          {/* Decorative circles for depth */}
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/20 rounded-full blur-xl" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/15 rounded-full blur-lg" />
          
          {/* Large Icon or Lock */}
          {isLocked ? (
            <Lock className="h-12 w-12 text-white/70 drop-shadow-lg" />
          ) : (
            <span className="relative z-10 text-5xl drop-shadow-lg">
              {icon}
            </span>
          )}

          {/* Completed badge */}
          {isCompleted && !isLocked && (
            <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
              ✓
            </div>
          )}
        </div>

        {/* Bottom text area */}
        <div className="flex items-end justify-between mt-2 px-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-amber-900 text-sm leading-tight truncate">
              {name}
            </h3>
          </div>
          {!isLocked && (
            <span className="text-sm font-bold ml-2 whitespace-nowrap">
              <span className={isCompleted ? "text-emerald-500" : "text-amber-500"}>{progress}</span>
              <span className="text-amber-400">/</span>
              <span className="text-amber-700">{totalLevels}</span>
            </span>
          )}
        </div>
      </div>

      {/* "NEW LEVELS" badge for variety - show on some cards */}
      {index === 2 && !isLocked && (
        <div className="absolute -bottom-1 -left-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[8px] font-bold px-2 py-1 rounded shadow-lg transform -rotate-12">
          ახალი!
        </div>
      )}
    </motion.button>
  );
}
