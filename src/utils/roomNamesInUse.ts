import { supabase } from "@/integrations/supabase/client";

/**
 * The names on live public rooms — what a new room's name steers clear of.
 *
 * Two "Noisy Vampires" sat on the Public list at once. A dealt name is one
 * of hundreds, but the list is small and the eye reads two of a kind as one
 * room listed twice (owner: "we have two matching names on public list, we
 * need more random names to avoid repeated room name"). So the deal is told
 * what is already there and passes those over (generateRoomIdentity's
 * `avoid`). A failed read returns nothing and the deal proceeds as before:
 * a repeat is a blemish, not a blocker.
 */
export async function fetchRoomNamesInUse(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("game_rooms")
      .select("room_name")
      .eq("is_public", true)
      .in("status", ["waiting", "playing"])
      .limit(300);
    return (data ?? []).map((r) => r.room_name).filter((n): n is string => !!n);
  } catch {
    return [];
  }
}
