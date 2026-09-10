/**
 * Which room MultiplayerProviderV2 is holding right now, readable from
 * outside it.
 *
 * RoundStartWatcher is mounted outside <Routes> and outside the provider, so
 * it cannot ask the context whether the player is standing in the room that
 * just started. It used to read the path instead: "/team means already
 * there". But /team is also the hub — the lists of rooms — and a player on
 * the hub whose room started was left there with a "Live" card and no
 * count-in, while a player anywhere ELSE was brought in. The provider writes
 * its room here as it holds it, and the watcher asks this instead.
 */
let heldRoomId: string | null = null;

export function setHeldRoomId(id: string | null): void {
  heldRoomId = id;
}

export function getHeldRoomId(): string | null {
  return heldRoomId;
}
