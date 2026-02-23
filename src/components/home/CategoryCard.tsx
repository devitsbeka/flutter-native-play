import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

interface CategoryCardProps {
  id?: string;
  name: string;
  icon: string;
  description: string;
  color?: string;
  progress: number;
  totalLevels: number;
  isLocked?: boolean;
  onClick?: () => void;
  index?: number;
  coinCost?: number;
  questionCount?: number;
}

// Different gradient backgrounds for variety based on index
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
    "from-cyan-300 to-teal-400",
    "from-yellow-300 to-amber-400",
    "from-pink-300 to-rose-400",
    "from-green-300 to-emerald-400",
    "from-blue-300 to-indigo-400",
  ];
  return gradients[index % gradients.length];
};

export function CategoryCard({
  id,
  name,
  progress,
  totalLevels,
  isLocked = false,
  onClick,
  index = 0,
  coinCost = 10,
  questionCount = 10,
}: CategoryCardProps) {
  const { t } = useLanguage();
  const isCompleted = progress >= totalLevels;

  return (
    <motion.button
      onClick={isLocked ? undefined : onClick}
      whileHover={isLocked ? undefined : { scale: 1.02, y: -4 }}
      whileTap={isLocked ? undefined : { scale: 0.98 }}
      className={`relative w-full ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {/* Paper/Polaroid Frame */}
      <div className="relative w-full bg-gradient-to-b from-amber-50 to-amber-100 rounded-2xl shadow-xl shadow-black/25 p-3">
        {/* Inner colored area with icon */}
        <div className={`relative w-full aspect-[4/3] rounded-xl bg-gradient-to-br ${getGradient(index)} flex items-center justify-center overflow-hidden`}>
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/25 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/20 rounded-full blur-xl" />
          
          {/* Large Icon or Lock */}
          {isLocked ? (
            <Lock className="h-14 w-14 text-white/80 drop-shadow-lg" />
          ) : (
            <DynamicIcon
              categoryId={id}
              size={56}
              className="drop-shadow-lg"
            />
          )}

          {/* Completed badge */}
          {isCompleted && !isLocked && (
            <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold w-7 h-7 rounded-full shadow-md flex items-center justify-center">
              ✓
            </div>
          )}
        </div>

        {/* Bottom info area */}
        <div className="mt-3 px-1">
          {/* Category name - 2 lines max */}
          <h3 className="font-display font-bold text-amber-900 text-sm leading-tight text-center min-h-[2.5rem] flex items-center justify-center line-clamp-2">
            {name}
          </h3>

          {/* Stats row - clearer layout */}
          <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-amber-200">
            {/* Coin cost */}
            <div className="flex items-center gap-1" title="მონეტები">
              <DynamicIcon slug="coin" size={18} />
              <span className="font-bold text-amber-700 text-xs">{coinCost}</span>
            </div>

            {/* Question count */}
            <div className="flex items-center gap-1" title="კითხვები">
              <DynamicIcon slug="notebook" size={18} />
              <span className="font-bold text-amber-700 text-xs">{questionCount}</span>
            </div>

            {/* Progress */}
            {!isLocked && (
              <div className="flex items-center gap-1" title="პროგრესი">
                <DynamicIcon slug="star" size={18} />
                <span className={`font-bold text-xs ${isCompleted ? "text-emerald-600" : "text-amber-700"}`}>
                  {progress}/{totalLevels}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* "NEW" badge */}
      {index === 2 && !isLocked && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg transform rotate-12 z-10">
          {t("extra.newBadge")}
        </div>
      )}
    </motion.button>
  );
}
