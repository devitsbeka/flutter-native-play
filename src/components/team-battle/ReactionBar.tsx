import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { RoomIconPickerModal } from "@/components/team/RoomIconPickerModal";
import { fetchCrestPool } from "@/utils/roomCrests";
import {
  RECENT_ICONS_MAX,
  readRecentIcons,
  rememberRecentIcon,
  sendReaction,
} from "@/hooks/useRoomReactions";

/**
 * The icon sender at the foot of the question screen.
 *
 * A row of the icons this device sent most recently — a tap sends one to
 * the player on the spot — and a + that opens the library for any other.
 * Before anything has been sent, the row is dealt from the library so it
 * is never empty. What is sent is not shown to the spotlight until their
 * turn is over; that is the inbox's job.
 */
export function ReactionBar({ roomId, toUserId }: { roomId: string; toUserId: string }) {
  const { t } = useLanguage();
  const [recent, setRecent] = useState<string[]>(() => readRecentIcons());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [flying, setFlying] = useState<string | null>(null);

  useEffect(() => {
    if (recent.length >= RECENT_ICONS_MAX) return;
    let cancelled = false;
    void fetchCrestPool().then((pool) => {
      if (cancelled) return;
      setRecent((cur) => {
        const fill = pool.filter((p) => !cur.includes(p)).slice(0, RECENT_ICONS_MAX - cur.length);
        return fill.length ? [...cur, ...fill] : cur;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A send that failed used to be indistinguishable from one that worked:
  // the icon flew, nothing arrived, and nothing said so. The caption says it
  // instead, for a few seconds.
  const [failed, setFailed] = useState(false);
  const send = async (icon: string) => {
    setFlying(icon);
    window.setTimeout(() => setFlying((f) => (f === icon ? null : f)), 700);
    const ok = await sendReaction(roomId, toUserId, icon);
    if (ok) {
      setRecent(rememberRecentIcon(icon));
      setFailed(false);
      return;
    }
    setFailed(true);
    window.setTimeout(() => setFailed(false), 4000);
  };

  return (
    <div className="flex-shrink-0 px-4 pb-[calc(0.5rem_+_var(--safe-bottom))] pt-1">
      <p
        className={`text-center text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${
          failed ? "text-red-300" : "text-white/60"
        }`}
      >
        {failed ? t("teamBattle.iconSendFailed") : t("teamBattle.sendIcon")}
      </p>
      <div className="flex items-center justify-center gap-2">
        {recent.slice(0, RECENT_ICONS_MAX).map((icon) => (
          <motion.button
            key={icon}
            type="button"
            whileTap={{ scale: 0.85 }}
            animate={flying === icon ? { y: [0, -18, 0], scale: [1, 1.25, 1] } : { y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            onClick={() => void send(icon)}
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
          onClose={() => setPickerOpen(false)}
          currentIconUrl={null}
          roomName={t("teamBattle.sendIcon")}
          onConfirm={(iconUrl) => {
            setPickerOpen(false);
            if (iconUrl) void send(iconUrl);
          }}
        />
      )}
    </div>
  );
}

/**
 * What came in while you were playing: shown once the turn is over, with
 * the senders' faces, until dismissed.
 */
export function ReactionInbox({
  items,
  senders,
  onDismiss,
}: {
  items: { id: string; icon: string; from_user_id: string }[];
  senders: Map<string, { nickname: string; avatar_url: string | null }>;
  onDismiss: () => void;
}) {
  const { t } = useLanguage();
  if (items.length === 0) return null;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onDismiss}
      className="mx-4 mb-2 flex-shrink-0 rounded-2xl bg-white/15 border border-white/20 px-3 py-2 text-left"
    >
      <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wide mb-1.5">
        {t("teamBattle.iconsForYou")}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((r) => {
          const who = senders.get(r.from_user_id);
          return (
            <span key={r.id} className="relative w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <img src={r.icon} alt="" className="w-8 h-8 object-contain" />
              {who?.avatar_url ? (
                <img
                  src={who.avatar_url}
                  alt={who.nickname}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full object-cover ring-2 ring-[#7E7BDC]"
                />
              ) : (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white/90 text-[9px] font-bold text-[#402666] flex items-center justify-center ring-2 ring-[#7E7BDC]">
                  {(who?.nickname ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </motion.button>
  );
}
