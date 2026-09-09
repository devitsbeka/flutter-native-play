/**
 * The face a MyTrivia Party wears when it has no picture of its own.
 *
 * A party's cover is optional: you can upload one, you can have one
 * generated, and most people do neither. Those parties fell back to a random
 * gradient — a coloured rectangle with the title over it, and nothing on it
 * saying what kind of thing it was. Four party icons stand in instead, on
 * white (owner: "if my trivia party has no image uploaded or generated we
 * should use these icons on them on white background, randomly, use all four
 * and if user has 5 and more repeat also randomly").
 *
 * "Use all four" is a property of the LIST, not of any one party — a hash of
 * the id alone would happily give three of your four parties the same
 * balloon. So the icons are dealt: four in a bag, drawn without replacement,
 * refilled when empty. Any four consecutive parties therefore carry all four
 * icons, and the fifth onward starts a fresh pass — repeating, and still in
 * an order nobody chose.
 *
 * What decides the draw is a hash of the party's own id rather than
 * `Math.random`, so a card keeps its face across re-renders, reloads and
 * devices; and the deal runs oldest-first, so making a new party appends to
 * the end of the deal instead of shifting everyone else's icon along.
 */

/**
 * The four, in the order the design lists them (Figma 1110:5285). They are
 * slugs in the shipped icon catalogue — the same library every category icon
 * comes from, so there is nothing new to import.
 */
export const PARTY_COVER_ICON_SLUGS = [
  "confetti-balloon",
  "balloon-arch",
  "balloon-dog",
  "confetti-gun",
] as const;

export type PartyCoverIconSlug = (typeof PARTY_COVER_ICON_SLUGS)[number];

export interface PartyLike {
  id: string;
  created_at?: string | null;
  cover_image?: string | null;
}

/** Stable across clients, unlike `String.hashCode`-by-hand variants. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/** Does this party already have a picture, uploaded or generated? */
export function partyHasCover(party: PartyLike | null | undefined): boolean {
  return typeof party?.cover_image === "string" && party.cover_image.trim() !== "";
}

/**
 * Deal a cover icon to every party that has no picture of its own.
 *
 * Parties that DO have a cover are left out of the deal entirely rather than
 * silently consuming a slot: with six parties, two of them covered, the four
 * bare ones should still show all four icons.
 *
 * @param parties every party the player has — not the filtered or searched
 *   view of them, or narrowing the list would redraw the faces.
 */
export function partyCoverIcons(
  parties: readonly (PartyLike | null | undefined)[],
): Map<string, PartyCoverIconSlug> {
  const seen = new Set<string>();
  const order = parties
    .filter((p): p is PartyLike => {
      if (!p?.id || partyHasCover(p) || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .sort((a, b) => {
      // Oldest first: a party made today lands at the end of the deal and
      // leaves every existing card exactly as it was.
      const at = Date.parse(a.created_at ?? "") || 0;
      const bt = Date.parse(b.created_at ?? "") || 0;
      if (at !== bt) return at - bt;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  const dealt = new Map<string, PartyCoverIconSlug>();
  let bag: PartyCoverIconSlug[] = [];
  for (const party of order) {
    if (bag.length === 0) bag = [...PARTY_COVER_ICON_SLUGS];
    const [picked] = bag.splice(hashString(party.id) % bag.length, 1);
    dealt.set(party.id, picked);
  }
  return dealt;
}

