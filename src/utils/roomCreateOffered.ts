/**
 * Which rooms have already had their "Create" pressed.
 *
 * A host alone in a finished room is offered "Create" instead of a dead
 * Start: it hands them back to the list their room leads, which is where
 * the second player has to come from. That offer is worth making ONCE. Press
 * it, come back, and the room has not changed — it is the same finished room
 * still waiting on somebody — so a button that offers the same trip again is
 * a loop, not a way on. From then on the footer says what is actually true:
 * Start, dead until there are two of you (owner: "when i click create once we
 * should show disable start game button again and when there are minimum 2
 * online players in the room - we show start game as clickable").
 *
 * Kept per device rather than on the room row: it is a fact about what this
 * person has been shown, not about the room. A host on a second device is
 * offered it once there too, which is the right answer for what the offer is
 * — a signpost out of a screen they have not been on yet.
 */

export const CREATE_OFFERED_KEY = "roomsCreateOffered";

/**
 * Cap the list rather than let it grow for the life of the install.
 *
 * Newest first, so the rooms a host is actually moving between stay
 * remembered; an id that falls off the end at worst offers the button once
 * more on a room from weeks ago.
 */
export const CREATE_OFFERED_MAX = 60;

/**
 * localStorage can throw outright — a private window, a browser set to block
 * site data — and the value can be anything, since nothing stops a person
 * editing it. Neither is a reason to take the lobby's footer down, so both
 * end as "not pressed yet": the host is offered Create, which is the state
 * this began in.
 */
function readIds(): string[] {
  try {
    const stored = localStorage.getItem(CREATE_OFFERED_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

/** Has this host already taken the Create trip out of this room? */
export function hasPressedCreate(roomId: string | null | undefined): boolean {
  if (!roomId) return false;
  return readIds().includes(roomId);
}

/** Remember that they have, so the footer stops offering it. */
export function rememberPressedCreate(roomId: string | null | undefined): void {
  if (!roomId) return;
  try {
    const next = [roomId, ...readIds().filter((id) => id !== roomId)].slice(0, CREATE_OFFERED_MAX);
    localStorage.setItem(CREATE_OFFERED_KEY, JSON.stringify(next));
  } catch {
    // Nothing to do: the offer simply stands next time. Losing this is not
    // worth a failed navigation on the tap that was meant to leave.
  }
}

/**
 * Rooms made by "+ Room" that the host has not yet settled.
 *
 * "+ Room" opens the lobby on a room that already exists, because a lobby
 * needs a row to subscribe to, invite into and rename. But the host has
 * not said they want it: only Create (or Start) does that. A draft the
 * host backs out of, still alone in it, should not be left behind on the
 * list (owner: "if i click + room and didn't choose category and clicked
 * back button, room shouldn't be created, only after clicking create - we
 * create rooms"). This remembers which rooms are drafts, per device — the
 * same device that made them and is the only one that can back out of them.
 */
export const DRAFT_ROOMS_KEY = "roomsDraft";
/**
 * The drafts that are to be PUBLISHED when Create settles them.
 *
 * A draft is made private whatever tab it came from: a public draft was on
 * the Public list the moment "+ Room" was pressed, before a category, before
 * Create — a room nobody had built, listed to everybody (owner: "when i
 * click + room, that room already exist on public list ... until i click
 * create do not create room and show on public list"). So the row is born
 * private, the lobby treats it as public by intent (rules, counting, the
 * door), and Create or Start flips is_public. This list is the intent.
 */
export const DRAFT_PUBLIC_KEY = "roomsDraftPublic";

function readDraftIds(): string[] {
  try {
    const stored = localStorage.getItem(DRAFT_ROOMS_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function writeDraftIds(ids: string[]): void {
  try {
    localStorage.setItem(DRAFT_ROOMS_KEY, JSON.stringify(ids.slice(0, CREATE_OFFERED_MAX)));
  } catch {
    // Storage refused (private mode, quota): the room simply is not a draft
    // this device remembers, and backing out keeps it — the safe side.
  }
}

function readPublicIds(): string[] {
  try {
    const stored = localStorage.getItem(DRAFT_PUBLIC_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function writePublicIds(ids: string[]): void {
  try {
    localStorage.setItem(DRAFT_PUBLIC_KEY, JSON.stringify(ids.slice(0, CREATE_OFFERED_MAX)));
  } catch {
    // Storage refused: the draft stays private, which is the safe side —
    // the host can still publish it from the lobby's own rules.
  }
}

export function rememberDraftRoom(
  roomId: string | null | undefined,
  opts: { publishAs?: "public" | "private" } = {},
): void {
  if (!roomId) return;
  writeDraftIds([roomId, ...readDraftIds().filter((id) => id !== roomId)]);
  const rest = readPublicIds().filter((id) => id !== roomId);
  writePublicIds(opts.publishAs === "public" ? [roomId, ...rest] : rest);
}

export function forgetDraftRoom(roomId: string | null | undefined): void {
  if (!roomId) return;
  writeDraftIds(readDraftIds().filter((id) => id !== roomId));
  writePublicIds(readPublicIds().filter((id) => id !== roomId));
}

/** Is this draft meant to be public once Create settles it? */
export function draftWantsPublic(roomId: string | null | undefined): boolean {
  if (!roomId) return false;
  return readPublicIds().includes(roomId);
}

export function isDraftRoom(roomId: string | null | undefined): boolean {
  if (!roomId) return false;
  return readDraftIds().includes(roomId);
}

/**
 * The row, when it can say; this device's memory when it cannot.
 *
 * The draft used to live in localStorage only, and localStorage is per
 * device: on the host's second device the same room was not a draft and
 * had no publish intent, so Create there published nothing and landed on
 * the wrong tab, while the first device still believed the room could be
 * backed out of and deleted. 20261106120000_drafts_on_the_row.sql puts
 * both facts on game_rooms (`is_draft`, `draft_public`); a row that carries
 * them is believed over the device, and a row from before the migration
 * (the column missing, so `undefined`) falls back to what the device
 * remembers, which is what it was.
 */
export interface DraftRoomLike {
  id: string;
  is_draft?: boolean | null;
  draft_public?: boolean | null;
}

export function roomIsDraft(room: DraftRoomLike | null | undefined): boolean {
  if (!room) return false;
  if (typeof room.is_draft === "boolean") return room.is_draft;
  return isDraftRoom(room.id);
}

export function roomWantsPublic(room: DraftRoomLike | null | undefined): boolean {
  if (!room) return false;
  if (typeof room.is_draft === "boolean") return room.is_draft && Boolean(room.draft_public);
  return draftWantsPublic(room.id);
}
