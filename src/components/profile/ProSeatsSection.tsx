import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Loader2, UserMinus, UserPlus } from "lucide-react";
import { useVipStatus } from "@/contexts/VipContext";
import { useFriends } from "@/hooks/useFriends";
import { useProSeats } from "@/hooks/useProSeats";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const nameOf = (id: string) =>
    friends.find((f) => f.friendId === id)?.nickname ?? t("extra.proSeatsUnknown");

  if (!isVip || seatsTotal === 0) return null;

  return (
    <div className="rounded-2xl p-4 bg-white/70 dark:bg-white/5 border border-purple-200/60">
      <div className="flex items-center gap-2 mb-1">
        <Crown className="w-5 h-5 text-purple-600" />
        <h3 className="font-bold text-base">{t("extra.proSeatsTitle")}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
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
                <span className="font-semibold text-sm truncate">{nameOf(seat.holderId)}</span>
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

          {seatsFree > 0 && (
            <div className="mt-3">
              {picking ? (
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                  {grantable.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      {t("extra.proSeatsNoFriends")}
                    </p>
                  ) : (
                    grantable.map((f) => (
                      <button
                        key={f.friendId}
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          if (await grant(f.friendId)) setPicking(false);
                        }}
                        className="text-left rounded-xl px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 font-semibold text-sm"
                      >
                        {f.nickname}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="flex items-center gap-2 text-sm font-bold text-purple-700 dark:text-purple-300"
                >
                  <UserPlus className="w-4 h-4" />
                  {t("extra.proSeatsGive", { count: seatsFree })}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
