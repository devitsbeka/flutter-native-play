import { roomWantsPublic, type DraftRoomLike } from "@/utils/roomCreateOffered";

/**
 * Public or private — one rule, asked in one place.
 *
 * A room's kind decides what its lobby offers (a public room has a door to
 * guard: Joining open/ask-me; a private one has a question count and Play on
 * TV), which list it belongs to, and who may walk in. Those three answers
 * used to be derived separately, and they disagreed: a room could show the
 * public rules while sitting on the Private tab, which is what the owner
 * saw ("why private room shows open/ask me ... we need strict rules for
 * rooms which are public and which are private").
 *
 * The rule, in full:
 *
 *   A room is PUBLIC only if it was created as public. Nothing else makes
 *   one — not the tab that happens to be selected when an unrelated screen
 *   creates a room, not a default. The kind is decided by the caller that
 *   creates the room, written on the row, and never changed afterwards
 *   (the lobby has no visibility switch — owner: "remove public/private
 *   tabs").
 *
 * `is_public` is the settled fact. A room made public from the Public tab
 * is a DRAFT until its Create is pressed (`is_draft` + `draft_public`) and
 * is not listed to anybody in the meantime — but it is already a public
 * room, and its lobby must say so. Both halves are this predicate.
 */
export function roomIsPublicKind(
  room: (DraftRoomLike & { is_public?: boolean | null }) | null | undefined,
): boolean {
  if (!room) return false;
  return room.is_public === true || roomWantsPublic(room);
}

/** The same answer as a word, for anything that stores or logs the kind. */
export type RoomKind = "public" | "private";

export function roomKindOf(
  room: (DraftRoomLike & { is_public?: boolean | null }) | null | undefined,
): RoomKind {
  return roomIsPublicKind(room) ? "public" : "private";
}
