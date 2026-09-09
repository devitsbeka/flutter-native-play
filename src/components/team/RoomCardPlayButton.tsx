/**
 * The way into a room, on a room card (Figma 1058:325).
 *
 * One button, sharing one of two colours with the rest of the rooms list:
 * mint when a room is ready to start and says "Play", white for every other
 * state on it — "Join", "Enter", waiting on the host. It used to be four
 * different pills saying three different words for the one act every card
 * exists for; it says "Play" now, with the play triangle, and the only thing
 * that changes between cards is which of those two colours applies.
 *
 * The party card's own Play went through two looks that both gave it a
 * colour the rooms list did not otherwise speak: first a purple OUTLINE —
 * ChunkyButton's generic variant, transparent face, purple border and
 * text — which read as a lesser action beside a filled Play; then a purple
 * FILL of its own, which fixed that but made the party card the one card on
 * the screen with a third colour in play. It wears the rooms list's own
 * white now — the same fill Join and Enter wear — rather than a shade that
 * belongs to it alone (owner: "play buttons other color... just like we
 * have on join button on public rooms"). The `purple` tone stays defined —
 * the dev showcase still swatches it — for whichever card reaches for it
 * next. `outline` is white's stroke with no fill, for a Close that sits
 * beside the card's own filled button in the preview sheet.
 *
 * The states a card still distinguishes (a live round pulsing, a join
 * request waiting on its host) do it through motion and their own label,
 * not through a shape of their own.
 */

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export type RoomCardTone = "mint" | "white" | "purple" | "outline";

const TONES: Record<RoomCardTone, string> = {
  mint: "bg-[#81f0c3] border-[#2bc889] text-[#320c69]",
  white: "bg-white border-[#d5c9e8] text-[#320c69]",
  purple: "bg-[#7126d5] border-[#4e1a94] text-white",
  // White's stroke with no face: the same pill, unfilled, for the button
  // that steps back beside a filled one (the preview sheet's Close). The
  // sides and top are drawn per side — a plain `border-2` here would be
  // merged over the base `border-b-4` and flatten the edge.
  outline: "bg-transparent border-x-2 border-t-2 border-[#d5c9e8] text-[#320c69]",
};

export const RoomCardPlayButton = forwardRef<
  HTMLButtonElement,
  HTMLMotionProps<"button"> & { tone: RoomCardTone }
>(function RoomCardPlayButton({ tone, className, children, ...props }, ref) {
  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={props.disabled ? undefined : { scale: 0.96 }}
      {...props}
      className={cn(
        // The border-b IS the button's edge, so the press can take it away:
        // 4px of it and a 2px drop on :active, which is the whole depth of
        // the thing. Every tone below sets only its three colours.
        "relative flex shrink-0 items-center gap-1.5 rounded-[24px] border-b-4 px-4 py-2 text-sm font-extrabold",
        "active:translate-y-[2px] active:border-b-2 disabled:opacity-60",
        TONES[tone],
        className,
      )}
    >
      {children}
    </motion.button>
  );
});
