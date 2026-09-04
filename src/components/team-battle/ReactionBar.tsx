import { useState } from "react";
import Lottie from "lottie-react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
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

  const send = () => {
    if (!picked) return;
    setFlying(true);
    window.setTimeout(() => setFlying(false), 700);
    sendReaction(toUserId, picked);
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
          className="flex-shrink-0 h-[46px] px-2.5 rounded-2xl bg-white/25 border border-white/30 text-white text-xs font-bold uppercase whitespace-nowrap active:scale-95 transition-transform disabled:opacity-40"
        >
          {t("teamBattle.sendIconAction")}
        </motion.button>
      </div>
    </div>
  );
}

/**
 * What came in while you were playing — one card at a time.
 *
 * It used to be all of them at once in a wrapped row, which read as a pile
 * of stickers with no sender attached to any of them. Each is its own card
 * now: the icon, the face of whoever sent it, their name, and a count of
 * what is still waiting. Closing one brings up the next.
 */
export function ReactionInbox({
  next,
  remaining,
  senders,
  onDismiss,
}: {
  next: RoomReaction | null;
  remaining: number;
  senders: Map<string, { nickname: string; avatar_url: string | null }>;
  onDismiss: () => void;
}) {
  const { t } = useLanguage();
  if (!next) return null;
  const who = senders.get(next.from_user_id);
  const reaction = reactionFor(next.icon);
  return (
    <AnimatePresence mode="wait">
      <motion.button
        key={next.id}
        type="button"
        initial={{ opacity: 0, y: -10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        onClick={onDismiss}
        className="mx-4 mb-2 flex w-[calc(100%-2rem)] flex-shrink-0 items-center gap-3 rounded-2xl border border-white/25 bg-[#4b3a86]/90 px-3 py-2.5 text-left shadow-lg backdrop-blur-sm"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          {/* A key we know is one of the six; anything else came from a
              device still on the build that sent library icons. */}
          {reaction ? (
            <Lottie animationData={reaction.data} loop className="h-9 w-9" />
          ) : (
            <img src={next.icon} alt="" className="h-9 w-9 object-contain" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/60">
            {t("teamBattle.iconsForYou")}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <SmartAvatar avatarUrl={who?.avatar_url ?? null} fallback={who?.nickname ?? "?"} size="xs" />
            <span className="truncate text-sm font-bold text-white">{who?.nickname ?? "…"}</span>
          </span>
        </span>
        {/* How many are queued behind this one, so closing it does not look
            like the last of them arriving out of nowhere. */}
        {remaining > 1 && (
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
            +{remaining - 1}
          </span>
        )}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
          <X className="h-4 w-4" />
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
