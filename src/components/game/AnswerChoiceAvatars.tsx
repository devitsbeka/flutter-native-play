import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
import { cn } from "@/lib/utils";

/**
 * Who picked an answer, reduced to just what the badge needs to draw itself.
 * Both game modes build this shape: the room screen from live participants,
 * the challenge screen from its single simulated opponent.
 */
export interface AnswerChooser {
  id: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  isCorrect?: boolean | null;
}

interface AnswerChoiceAvatarsProps {
  choosers: AnswerChooser[];
  /**
   * "inline" pins the row to the right edge of a standard answer row.
   * "corner" tucks it into the top-right of a tall True/False card - that
   * card centres its icon and label vertically, so the corner is the only
   * spot that does not land on top of them.
   */
  placement?: "inline" | "corner";
  /** Beyond this, the rest collapse into a "+n" chip. */
  max?: number;
  className?: string;
}

/**
 * The faces of everyone who chose this answer, stacked on the answer itself.
 *
 * Knowing an opponent got it wrong is only half the information - the
 * interesting half is *what* they picked instead, and that was previously
 * nowhere on screen. Rendered only after the local player has committed, so
 * it can never be read as a hint.
 */
export function AnswerChoiceAvatars({
  choosers,
  placement = "inline",
  max = 4,
  className,
}: AnswerChoiceAvatarsProps) {
  if (choosers.length === 0) return null;

  const shown = choosers.slice(0, max);
  const overflow = choosers.length - shown.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className={cn(
        "absolute flex -space-x-1.5 pointer-events-none z-10",
        placement === "inline"
          ? "right-3 top-1/2 -translate-y-1/2"
          : "top-1.5 right-1.5",
        className
      )}
    >
      {shown.map((chooser) => (
        <Avatar
          key={chooser.id}
          className={cn(
            "w-7 h-7 [@media(max-height:600px)]:w-6 [@media(max-height:600px)]:h-6 border-2 shadow-sm",
            chooser.isCorrect ? "border-green-500" : "border-red-500"
          )}
        >
          <ResolvedAvatarImage src={chooser.avatarUrl || undefined} alt={chooser.nickname || ""} />
          <AvatarFallback className="bg-purple-500 text-white text-[10px]">
            {chooser.nickname?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 [@media(max-height:600px)]:w-6 [@media(max-height:600px)]:h-6 rounded-full bg-white/90 flex items-center justify-center text-[10px] font-bold text-slate-600 border-2 border-slate-300">
          +{overflow}
        </div>
      )}
    </motion.div>
  );
}
