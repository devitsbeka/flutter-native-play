/**
 * The way into a room, on a room card (Figma 1058:325).
 *
 * One button in two colours: mint on the public list, white on the private
 * one. It used to be four different pills saying three different words —
 * a flat white "Join" with a green dot on My Rooms, the same white "Join"
 * or "Enter" on the public list, and the chunky mint "Play" only when a
 * room happened to be full — so the one act a card exists for looked like a
 * different act on every card. It says "Play" now, with the play triangle,
 * and the only thing that changes between the two lists is the colour.
 *
 * The states a card still distinguishes (a live round pulsing, a join
 * request waiting on its host) do it through motion and their own label,
 * not through a shape of their own.
 */

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export type RoomCardTone = "mint" | "white";

const TONES: Record<RoomCardTone, string> = {
  mint: "bg-[#81f0c3] border-[#2bc889] text-[#320c69]",
  white: "bg-white border-[#d5c9e8] text-[#320c69]",
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
