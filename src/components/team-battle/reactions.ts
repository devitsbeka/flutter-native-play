import angry from "@/assets/lottie/reactions/angry.json";
import clap from "@/assets/lottie/reactions/clap.json";
import disappointed from "@/assets/lottie/reactions/disappointed.json";
import genius from "@/assets/lottie/reactions/genius.json";
import laugh from "@/assets/lottie/reactions/laugh.json";
import love from "@/assets/lottie/reactions/love.json";

/**
 * The six things a spectator can say without words.
 *
 * The arena used to send an icon out of the room-icon library — three
 * thousand nouns, a search box and a sheet over the question, to say "well
 * done". Six animations answer what anyone actually wanted to send: a cheer,
 * a laugh, a heart, a jeer, a groan, and hats-off to a good answer.
 *
 * `key` is what goes in the database (`room_reactions.icon`) and what comes
 * back on the recipient's device, so it must stay stable once shipped — the
 * art behind it can change freely, the key cannot. Rows written before this
 * existed hold an icon URL instead; anything that renders a reaction has to
 * cope with a key it does not know (see `reactionFor`).
 */
export interface Reaction {
  key: string;
  /** Lottie animation data, passed straight to <Lottie animationData>. */
  data: unknown;
  /** Locale key for the label a screen reader reads out. */
  labelKey: string;
}

export const REACTIONS: Reaction[] = [
  { key: "clap", data: clap, labelKey: "teamBattle.reactionClap" },
  { key: "laugh", data: laugh, labelKey: "teamBattle.reactionLaugh" },
  { key: "love", data: love, labelKey: "teamBattle.reactionLove" },
  { key: "angry", data: angry, labelKey: "teamBattle.reactionAngry" },
  { key: "disappointed", data: disappointed, labelKey: "teamBattle.reactionDisappointed" },
  { key: "genius", data: genius, labelKey: "teamBattle.reactionGenius" },
];

const BY_KEY = new Map(REACTIONS.map((r) => [r.key, r]));

/**
 * The reaction a stored value names, or undefined.
 *
 * Undefined is the old rows: before this the column held the URL of an icon
 * from the library, and those are still in the table and still arriving from
 * devices on the previous build. The caller falls back to showing the URL.
 */
export function reactionFor(value: string): Reaction | undefined {
  return BY_KEY.get(value);
}
