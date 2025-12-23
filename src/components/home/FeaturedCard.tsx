import { motion } from "framer-motion";

interface FeaturedCardProps {
  title: string;
  subtitle: string;
  icon: string;
  bgGradient?: string;
  size?: "small" | "medium" | "large";
  progress?: { current: number; total: number };
  onClick?: () => void;
}

// Random subtle rotation for playful polaroid effect
const getRandomRotation = (index: number) => {
  const rotations = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 2.5, -1, 1.5];
  return rotations[index % rotations.length];
};

export function FeaturedCard({ 
  title, 
  subtitle, 
  icon, 
  size = "small",
  progress,
  onClick 
}: FeaturedCardProps) {
  // Different gradient backgrounds for variety
  const gradients = [
    "from-indigo-500 to-purple-600",
    "from-pink-400 to-rose-500", 
    "from-cyan-400 to-blue-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-violet-400 to-purple-500",
    "from-lime-400 to-green-500",
    "from-fuchsia-400 to-pink-500",
  ];
  
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, rotate: 0, y: -8 }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full h-full"
      style={{ 
        transform: `rotate(${getRandomRotation(title.length)}deg)`,
      }}
    >
      {/* Paper/Polaroid Frame */}
      <div className="relative w-full h-full bg-gradient-to-b from-amber-50 to-amber-100 rounded-lg shadow-xl shadow-black/30 p-2 pb-3">
        {/* Inner colored area with icon */}
        <div className={`relative w-full h-[70%] rounded-md bg-gradient-to-br ${randomGradient} flex items-center justify-center overflow-hidden`}>
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/20 rounded-full blur-xl" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/15 rounded-full blur-lg" />
          
          {/* Large Icon */}
          <span className={`relative z-10 drop-shadow-lg ${
            size === "large" ? "text-6xl" : size === "medium" ? "text-5xl" : "text-4xl"
          }`}>
            {icon}
          </span>
        </div>

        {/* Bottom text area */}
        <div className="flex items-end justify-between mt-2 px-1">
          <div className="flex-1 min-w-0">
            <h3 className={`font-display font-bold text-amber-900 leading-tight truncate ${
              size === "large" ? "text-base" : "text-sm"
            }`}>
              {title}
            </h3>
          </div>
          {progress && (
            <span className="text-sm font-bold text-amber-700 ml-2">
              <span className="text-amber-500">{progress.current}</span>
              <span className="text-amber-400">/</span>
              <span>{progress.total}</span>
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
