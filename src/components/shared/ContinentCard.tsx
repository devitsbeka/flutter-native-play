import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ContinentCardProps {
  name: string;
  emoji: string;
  countriesCompleted: number;
  totalCountries: number;
  isUnlocked: boolean;
  onClick: () => void;
}

export function ContinentCard({
  name,
  emoji,
  countriesCompleted,
  totalCountries,
  isUnlocked,
  onClick,
}: ContinentCardProps) {
  return (
    <motion.button
      whileHover={isUnlocked ? { scale: 1.02 } : undefined}
      whileTap={isUnlocked ? { scale: 0.98 } : undefined}
      onClick={isUnlocked ? onClick : undefined}
      className={cn(
        "w-full bg-card rounded-2xl p-4 shadow-sm flex items-center justify-between transition-all",
        isUnlocked 
          ? "cursor-pointer hover:shadow-md" 
          : "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
          {isUnlocked ? emoji : "🔒"}
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-card-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {isUnlocked 
              ? `${countriesCompleted}/${totalCountries} countries`
              : "Complete previous to unlock"
            }
          </p>
        </div>
      </div>
      {isUnlocked && (
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      )}
    </motion.button>
  );
}
