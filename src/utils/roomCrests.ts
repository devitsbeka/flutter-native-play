import { supabase } from "@/integrations/supabase/client";

/**
 * The crests a Battle room wears when its captains have not chosen yet.
 *
 * The owner's rule: a side shows either the icon its captain set or a
 * RANDOM one — never the stock hat-and-car pair that made every arena
 * look like the same arena. "Random" still has to agree across surfaces
 * (the lobby, the public card, every device), so the deal is a hash of
 * the room id into a deterministically ORDERED pool: same room, same
 * pair, everywhere, across refreshes — until a captain's choice, which
 * always wins.
 */

/** One shared pool, ordered so every client deals from the same deck. */
export async function fetchCrestPool(): Promise<string[]> {
  const { data } = await supabase
    .from("icon_library")
    .select("icon_url")
    .not("icon_url", "is", null)
    .order("icon_url")
    .limit(80);
  return (data ?? []).map((r) => r.icon_url as string).filter(Boolean);
}

const seed = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/**
 * A single face for any room that never set one — seeded by the room id off
 * the same ordered pool, so a room keeps ITS random icon across refreshes and
 * surfaces (the search strip, the public card) instead of a blank gamepad.
 * The host's `room_icon` always wins; this only fills the gap.
 */
export function dealtRoomIcon(roomId: string, pool: readonly string[]): string | null {
  if (pool.length === 0) return null;
  return pool[seed(roomId) % pool.length];
}

/** What the captains set, with a per-room dealt pair filling the gaps. */
export function dealtCrests(
  roomId: string,
  pool: readonly string[],
  set: { a: string | null; b: string | null },
): { a: string | null; b: string | null } {
  let { a, b } = set;
  if (pool.length > 1) {
    const h = seed(roomId);
    if (!a) a = pool[h % pool.length];
    if (!b) {
      let j = (h + 7) % pool.length;
      if (pool[j] === a) j = (j + 1) % pool.length;
      b = pool[j];
    }
  }
  return { a, b };
}
