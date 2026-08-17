import { useCallback, useEffect, useState } from "react";
import { callRpc, selectRows, type RpcError } from "@/integrations/supabase/rpc";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

/**
 * PRO seats: giving your subscription's PRO to a friend.
 *
 * PRO carries one seat, Friends PRO five. Every rule about who may grant, how
 * many, and for how long lives in the database — `grant_pro_seat` reads the
 * granter from `auth.uid()` and the allowance from the paid subscription, and
 * a trigger on `vip_subscriptions` expires seats when the subscription that
 * paid for them ends.
 *
 * So this hook decides nothing. It names a friend and reports what the server
 * said. The version of this feature that was removed worked the other way
 * round: the client passed the recipient to a function that trusted it, and
 * any signed-in player could name themselves.
 *
 * Seats are given to accounts that already exist. The old flow granted at
 * signup and the insert was refused by RLS, so the friend saw a success
 * message and received nothing.
 */

export interface ProSeat {
  id: string;
  holderId: string;
  grantedAt: string;
}

interface GrantResult {
  granted: boolean;
  seats_used: number;
  seats_total: number;
  expires_at: string;
}

/**
 * The refusal, in the player's language.
 *
 * Each `RAISE EXCEPTION` in the seat functions carries a code as its HINT, so
 * this is a lookup and not a second copy of the rules — the database still
 * decides, and a code with no entry falls through to the English sentence it
 * came with rather than to a blank toast.
 */
const SEAT_ERRORS: Record<string, string> = {
  pro_seat_signed_out: "extra.proSeatErrSignedOut",
  pro_seat_self: "extra.proSeatErrSelf",
  pro_seat_no_subscription: "extra.proSeatErrNoSubscription",
  pro_seat_none_free: "extra.proSeatErrNoneFree",
  pro_seat_holder_has_pro: "extra.proSeatErrHolderHasPro",
  pro_seat_not_found: "extra.proSeatErrNotFound",
};

function seatErrorMessage(error: RpcError): string {
  const key = error.hint ? SEAT_ERRORS[error.hint] : undefined;
  return key ? t(key) : error.message;
}

export function useProSeats(seatsTotal: number) {
  const { user } = useAuth();
  const [seats, setSeats] = useState<ProSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setSeats([]);
      setLoading(false);
      return;
    }
    const { data, error } = await selectRows<{
      id: string;
      holder_id: string;
      granted_at: string;
    }>("pro_seats", (q) =>
      q
        .select("id, holder_id, granted_at")
        .eq("granter_id", user.id)
        .is("revoked_at", null)
        .order("granted_at", { ascending: true }),
    );

    if (error) {
      console.error("[pro-seats] could not load seats:", error.message);
    } else {
      setSeats(
        (data ?? []).map((r) => ({
          id: r.id,
          holderId: r.holder_id,
          grantedAt: r.granted_at,
        })),
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const grant = useCallback(
    async (holderId: string): Promise<boolean> => {
      setBusy(true);
      try {
        // The server decides why it refused — subscription lapsed, seats
        // full, the friend already holds PRO — and restating those checks
        // here would be a second copy of the rules, free to drift from the
        // one that is enforced. Only the wording is ours.
        const { data, error } = await callRpc<GrantResult>("grant_pro_seat", {
          p_holder_id: holderId,
        });
        if (error) {
          toast.error(seatErrorMessage(error));
          return false;
        }
        await refresh();
        toast.success(
          data
            ? t("extra.proSeatGivenCount", { used: data.seats_used, total: data.seats_total })
            : t("extra.proSeatGiven"),
        );
        return true;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const revoke = useCallback(
    async (holderId: string): Promise<boolean> => {
      setBusy(true);
      try {
        const { error } = await callRpc<{ revoked: boolean }>("revoke_pro_seat", {
          p_holder_id: holderId,
        });
        if (error) {
          toast.error(seatErrorMessage(error));
          return false;
        }
        await refresh();
        toast.success(t("extra.proSeatRevoked"));
        return true;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    seats,
    seatsUsed: seats.length,
    seatsTotal,
    seatsFree: Math.max(0, seatsTotal - seats.length),
    loading,
    busy,
    grant,
    revoke,
    refresh,
  };
}
