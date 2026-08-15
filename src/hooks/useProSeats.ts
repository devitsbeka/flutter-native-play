import { useCallback, useEffect, useState } from "react";
import { callRpc, selectRows } from "@/integrations/supabase/rpc";
import { useAuth } from "@/hooks/useAuth";
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
        // The server's message is shown as-is. It knows why it refused —
        // subscription lapsed, seats full, the friend already pays for their
        // own — and restating those checks here would be a second copy of the
        // rules, free to drift from the one that is enforced.
        const { data, error } = await callRpc<GrantResult>("grant_pro_seat", {
          p_holder_id: holderId,
        });
        if (error) {
          toast.error(error.message);
          return false;
        }
        await refresh();
        toast.success(
          data ? `PRO given — ${data.seats_used} of ${data.seats_total} seats used` : "PRO given",
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
          toast.error(error.message);
          return false;
        }
        await refresh();
        toast.success("Seat taken back");
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
