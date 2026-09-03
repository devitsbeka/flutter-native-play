import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeamBattle } from "@/contexts/TeamBattleContext";
import { RoomIconPickerModal } from "@/components/team/RoomIconPickerModal";
import { fetchCrestPool } from "@/utils/roomCrests";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { RECENT_ICONS_MAX, useSentIcons, type RoomReaction } from "@/hooks/useRoomReactions";

/** A stable-per-game shuffle: the deal is different each match, not each render. */
function dealIcons(pool: readonly string[], count: number): string[] {
  const deck = [...pool];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, count);
}

/**
 * The icon sender at the foot of the question screen.
 *
 * A row dealt at random from the library at the start of the match, and a +
 * that opens the library for anything else. What this player has actually
 * sent THIS game moves to the front of the row as they send it.
 *
 * The row used to be read out of localStorage — "recently used", forever —
 * so the same six icons greeted the same player every match they ever
 * played. The owner's rule: random every game, used ones first.
 *
 * What is sent is not shown to the player on the spot until their turn is
 * over; that is the inbox's job, below.
 */
export function ReactionBar({ toUserId }: { toUserId: string }) {
  const { t } = useLanguage();
  const { sendReaction } = useTeamBattle();
  const { sent, remember } = useSentIcons();
  const [dealt, setDealt] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [flying, setFlying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchCrestPool().then((pool) => {
      if (!cancelled) setDealt(dealIcons(pool, RECENT_ICONS_MAX));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sent first, then the deal — and never the same icon twice in the row.
  const row = [...sent, ...dealt.filter((d) => !sent.includes(d))].slice(0, RECENT_ICONS_MAX);

  const send = (icon: string) => {
    setFlying(icon);
    window.setTimeout(() => setFlying((f) => (f === icon ? null : f)), 700);
    sendReaction(toUserId, icon);
    remember(icon);
  };

  return (
    <div className="flex-shrink-0 px-4 pb-[calc(0.5rem_+_var(--safe-bottom))] pt-1">
      <p className="text-center text-white/60 text-[11px] font-semibold uppercase tracking-wide mb-1.5">
        {t("teamBattle.sendIcon")}
      </p>
      <div className="flex items-center justify-center gap-2">
        {row.map((icon) => (
          <motion.button
            key={icon}
            type="button"
            layout
            whileTap={{ scale: 0.85 }}
            animate={flying === icon ? { y: [0, -18, 0], scale: [1, 1.25, 1] } : { y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            onClick={() => send(icon)}
            className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center"
          >
            <img src={icon} alt="" className="w-8 h-8 object-contain" />
          </motion.button>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={t("teamBattle.sendIcon")}
          className="w-11 h-11 rounded-2xl bg-white/25 border border-white/30 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {pickerOpen && (
        <RoomIconPickerModal
          isOpen
          iconOnly
          // "Select" is what you do to a room's icon. This one leaves the
          // screen the moment it is pressed.
          confirmLabel={t("teamBattle.sendIconAction")}
          onClose={() => setPickerOpen(false)}
          currentIconUrl={null}
          roomName={t("teamBattle.sendIcon")}
          onConfirm={(iconUrl) => {
            setPickerOpen(false);
            if (iconUrl) send(iconUrl);
          }}
        />
      )}
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
          <img src={next.icon} alt="" className="h-9 w-9 object-contain" />
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
