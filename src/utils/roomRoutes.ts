/**
 * Where a room lives.
 *
 * Every invite in the app converges on a room row, and the page that room
 * belongs to depends on its game: the classic lobby, the King couch, the
 * Battle arena, the Words board. That mapping was written by hand in nine
 * places (the notification panel twice, the notifications page, the home
 * sidebar, the rooms list, the active-rooms widget, the public list, the
 * round-start watcher and the /team join peek) and each new game type meant
 * finding all of them. This is the one place.
 *
 * Words is matched on `game_mode` as well as `game_type_key`. The key is a
 * foreign key into the `game_types` catalog, and until the catalog row is
 * applied to the live database a Words room is stored with a null key and
 * `game_mode = 'words'` (supabase/migrations/20260901120000_words_game_type.sql).
 */

export interface RoomLike {
  game_type_key?: string | null;
  game_mode?: string | null;
  room_code?: string | null;
}

export type RoomKind = "classic" | "king" | "team_battle" | "words";

export function roomKind(room: RoomLike | null | undefined): RoomKind {
  if (!room) return "classic";
  if (room.game_type_key === "words" || room.game_mode === "words") return "words";
  if (room.game_type_key === "king") return "king";
  if (room.game_type_key === "team_battle") return "team_battle";
  return "classic";
}

export const isWordsRoom = (room: RoomLike | null | undefined) => roomKind(room) === "words";

/** The path that opens this room, given its code. */
export function routeForRoom(room: RoomLike | null | undefined, code?: string | null): string {
  const roomCode = (code ?? room?.room_code ?? "").toUpperCase();
  switch (roomKind(room)) {
    case "words":
      return `/words/${roomCode}`;
    case "king":
      return `/king?code=${roomCode}`;
    case "team_battle":
      return `/team-battle?code=${roomCode}`;
    default:
      return `/team?join=${roomCode}`;
  }
}

/** The columns a caller has to select for `roomKind` to answer. */
export const ROOM_KIND_COLUMNS = "game_type_key, game_mode";
