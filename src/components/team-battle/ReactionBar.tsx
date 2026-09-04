import { useState } from "react";
import Lottie from "lottie-react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeamBattle } from "@/contexts/TeamBattleContext";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { REACTIONS, type Reaction, reactionFor } from "@/components/team-battle/reactions";
import type { RoomReaction } from "@/hooks/useRoomReactions";

/**
 * One reaction, as a tile.
 *
 * Only the picked one animates. Six looping Lotties at 60fps under a
 * question with a clock on it is a lot of phone for a row of faces nobody
 * has chosen yet, so the rest sit on their first frame — which is the
 * resting pose these are drawn from.
 */
function ReactionTile({
  reaction,
  selected,
  label,
  onSelect,
}: {
  reaction: Reaction;
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      animate={{ scale: selected ? 1.1 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      className={`flex-1 min-w-0 max-w-[46px] aspect-square rounded-2xl border flex items-center justify-center transition-colors ${
        selected ? "bg-white/35 border-white/70" : "bg-white/15 border-white/20"
      }`}
    >
      <Lottie animationData={reaction.data} loop={selected} autoplay={selected} className="w-8 h-8" />
    </motion.button>
  );
}

/**
 * The reaction sender at the foot of the question screen.
 *
 * It used to send an icon out of the room-icon library: a row dealt from
 * three thousand nouns, and a + that opened the library over a question with
 * a clock running on it — to say "well done". Six animations answer what
 * anyone actually wanted to send. Pick one, then Send, which sits where the
 * + was because that is where the thumb already goes.
 *
 * What is sent is not shown to the player on the spot until their turn is
 * over; that is the inbox's job, below.
 */
export function ReactionBar({ toUserId }: { toUserId: string }) {
  const { t } = useLanguage();
  const { sendReaction } = useTeamBattle();
  const [picked, setPicked] = useState<string | null>(null);
  const [flying, setFlying] = useState(false);
  /**
   * "Sent", for a moment.
   *
   * Pressing Send cleared the picked tile and did nothing else, so from the
   * sender's side the button just went dead — and the reaction itself
   * appears in the same instant it is read, which is easy to miss. The
   * button says what happened.
   */
  const [sent, setSent] = useState(false);

  const send = () => {
    if (!picked) return;
    setFlying(true);
    window.setTimeout(() => setFlying(false), 700);
    sendReaction(toUserId, picked);
    setSent(true);
    window.setTimeout(() => setSent(false), 1400);
    // Cleared on the way out: the next thing to send is a fresh choice, and
    // a tile left lit looks like it is still waiting to be sent.
    setPicked(null);
  };

  return (
    <div className="flex-shrink-0 px-4 pb-[calc(0.5rem_+_var(--safe-bottom))] pt-1">
      <div className="flex items-center justify-center gap-1.5">
        {REACTIONS.map((reaction) => (
          <ReactionTile
            key={reaction.key}
            reaction={reaction}
            selected={picked === reaction.key}
            label={t(reaction.labelKey)}
            onSelect={() => setPicked((cur) => (cur === reaction.key ? null : reaction.key))}
          />
        ))}
        <motion.button
          type="button"
          whileTap={picked ? { scale: 0.92 } : undefined}
          animate={flying ? { y: [0, -14, 0] } : { y: 0 }}
          transition={{ duration: 0.5 }}
          onClick={send}
          disabled={!picked}
          className={cn(
            "flex-shrink-0 h-[46px] px-2.5 rounded-2xl border text-xs font-bold uppercase whitespace-nowrap active:scale-95 transition-colors disabled:opacity-40",
            sent
              ? "bg-emerald-400/90 border-emerald-200/70 text-[#0b3b2c]"
              : "bg-white/25 border-white/30 text-white",
          )}
        >
          {sent ? (
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              {t("teamBattle.reactionSent")}
            </span>
          ) : (
            t("teamBattle.sendIconAction")
          )}
        </motion.button>
      </div>
    </div>
  );
}

/**
 * The reactions in the air right now — everyone's, for a second and a half.
 *
 * This was an inbox: reactions addressed to the player on the spot, stacked,
 * and read one at a time AFTER their turn. So the six people who sent them
 * watched nothing happen, and the one person they were for read them once
 * the moment had passed. A reaction is a noise you make while something is
 * happening. It pops on every screen in the room, under the face of whoever
 * is playing, and then it is gone.
 */
export function ReactionPops({
  items,
  senders,
}: {
  items: RoomReaction[];
  senders: Map<string, { nickname: string; avatar_url: string | null }>;
}) {
  return (
    <div className="pointer-events-none flex h-[46px] flex-shrink-0 items-center justify-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {/* Newest last, and never more than a handful: a burst from a full
            room must not push the question off the screen. */}
        {items.slice(-5).map((r) => {
          const who = senders.get(r.from_user_id);
          const reaction = reactionFor(r.icon);
          return (
            <motion.span
              key={r.id}
              initial={{ opacity: 0, y: 14, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 460, damping: 24 }}
              className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25"
            >
              {reaction ? (
                <Lottie animationData={reaction.data} loop className="h-8 w-8" />
              ) : (
                <img src={r.icon} alt="" className="h-7 w-7 object-contain" />
              )}
              {/* Whose it is — a reaction with nobody attached is just noise. */}
              <span className="absolute -bottom-1 -right-1">
                <SmartAvatar
                  avatarUrl={who?.avatar_url ?? null}
                  fallback={who?.nickname ?? "?"}
                  size="xs"
                  className="h-[18px] w-[18px] ring-2 ring-[#7E7BDC]"
                />
              </span>
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
