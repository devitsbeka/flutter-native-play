import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Reactions sent between players during a match.
 *
 * ## Why there is no table behind this
 *
 * There was one: `room_reactions`, with row-level rules about who may send
 * to whom. It never existed anywhere it mattered. Migrations here land by
 * hand, one paste at a time, and until that paste happens PostgREST answers
 * every insert with "relation does not exist" — so the feature shipped, and
 * every icon anyone tapped for weeks did nothing at all.
 *
 * A reaction does not need a table. It is shown once, to one person, in the
 * few minutes between it being sent and their turn ending, and then it is
 * gone; nothing reads it back later. That is a message, not a record, and
 * the match already has a message channel — the same broadcast the picks
 * and the poke ride on, which every device in the room is subscribed to for
 * the length of the game.
 *
 * What is lost is a recipient who is offline at that instant, who now misses
 * it rather than finding it on reconnect. They are, by construction, sitting
 * in front of the question it was sent about.
 *
 * The transport lives in TeamBattleContext (`sendReaction` / `reactions`);
 * this module is the recipient's side of it.
 *
 * `icon` holds one of the six reaction keys (see
 * `src/components/team-battle/reactions.ts`). There is nothing per-device to
 * remember any more: the sender's row was a most-recently-used list back
 * when the six were dealt out of the icon library.
 */
export interface RoomReaction {
  /** Local id — the sender's clock plus their id, unique enough to dedupe. */
  id: string;
  from_user_id: string;
  to_user_id: string;
  icon: string;
}

/**
 * What came in for me while I was on the spot, read one at a time.
 *
 * `next` is the oldest unread; `dismiss` drops it and the one behind it
 * takes its place. One card at a time was the owner's ask — a wrap of six
 * icons over the top of the board says nothing about who sent what.
 */
export function useIncomingReactions(
  reactions: RoomReaction[],
  meId: string | null | undefined,
) {
  const [readIds, setReadIds] = useState<string[]>([]);
  const readRef = useRef<Set<string>>(new Set());

  const items = useMemo(
    () => reactions.filter((r) => r.to_user_id === meId && !readIds.includes(r.id)),
    [reactions, meId, readIds],
  );

  const dismiss = useCallback(() => {
    setReadIds((prev) => {
      const first = reactions.find((r) => r.to_user_id === meId && !prev.includes(r.id));
      if (!first || readRef.current.has(first.id)) return prev;
      readRef.current.add(first.id);
      return [...prev, first.id];
    });
  }, [reactions, meId]);

  return useMemo(
    () => ({ items, next: items[0] ?? null, remaining: items.length, dismiss }),
    [items, dismiss],
  );
}
