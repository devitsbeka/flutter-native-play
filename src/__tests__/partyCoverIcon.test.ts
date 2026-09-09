/**
 * A party with no picture is not a coloured rectangle.
 *
 * The cover is optional and most parties never get one, so most party cards
 * were a random gradient with the title over it — nothing on them saying what
 * kind of thing they were, and every one of them looking like every other.
 * Four party icons stand in instead, on white (owner: "if my trivia party has
 * no image uploaded or generated we should use these icons on them on white
 * background, randomly, use all four and if user has 5 and more repeat also
 * randomly"; Figma 1110:5285).
 *
 * "Use all four" cannot be answered by a hash of the id — that would happily
 * give three of your four parties the same balloon — so the icons are dealt
 * from a bag, without replacement, refilled when it empties. The two things
 * that would make the deal feel broken are what most of this file is about:
 * a card changing its face when you make ANOTHER party, and a card changing
 * its face when you type in the search box.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PARTY_COVER_ICON_SLUGS,
  partyCoverIcons,
  partyHasCover,
} from "@/utils/partyCoverIcon";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const tab = read("src/components/social/MyTriviaTab.tsx");

/** A party, oldest at day 1. */
const party = (id: string, day: number, cover?: string) => ({
  id,
  created_at: `2026-01-${String(day).padStart(2, "0")}T10:00:00Z`,
  cover_image: cover ?? null,
});

const dealt = (parties: ReturnType<typeof party>[]) => [...partyCoverIcons(parties).values()];

describe("the four", () => {
  it("are the ones the design names, and they are real icons", () => {
    expect([...PARTY_COVER_ICON_SLUGS]).toEqual([
      "confetti-balloon",
      "balloon-arch",
      "balloon-dog",
      "confetti-gun",
    ]);

    // Slugs, not files to import: DynamicIcon serves `<slug>.png` straight
    // out of the icon library. A typo here is four blank covers, so the
    // shipped catalogue is asked whether it carries them.
    const catalogue = JSON.parse(read("public/data/icon-index-slim.json")) as {
      items: { slug: string; file_name: string }[];
    };
    for (const slug of PARTY_COVER_ICON_SLUGS) {
      const entry = catalogue.items.find((i) => i.slug === slug);
      expect(entry, slug).toBeTruthy();
      expect(entry!.file_name, slug).toBe(`${slug}.png`);
    }
  });
});

describe("which parties are dealt into", () => {
  it("only the ones with no picture of their own", () => {
    expect(partyHasCover({ id: "a", cover_image: "https://x/y.png" })).toBe(true);
    expect(partyHasCover({ id: "a", cover_image: null })).toBe(false);
    expect(partyHasCover({ id: "a", cover_image: "  " })).toBe(false);
    expect(partyHasCover({ id: "a" })).toBe(false);
    expect(partyHasCover(null)).toBe(false);
  });

  it("and a party that HAS a picture gets nothing and takes up no slot", () => {
    // Six parties, two of them covered: the four bare ones must still come
    // out with all four icons between them. Letting a covered party quietly
    // eat a slot is how you get two balloons and no dog.
    const parties = [
      party("a", 1),
      party("b", 2, "https://x/b.png"),
      party("c", 3),
      party("d", 4),
      party("e", 5, "https://x/e.png"),
      party("f", 6),
    ];
    const icons = partyCoverIcons(parties);
    expect(icons.has("b")).toBe(false);
    expect(icons.has("e")).toBe(false);
    expect(new Set(icons.values()).size).toBe(4);
  });
});

describe("all four, then all four again", () => {
  it("four parties wear four different icons", () => {
    const icons = dealt([party("a", 1), party("b", 2), party("c", 3), party("d", 4)]);
    expect(new Set(icons)).toEqual(new Set(PARTY_COVER_ICON_SLUGS));
  });

  it("whichever four they are", () => {
    // Not a lucky set of ids: any four must come out covering all four.
    for (const ids of [
      ["1", "2", "3", "4"],
      ["zz", "yy", "xx", "ww"],
      ["b3f1c0d2", "0a9e", "party-one", "ცხრა"],
      ["aaa", "aab", "aac", "aad"],
    ]) {
      const icons = dealt(ids.map((id, i) => party(id, i + 1)));
      expect(new Set(icons), ids.join()).toEqual(new Set(PARTY_COVER_ICON_SLUGS));
    }
  });

  it("and the fifth onward starts a fresh pass — repeating, not stalling", () => {
    // "if user has 5 and more repeat also randomly".
    const eight = dealt([...Array(8)].map((_, i) => party(`p${i}`, i + 1)));
    expect(eight).toHaveLength(8);
    expect(new Set(eight.slice(0, 4))).toEqual(new Set(PARTY_COVER_ICON_SLUGS));
    expect(new Set(eight.slice(4))).toEqual(new Set(PARTY_COVER_ICON_SLUGS));
  });

  it("and fewer than four is simply fewer, all different", () => {
    const three = dealt([party("a", 1), party("b", 2), party("c", 3)]);
    expect(new Set(three).size).toBe(3);
    expect(partyCoverIcons([]).size).toBe(0);
  });
});

