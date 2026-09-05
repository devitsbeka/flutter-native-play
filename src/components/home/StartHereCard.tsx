import { motion } from "framer-motion";
import danceFloorIcon from "@/assets/dance-floor.png";
import triviaBuzzerIcon from "@/assets/trivia-buzzer.png";

/**
 * The panel a rail shows when you have not made one of these yet.
 *
 * A rail with nothing in it used to do one of two things, neither good: the
 * Trivias rail hid its whole section, so the home screen had no heading for
 * the feature and no way in; the Rooms rail dropped a full-width centred
 * panel into a row of horizontal cards.
 *
 * It is one full-width panel now rather than a card the width of the thing
 * it replaces. A card-shaped placeholder left most of the row empty, which
 * read as a rail that had failed to load rather than one waiting to be
 * filled — and it wasted the width that the invitation could use.
 *
 * The icon is the rail's own: the dance floor for rooms, the buzzer for
 * trivias, each the picture that surface already uses for itself. A generic
 * plus said only "something goes here".
 *
 * Just the picture and the title — no line under it (owner's ask). The
 * title already says what to do; the explaining line beneath it made the
 * invitation read as a notice.
 */
export function StartHereCard({
  variant,
  title,
  onPress,
}: {
  /** Which rail this stands in — picks the picture. */
  variant: "room" | "trivia";
  title: string;
  onPress: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      className="flex w-full flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-[#8858d5]/30 bg-[linear-gradient(160deg,#f8f3ff_0%,#efe7ff_100%)] px-6 py-7 text-center"
    >
      <img
        alt=""
        src={variant === "room" ? danceFloorIcon : triviaBuzzerIcon}
        className="size-16 shrink-0 object-contain"
      />
      <span className="font-[Nunito] text-[15px] font-bold leading-[20px] text-[#402666]">
        {title}
      </span>
    </motion.button>
  );
}
