import { useEffect, useMemo, useState } from "react";

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
  /** When THIS device saw it. Set by the receiver; see TeamBattleContext. */
  at?: number;
}

/** How long a reaction stays on screen. */
export const REACTION_MS = 1500;

/**
 * The reactions on screen right now — everybody's, for a second and a half.
 *
 * They used to be held back: addressed to the player on the spot, stacked in
 * an inbox, and shown to them only once their turn was over. Which meant the
 * six people who sent them watched nothing happen, and the one person they
 * were sent to read them after the moment had passed. A reaction is a noise
 * you make while something is happening; it belongs on everyone's screen,
 * now, and then gone.
 *
 * Re-renders itself as they expire — the array they come from only ever
 * grows, so nothing else would tell this hook that a window had closed.
 */
export function useLiveReactions(reactions: RoomReaction[]): RoomReaction[] {
  const [, tick] = useState(0);

  const live = useMemo(() => {
    const now = Date.now();
    return reactions.filter((r) => r.at != null && now - r.at < REACTION_MS);
  }, [reactions]);

  const soonest = live.length > 0 ? Math.min(...live.map((r) => r.at ?? 0)) : null;
  useEffect(() => {
    if (soonest == null) return;
    const left = Math.max(0, soonest + REACTION_MS - Date.now()) + 20;
    const timer = window.setTimeout(() => tick((n) => n + 1), left);
    return () => window.clearTimeout(timer);
  }, [soonest, reactions]);

  return live;
}
