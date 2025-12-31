import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type QuizPlayerAvatarState = "default" | "active" | "correct" | "wrong" | "loading";

interface QuizPlayerAvatarProps {
  avatarUrl?: string;
  score?: number;
  position?: "left" | "right";
  state?: QuizPlayerAvatarState;
  className?: string;
}

const QuizPlayerAvatar = React.forwardRef<HTMLDivElement, QuizPlayerAvatarProps>(
  ({ avatarUrl, score = 0, position = "left", state = "default", className }, ref) => {
    const isLoading = state === "loading";

    const borderColors: Record<QuizPlayerAvatarState, string> = {
      default: "border-[#83F7DA]",
      active: "border-[#83F7DA]",
      correct: "border-emerald-400",
      wrong: "border-red-400",
      loading: "border-muted",
    };

    const scoreColors: Record<QuizPlayerAvatarState, string> = {
      default: position === "left" ? "text-[#F2C860]" : "text-[#F2FFFB]",
      active: position === "left" ? "text-[#F2C860]" : "text-[#F2FFFB]",
      correct: "text-emerald-400",
      wrong: "text-red-400",
      loading: "text-muted",
    };

    return (
      <motion.div
        ref={ref}
        className={cn("flex flex-col items-center gap-1", className)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Avatar Container with 3D effect */}
        <div className="relative">
          {/* Outer border/shadow container */}
          <div
            className="w-[58px] h-[55px] rounded-[18px] bg-[#F2F2F2]"
            style={{
              boxShadow: "0 0 0 3.63px #5957A7",
            }}
          />
          
          {/* Avatar image overlay */}
          <motion.div
            className={cn(
              "absolute inset-0 w-[58px] h-[58px] rounded-[18px] border-[2.83px] overflow-hidden",
              borderColors[state]
            )}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {isLoading ? (
              <div className="w-full h-full bg-muted animate-pulse" />
            ) : (
              <img
                src={avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=player"}
                alt="Player avatar"
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        </div>

        {/* Score */}
        {isLoading ? (
          <div className="h-5 w-10 bg-muted rounded animate-pulse" />
        ) : (
          <motion.span
            className={cn(
              "text-xl font-bold font-['Baloo']",
              scoreColors[state]
            )}
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            {score}
          </motion.span>
        )}
      </motion.div>
    );
  }
);

QuizPlayerAvatar.displayName = "QuizPlayerAvatar";

export { QuizPlayerAvatar };
