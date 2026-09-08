import { motion } from "framer-motion";

import { t } from "@/lib/i18n";
import type { TriviaJob } from "@/contexts/TriviaCreationContext";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconHouseParty from "@/assets/house-party.png";

/**
 * The trivia that is being made, standing in the list it will appear in.
 *
 * Generation outlives the wizard that started it (see
 * TriviaCreationContext), and the only sign of it was the Create button
 * saying "Creating…" — on a tab the player was not on, because pressing
 * Create left them wherever they were, which is Public by default. So the
 * job went somewhere invisible: "can't see where it is creating" (owner).
 *
 * Pressing Create now lands on the private tab, and this is what is waiting
 * there: the same art and the same sentence as the modal that just closed,
 * holding the place the finished trivia takes. It disappears when the job
 * does, at which point the real card is in the list under it.
 */
const ART: Record<TriviaJob["kind"], string> = {
  trivia: triviaBuzzer,
  party: iconHouseParty,
};

export function TriviaBeingMadeCard({ job }: { job: TriviaJob }) {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-3 rounded-2xl border border-violet-200/70 bg-white/70 p-3 shadow-[0_4px_16px_rgba(102,51,153,0.08)]"
    >
      <span className="relative h-[52px] w-[52px] shrink-0">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-[3px] border-violet-200 border-t-violet-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
        />
        <span className="absolute inset-[7px] flex items-center justify-center overflow-hidden rounded-full bg-violet-50">
          <img
            src={ART[job.kind] ?? ART.trivia}
            alt=""
            className="h-[30px] w-[30px] object-contain"
            onError={(e) => {
              // Decoration: a missing file must not leave a torn-page glyph.
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-[Nunito] text-[15px] font-bold text-foreground">
          {t(job.kind === "party" ? "extra.partyOnItsWayTitle" : "extra.triviaOnItsWayTitle")}
        </span>
        {/* What was asked for, so two people in a room can tell which. */}
        <span className="block truncate font-[Nunito] text-[13px] text-muted-foreground">
          {job.subject}
        </span>
      </span>
    </div>
  );
}
