import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FAKE_ACCOUNT_USER_IDS, fakeAcceptDelayMs } from "@/config/fakeAccounts";

// Seeded fake profiles never sign in, so a friend request sent to one would
// stay pending forever. This accepts those requests on the requester's own
// client once enough time has passed — never instantly, and at a per-request
// moment derived from the row id, so different requests land at different
// times like real people replying whenever they happen to look.
//
// Only ids listed in FAKE_ACCOUNT_USER_IDS are ever touched; requests to real
// people are left alone for them to answer.
export function FakeFriendRequestAutoAccept() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current || FAKE_ACCOUNT_USER_IDS.length === 0) return;
    ran.current = true;

    (async () => {
      try {
        const { data: pending, error } = await supabase
          .from("friendships")
          .select("id, friend_id, created_at")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .in("friend_id", FAKE_ACCOUNT_USER_IDS);

        if (error || !pending?.length) return;

        const now = Date.now();
        const due = pending.filter((row) => {
          const sentAt = row.created_at ? new Date(row.created_at).getTime() : now;
          return now - sentAt >= fakeAcceptDelayMs(row.id);
        });

        for (const row of due) {
          await supabase
            .from("friendships")
            .update({ status: "accepted", accepted_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      } catch (e) {
        console.error("[FakeFriendRequestAutoAccept]", e);
      }
    })();
  }, [user]);

  return null;
}
