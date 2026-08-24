import { supabase } from "@/integrations/supabase/client";

/**
 * Who, of these people, is in the app right now.
 *
 * Everything that draws a green ring, a live badge or a presence dot goes
 * through here, because none of it can read the presence table any more —
 * and, it turns out, none of it ever could. `user_presence` is owner-only by
 * policy: a signed-in player reads exactly one row, their own. Every screen
 * asking "who is here" got back "you, and nobody else in the world", which is
 * indistinguishable from everyone having closed the app.
 *
 * `presence_for_users` is the way in. It answers with three facts instead of
 * rows, so the page path and the country stay in a row nobody else can read.
 */
export interface PresenceFacts {
  userId: string;
  /** Status online, heartbeat inside two minutes. */
  isOnline: boolean;
  /** Heartbeat inside ten minutes. */
  recentlyActive: boolean;
  /** The room they are in, when they are in one. */
  currentRoom: string | null;
}

interface PresenceRow {
  user_id: string;
  is_online: boolean;
  recently_active: boolean;
  current_room: string | null;
}

// The generated types do not know this function — regenerating them against a
// database missing this repo's other migrations silently deletes six of them
// (see AGENTS.md), so the cast is deliberate and cheaper than that.
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: unknown }>;

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const RECENT_WINDOW_MS = 10 * 60 * 1000;

/**
 * The old path: read the table directly.
 *
 * Kept as a fallback for the window between this shipping and the migration
 * being applied, where the function does not exist yet. It returns your own
 * row and nothing else — the bug this replaces — which is still better than a
 * screen with no presence at all while the two land minutes apart.
 */
async function presenceFromTable(userIds: string[]): Promise<PresenceFacts[]> {
  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

  const { data } = await supabase
    .from("user_presence")
    .select("user_id, status, last_seen, current_page")
    .in("user_id", userIds)
    .gte("last_seen", since);

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    isOnline: row.status === "online" && (row.last_seen ?? "") >= onlineSince,
    recentlyActive: true,
    currentRoom: row.current_page?.startsWith("/room/")
      ? row.current_page.slice("/room/".length)
      : null,
  }));
}

export async function presenceForUsers(userIds: string[]): Promise<PresenceFacts[]> {
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return [];

  try {
    const { data, error } = await rpc("presence_for_users", { p_user_ids: ids });
    if (error) return presenceFromTable(ids);

    return ((data as PresenceRow[] | null) ?? []).map((row) => ({
      userId: row.user_id,
      isOnline: !!row.is_online,
      recentlyActive: !!row.recently_active,
      currentRoom: row.current_room,
    }));
  } catch {
    return presenceFromTable(ids);
  }
}

/** Just the ids that are online — what a ring or a dot needs. */
export async function onlineUserIds(userIds: string[]): Promise<Set<string>> {
  const rows = await presenceForUsers(userIds);
  return new Set(rows.filter((r) => r.isOnline).map((r) => r.userId));
}
