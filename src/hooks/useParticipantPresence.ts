import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Which of these people are in the app right now.
 *
 * Scoped to a given set of user ids on purpose. useOnlineUsers fetches every
 * online account there is and then joins profiles onto all of them, which is
 * a lot of rows to download so that a lobby can put a ring on four avatars.
 *
 * "Online" is the same rule the rooms list uses — status online and a
 * heartbeat inside two minutes — so a player is not green on one screen and
 * grey on the other.
 */
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

/** Re-check on a timer as well as on realtime: a heartbeat going stale is
 *  the absence of an event, so nothing would ever tell us they left. */
const RECHECK_MS = 30_000;

export interface ParticipantPresence {
  /** User ids currently online. */
  online: Set<string>;
  /** Ids that were not online a moment ago and are now — one render's worth,
   *  which is what an arrival animation needs to fire once and not again. */
  arrived: Set<string>;
}

export function useParticipantPresence(userIds: string[]): ParticipantPresence {
  const [online, setOnline] = useState<Set<string>>(() => new Set());
  const [arrived, setArrived] = useState<Set<string>>(() => new Set());

  // Sorted and joined so a re-render with the same people does not restart
  // the subscription. Array identity changes on every parent render; this
  // does not.
  const key = useMemo(() => [...userIds].sort().join(","), [userIds]);

  const previous = useRef<Set<string>>(new Set());

  const fetchPresence = useCallback(async () => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) {
      previous.current = new Set();
      setOnline(new Set());
      return;
    }

    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const { data } = await supabase
      .from("user_presence")
      .select("user_id, status, last_seen")
      .in("user_id", ids)
      .eq("status", "online")
      .gte("last_seen", since);

    const next = new Set((data ?? []).map((row) => row.user_id));

    // Everyone who was not here and now is. Computed against a ref rather
    // than against `online` so this callback stays stable and the effect
    // below does not resubscribe on every presence change.
    const justArrived = new Set<string>();
    for (const id of next) if (!previous.current.has(id)) justArrived.add(id);
    previous.current = next;

    setOnline(next);
    if (justArrived.size > 0) setArrived(justArrived);
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void fetchPresence();
    };

    run();
    const timer = setInterval(run, RECHECK_MS);

    // The filter would have to name one user, so this listens to the table
    // and re-reads; the read is one indexed query over a handful of ids.
    const channel = supabase
      .channel(`participant-presence:${key.slice(0, 40)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        run
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [key, fetchPresence]);

  return { online, arrived };
}
