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

export function rememberDraftRoom(roomId: string | null | undefined): void {
  if (!roomId) return;
  writeDraftIds([roomId, ...readDraftIds().filter((id) => id !== roomId)]);
}

export function forgetDraftRoom(roomId: string | null | undefined): void {
  if (!roomId) return;
  writeDraftIds(readDraftIds().filter((id) => id !== roomId));
}

export function isDraftRoom(roomId: string | null | undefined): boolean {
  if (!roomId) return false;
  return readDraftIds().includes(roomId);
}