describe("a face a card keeps", () => {
  it("the same parties deal the same way every time", () => {
    // Math.random() here would mean a new picture on every re-render.
    const parties = [party("a", 1), party("b", 2), party("c", 3), party("d", 4), party("e", 5)];
    const once = partyCoverIcons(parties);
    const again = partyCoverIcons([...parties].reverse());
    for (const [id, icon] of once) expect(again.get(id), id).toBe(icon);
  });

  it("and making a NEW party leaves every existing card alone", () => {
    // The deal runs oldest-first for exactly this: newest-first would put a
    // brand new party at the head of the bag and shuffle everyone along.
    const existing = [party("a", 1), party("b", 2), party("c", 3)];
    const before = partyCoverIcons(existing);
    const after = partyCoverIcons([...existing, party("new", 9)]);
    for (const [id, icon] of before) expect(after.get(id), id).toBe(icon);
    expect(after.get("new")).toBeTruthy();
  });

  it("even across the fifth, where the bag is refilled", () => {
    const four = [party("a", 1), party("b", 2), party("c", 3), party("d", 4)];
    const before = partyCoverIcons(four);
    const after = partyCoverIcons([...four, party("e", 5), party("f", 6)]);
    for (const [id, icon] of before) expect(after.get(id), id).toBe(icon);
  });

  it("and a duplicated row does not consume the bag twice", () => {
    const icons = partyCoverIcons([party("a", 1), party("a", 1), party("b", 2)]);
    expect(icons.size).toBe(2);
  });
});

describe("what the card does with it", () => {
  it("the deal runs over every party, not the filtered view", () => {
    // Over `myPosts` — the unfiltered query. Dealing over `unifiedFeed`
    // would redraw the surviving cards every time you typed in the search
    // box or switched the filter.
    expect(tab).toMatch(
      /const partyIcons = partyCoverIcons\(\s*\n\s*\(myPosts \?\? \[\]\)\.filter\(post => post\.subject === "personal"\),\s*\n\s*\);/,
    );
    expect(tab).toMatch(/coverIcon=\{partyIcons\.get\(item\.data\.id\)\}/);
  });

  it("and paints it on the gradient every trivia is dealt, not white", () => {
    // A flat white banner was tried first and left the icon with nothing to
    // sit on (owner: "we need background for My Trivia Party cards behind
    // the icon, make sure we use beautiful gradient and icons will be
    // visible on them"). Every post, parties included, is already dealt a
    // gradient at creation (TriviaCreationContext) — the fallback just has
    // to use it, the way the ordinary trivia card beside it always has.
    expect(tab).toMatch(/<DynamicIcon\s*\n\s*slug=\{coverIcon \?\? PARTY_COVER_ICON_SLUGS\[0\]\}/);
    expect(tab).not.toMatch(/bg-white px-4/);
    // The title moved down beside the icon in the meta row (owner's ask),
    // so nothing is drawn over the party banner at all — not over the icon
    // and not over a cover photo.
    expect(tab).not.toMatch(/text-base font-bold text-slate-900 text-center/);
    const party = tab.slice(
      tab.indexOf("function PersonalTriviaCard"),
      tab.indexOf("function StandaloneQuizCard"),
    );
    expect(party).toMatch(/const gradientProps = getGradientProps\(post\.cover_gradient\);/);
    expect(party).toMatch(
      /<div className=\{`absolute inset-0 \$\{gradientProps\.className\}`\} style=\{gradientProps\.style\} \/>/,
    );
    expect(party).not.toMatch(/<h4/);
  });

  it("and the icon keeps its own shadow, now that it sits on colour instead of white", () => {
    // shadow=false suited a white banner, where DynamicIcon's default
    // drop-shadow read as a grey box sitting on it; on a gradient the shadow
    // is what separates the icon from a background that is no longer plain.
    const party = tab.slice(
      tab.indexOf("function PersonalTriviaCard"),
      tab.indexOf("function StandaloneQuizCard"),
    );
    expect(party).not.toMatch(/shadow=\{false\}/);
  });

  it("and the two chips over it are one dark treatment again, not a per-case pair", () => {
    // The grey-on-white problem this pair once solved doesn't exist once the
    // banner is always a photo or a gradient — both dark enough for the same
    // bg-black/40 every other card's chips already use.
    const party = tab.slice(
      tab.indexOf("function PersonalTriviaCard"),
      tab.indexOf("function StandaloneQuizCard"),
    );
    expect(party).not.toMatch(/slate-900/);
    expect(party).toMatch(
      /bg-black\/40 backdrop-blur-sm rounded-full h-8 px-3 text-xs text-white flex items-center gap-1\.5/,
    );
  });

  it("and a cover that IS there is untouched", () => {
    const card = tab.slice(
      tab.indexOf("function PersonalTriviaCard"),
      tab.indexOf("function StandaloneQuizCard"),
    );
    expect(card).toMatch(/<img src=\{post\.cover_image\}/);
  });
});

describe("the party's Play button matches the rooms list, not a colour of its own", () => {
  it("wears white, the same fill Join and Enter wear on a room card", () => {
    // Purple was tried first, to read as a stronger action than
    // ChunkyButton's generic outline had; the owner's next word on it was to
    // match the rooms list instead of adding a third colour beside it
    // ("play buttons other color... just like we have on join button on
    // public rooms").
    const card = tab.slice(
      tab.indexOf("function PersonalTriviaCard"),
      tab.indexOf("function StandaloneQuizCard"),
    );
    expect(card).toMatch(/<RoomCardPlayButton\s*\n\s*tone="white"/);
    expect(card).not.toMatch(/tone="purple"/);
  });

  it("and that IS the Join/Enter colour on the public rooms list", () => {
    const publicRooms = read("src/components/team/PublicRoomsSection.tsx");
    // A ready-to-start room goes mint and says Play; everything else — Join,
    // Enter, waiting on the host — is the white this party button now
    // shares.
    expect(publicRooms).toMatch(/tone=\{opts\.tone \?\? \(invited \|\| ready \? "mint" : "white"\)\}/);
  });
});
