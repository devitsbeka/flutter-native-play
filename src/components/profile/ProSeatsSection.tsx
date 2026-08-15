import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Loader2, UserMinus, UserPlus } from "lucide-react";
import { useVipStatus } from "@/contexts/VipContext";
import { useFriends } from "@/hooks/useFriends";
import { useProSeats } from "@/hooks/useProSeats";
import { useLanguage } from "@/contexts/LanguageContext";
import crownIcon from "@/assets/crown-icon.png";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { SafeAvatar } from "@/components/shared/SafeAvatar";

/**
 * Give your PRO to a friend.
 *
 * PRO carries one seat, Friends PRO five — the benefit the tier cards
 * advertise. The seat count shown here is only for display: `grant_pro_seat`
 * reads the allowance from the paid subscription itself and refuses past it,
 * so a stale number on screen cannot turn into an extra seat.
 *
 * Rendered only for an active subscriber, because there is nothing to say to
 * anyone else — the paywall is a screen away and this would just be a locked
 * panel taking up room on it.
 */

const SEATS_BY_TIER: Record<string, number> = {
  pro: 1,
  standard: 1,
  pro_plus: 5,
  pro_master: 5,
};

export function ProSeatsSection() {
  const { t } = useLanguage();
  const { subscription, isVip } = useVipStatus();
  const { friends } = useFriends();
  const [picking, setPicking] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  // Which row is in flight. `busy` from the hook disables them all, which is
  // right, but without this every row would spin and none would say which
  // friend the seat was going to.
  const [sending, setSending] = useState<string | null>(null);

  const tier = subscription?.vip_tier ?? "";
  // A seat-granted subscription confers no seats of its own — otherwise one
  // purchase chains into unlimited PRO. The database enforces this; matching
  // it here keeps the panel from offering something that would be refused.
  const isSeatHolder =
    (subscription as { purchase_platform?: string } | null)?.purchase_platform === "seat";
  const seatsTotal = isSeatHolder ? 0 : (SEATS_BY_TIER[tier] ?? 0);

  const { seats, seatsUsed, seatsFree, loading, busy, grant, revoke } =
    useProSeats(seatsTotal);

  const held = useMemo(() => new Set(seats.map((s) => s.holderId)), [seats]);
  const grantable = useMemo(
    () => friends.filter((f) => f.status === "accepted" && !held.has(f.friendId)),
    [friends, held],
  );
  // A seat can outlive the friendship it was given across, so the holder may
  // not be in the friends list any more. The seat is still real and still
  // revocable — falling back to a label keeps it visible instead of rendering
  // a blank row nobody can act on.
  const holderOf = (id: string) => friends.find((f) => f.friendId === id);
  const nameOf = (id: string) => holderOf(id)?.nickname ?? t("extra.proSeatsUnknown");

  if (!isVip || seatsTotal === 0) return null;

  return (
    <div className="rounded-2xl p-4 bg-white/70 dark:bg-white/5 border border-purple-200/60">
      <div className="flex items-center gap-2 mb-1">
        <img src={crownIcon} alt="" className="w-6 h-6 object-contain" draggable={false} />
        <h3 className="font-bold text-base">{t("extra.proSeatsTitle")}</h3>
      </div>
      {/* What the seat is and what happens to it, before the button that
          spends one. The card used to say "0 of 1 seats used" and nothing
          else, which names a quantity without saying what a seat does. */}
      <p className="text-sm text-muted-foreground">
        {t("extra.proSeatsHow")}
      </p>
      <p className="text-sm font-semibold mb-3 mt-1">
        {t("extra.proSeatsSubtitle", { used: seatsUsed, total: seatsTotal })}
      </p>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {seats.map((seat) => (
              <motion.li
                key={seat.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 bg-purple-50 dark:bg-purple-900/20"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <SafeAvatar
                    avatarUrl={holderOf(seat.holderId)?.avatarUrl}
                    fallback={nameOf(seat.holderId)}
                    className="w-9 h-9 shrink-0 border border-purple-200"
                    fallbackClassName="text-xs"
                  />
                  <span className="font-semibold text-sm truncate">{nameOf(seat.holderId)}</span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void revoke(seat.holderId)}
                  className="flex items-center gap-1 text-xs font-bold text-red-600 disabled:opacity-50"
                >
                  <UserMinus className="w-4 h-4" />
                  {t("extra.proSeatsRevoke")}
                </button>
              </motion.li>
            ))}
          </ul>

          {/* Nobody to give it to yet. Saying "add a friend first" and
              leaving it there is half an answer — the other half is a way to
              do it without going to find the screen that does. */}
          {seatsFree > 0 && grantable.length === 0 && !picking && (
            <div className="mt-3 flex flex-col items-start gap-2">
              <p className="text-sm text-muted-foreground">{t("extra.proSeatsNoFriends")}</p>
              <button
                type="button"
                onClick={() => setAddingFriend(true)}
                className="flex items-center gap-2 text-sm font-bold text-purple-700 dark:text-purple-300"
              >
                <UserPlus className="w-4 h-4" />
                {t("extra.proSeatsAddFriend")}
              </button>
            </div>
          )}

          {seatsFree > 0 && grantable.length > 0 && (
            <div className="mt-3">
              {picking ? (
                <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
                  {grantable.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      {t("extra.proSeatsNoFriends")}
                    </p>
                  ) : (
                    /* A face and a named action, rather than a list of names
                       that turn out to be buttons: the row said nothing about
                       what tapping it would spend, and a seat is not a thing
                       to hand over by accident. */
                    grantable.map((f) => {
                      const inFlight = sending === f.friendId;
                      return (
                        <div
                          key={f.friendId}
                          className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <SafeAvatar
                              avatarUrl={f.avatarUrl}
                              fallback={f.nickname}
                              className="w-9 h-9 shrink-0 border border-purple-200"
                              fallbackClassName="text-xs"
                            />
                            <span className="font-semibold text-sm truncate">{f.nickname}</span>
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              setSending(f.friendId);
                              try {
                                if (await grant(f.friendId)) setPicking(false);
                              } finally {
                                setSending(null);
                              }
                            }}
                            className="flex shrink-0 items-center gap-1.5 rounded-full bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                          >
                            {inFlight ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Crown className="w-3.5 h-3.5" />
                            )}
                            {t("extra.proSeatsSend")}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="flex items-center gap-2 text-sm font-bold text-purple-700 dark:text-purple-300"
                >
                  <Crown className="w-4 h-4" />
                  {t("extra.proSeatsGive", { count: seatsFree })}
                </button>
              )}
            </div>
          )}
        </>
      )}

      <InviteFriendsModal isOpen={addingFriend} onClose={() => setAddingFriend(false)} />
    </div>
  );
}
