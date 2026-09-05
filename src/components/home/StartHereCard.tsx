import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The card a rail shows when you have not made one of these yet.
 *
 * A rail with nothing in it used to do one of two things, neither good: the
 * Trivias rail hid its whole section, so the home screen simply had no such
 * heading and no way in; the Rooms rail dropped a full-width centred panel
 * into a row of horizontal cards, which reads as an error state rather than
 * an invitation.
 *
 * This is neither. It is a card, in the rail, the same shape and size as the
 * thing it is standing in for — so the row still looks like a row, and the
 * first thing in it is the way to fill it.
 *
 * Dashed rather than solid on purpose: it is an outline of a card that does
 * not exist yet, and the app already uses that language for the "view all"
 * tile at the end of the rooms rail.
 */
export function StartHereCard({
  variant,
  title,
  desc,
  onPress,
}: {
  /** Which rail this stands in: sets the shape it has to match. */
  variant: "room" | "trivia";
  title: string;
  /** The room card is tall enough for a second line; the trivia tile is not. */
  desc?: string;
  onPress: () => void;
}) {
  const isRoom = variant === "room";

  return (
    <motion.button
      type="button"
      onClick={onPress}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "shrink-0 snap-start text-left",
        isRoom
          ? "flex w-[70vw] max-w-[280px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#8858d5]/35 bg-[linear-gradient(160deg,#f6efff_0%,#ede4ff_100%)] px-6 py-8 min-h-[190px]"
          : "flex w-[132px] flex-col gap-2",
      )}
    >
      {isRoom ? (
        <>
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/80 shadow-[0_4px_10px_rgba(88,50,160,0.14)]">
            <Plus className="size-7 text-[#8858d5]" strokeWidth={2.5} />
          </span>
          <span className="text-center font-[Nunito] text-[15px] font-bold leading-[20px] text-[#402666]">
            {title}
          </span>
          {desc && (
            <span className="text-center font-[Nunito] text-[12px] leading-[16px] text-[#402666]/65">
              {desc}
            </span>
          )}
        </>
      ) : (
        <>
          {/* Same 132px square the trivia covers use, so the rail's rhythm
              survives whether or not anything has been made yet. */}
          <span className="flex h-[132px] w-full items-center justify-center rounded-[18px] border-2 border-dashed border-[#8858d5]/35 bg-[linear-gradient(160deg,#f6efff_0%,#ede4ff_100%)]">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/80 shadow-[0_4px_10px_rgba(88,50,160,0.14)]">
              <Plus className="size-6 text-[#8858d5]" strokeWidth={2.5} />
            </span>
          </span>
          <span className="line-clamp-2 px-0.5 font-[Nunito] text-[13px] font-bold leading-[16px] text-[#402666]">
            {title}
          </span>
        </>
      )}
    </motion.button>
  );
}
