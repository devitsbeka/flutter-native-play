import { supabase } from "@/integrations/supabase/client";

/**
 * Whether this database has been told about published rooms yet.
 *
 * Migrations here are applied by hand, through Lovable, after the branch
 * merges — so there is a window where the deployed app knows about
 * `game_rooms.is_public` and the database does not. PostgREST answers an
 * insert naming an unknown column with a 400 and writes nothing, and the
 * column in question rides along on the one write this whole page exists to
 * make. Sending it blind would take room creation down for everyone until
 * somebody pasted the SQL.
 *
 * So it is asked once, lazily, and cached for the session: one cheap select
 * before the first room of a session is created, and none after. A session
 * that started before the migration landed keeps making private rooms until
 * the app is reloaded, which is the mild half of the failure.
 *
 * Once the migration is live everywhere this file can go, and the four
 * inserts can name the column directly.
 */
let probe: Promise<boolean> | null = null;

export function gameRoomsHasIsPublic(): Promise<boolean> {
  if (!probe) {
    probe = (async () => {
      try {
        const { error } = await supabase.from("game_rooms").select("is_public").limit(1);
        return !error;
      } catch {
        // A network failure says nothing about the schema, but the caller
        // is one line away from an insert that will fail on its own if the
        // connection is really gone. Private is the safe answer.
        return false;
      }
    })();
  }
  return probe;
}

/**
 * The `is_public` half of a game_rooms insert, or nothing at all when the
 * column is not there yet. Spread it into the insert:
 *
 *     .insert({ ...rest, ...(await roomVisibilityFields(isPublic)) })
 */
export async function roomVisibilityFields(
  isPublic: boolean,
): Promise<{ is_public?: boolean }> {
  return (await gameRoomsHasIsPublic()) ? { is_public: isPublic } : {};
}

/** Test seam: forget what was probed. */
export function resetRoomVisibilityProbe(): void {
  probe = null;
}
