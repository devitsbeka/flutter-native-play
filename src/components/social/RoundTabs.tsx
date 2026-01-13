import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RoundTabsProps {
  rounds: { subject: string; questionCount?: number }[];
  activeRound: number;
  onRoundChange: (index: number) => void;
}

export function RoundTabs({ rounds, activeRound, onRoundChange }: RoundTabsProps) {
  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {rounds.map((round, index) => (
          <button
            key={index}
            onClick={() => onRoundChange(index)}
            className={cn(
              "relative flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeRound === index
                ? "bg-white text-[#6B5B95] shadow-lg"
                : "bg-white/20 text-white hover:bg-white/30"
            )}
          >
            <span className="relative z-10">
              რაუნდი {index + 1}
              {round.subject && (
                <span className="ml-1 opacity-70 max-w-[80px] truncate inline-block align-bottom">
                  • {round.subject}
                </span>
              )}
            </span>
            {activeRound === index && (
              <motion.div
                layoutId="round-tab-indicator"
                className="absolute inset-0 bg-white rounded-full"
                style={{ zIndex: -1 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
