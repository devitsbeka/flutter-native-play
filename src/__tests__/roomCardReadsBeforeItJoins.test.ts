/**
 * A room card is read before it is committed to.
 *
 * The card was one target: tapping it anywhere joined the room, or asked its
 * host to. So the list was a bad place to choose from — the card names one
 * round, and the only way to learn what the others were, or what a seat
 * cost, was to commit to the room and look from inside it.
 *
 * The tap splits (owner: "show +X if there are more rounds in the room
 * selected and clicking on card would show categories picked in this room,
 * only button click opens room, sends request to a host etc.. click on card
 * shows categories list and cost for participating"):
 *
 *   the BUTTON   joins, enters, plays — one deliberate target with a word on
 *   the CARD     opens the rounds in order, the questions, and the stake
 *
 * And the count of who is already in it moved to the left of both cards,
 * where the eye lands first (owner: "show players count on left side of the
 * cards") — it is a fact about the room, not something to press, and it was
 * sharing a row with two things that are.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const publicRooms = read("src/components/team/PublicRoomsSection.tsx");
const myRooms = read("src/components/team/MyRoomsSection.tsx");
const sheet = read("src/components/team/RoomPreviewSheet.tsx");
const migration = read("supabase/migrations/20261102150000_public_rooms_carry_their_rounds.sql");

describe("the tap that reads", () => {
  it("the public card opens the preview instead of knocking", () => {
    // ...handing the sheet the card's own button along (roomPreviewCarriesTheCardsButton.test.ts).
    expect(publicRooms).toMatch(/onClick=\{\(\) => \(lounge \? \(inside \? enter\(\) : onAsk\(room\)\) : onPreview\(room, playButton\)\)\}/);
    expect(publicRooms).not.toMatch(/onClick=\{\(\) => \(inside \? enter\(\) : onAsk\(room\)\)\}/);
  });

  it("and the private cards do the same", () => {
    // The grid card hands its button along; the rail card has none to hand.
    const taps = myRooms.match(/if \(roomKind\(room\) === "classic"\) onPreview\((action \? playButton : undefined)?\);\s*\n\s*else onJoin\(\);/g) ?? [];
    expect(taps, "both the grid card and the rail card").toHaveLength(2);
  });

  it("but a lounge keeps the tap it had — its stake is not this one", () => {
    // King and Team Battle carry their own economies; the sheet quotes the
    // classic room stake and would describe them wrongly.
    expect(publicRooms).toMatch(/lounge \? \(inside \? enter\(\) : onAsk\(room\)\)/);
    expect(myRooms).toMatch(/roomKind\(room\) === "classic"/);
  });
});

describe("the tap that acts", () => {
  it("the public card's button still joins, and still stops the card's tap", () => {
    // ...and then does whatever the place it was drawn in asked for after
    // the tap — the sheet asks to be closed; the card asks nothing.
    expect(publicRooms).toMatch(
      /onClick=\{\(e\) => \{\s*\n\s*e\.stopPropagation\(\);\s*\n\s*if \(inside\) enter\(\);\s*\n\s*else onAsk\(room\);\s*\n\s*opts\.then\?\.\(\);\s*\n\s*\}\}/,
    );
  });

  it("and the private card's button still opens the room", () => {
    expect(myRooms).toMatch(/e\.stopPropagation\(\);\s*\n\s*if \(!isJoining\) onJoin\(\);/);
  });
});

describe("what the card says without being opened", () => {
  it("how many are in it, on the left of both", () => {
    // Public: the seats pill leads the top row's left group.
    expect(publicRooms).toMatch(
      /<div className=\{`flex shrink-0 items-center gap-1\.5 rounded-full px-2\.5 py-1 \$\{ink\.pill\}`\}>\s*\n\s*<Users/,
    );
    // Private: the same pill, first in the left group, before "New".
    expect(myRooms).toMatch(
      /\{\/\* Seats first, on the left\. \*\/\}\s*\n\s*<div className="flex flex-shrink-0 items-center gap-1\.5 rounded-full bg-white\/60 backdrop-blur-sm px-2\.5 py-1">/,
    );
  });

  it("and how much more there is, as a +N beside the first round", () => {
    for (const [name, src] of [["public", publicRooms], ["private", myRooms]] as const) {
      expect(src, name).toMatch(/const extraRounds = Math\.max\(0, \(room\.rounds\?\.length \?\? 0\) - 1\);/);
      expect(src, name).toMatch(/\{extraRounds > 0 && \(/);
      expect(src, name).toMatch(/\+\{extraRounds\}/);
    }
  });
});

describe("what opening it says", () => {
  it("every round, numbered, in play order", () => {
    expect(sheet).toMatch(/\{shown\.map\(\(round, i\) => \(/);
    expect(sheet).toMatch(/\{i \+ 1\}/);
  });

  it("the questions per round and the stake a seat pays", () => {
    expect(sheet).toMatch(/t\("lobby\.uQuestionsPerRound"\)/);
    expect(sheet).toMatch(/const stake = REWARDS\.GAME_STAKE;/);
    expect(sheet).toMatch(/t\("lobby\.summaryStake"\)/);
  });

  it("and the pot, only where there is one", () => {
    // Under two players settle_room_round settles nothing: that is practice,
    // and quoting a pot for it would be a promise the database will not keep.
    expect(sheet).toMatch(/const pot = players >= 2 \? players \* stake : null;/);
    expect(sheet).toMatch(/\{pot !== null && \(/);
  });

  it("with nothing of its own that joins — the way in is the card's own button, handed to it", () => {
    // roomPreviewCarriesTheCardsButton.test.ts: the card builds the button,
    // the sheet only draws it beside Close.
    expect(sheet).not.toMatch(/onJoin|onAsk|navigate\(/);
    expect(sheet).toMatch(/action\?: ReactNode;/);
  });

  it("and a room whose host has queued nothing plays a mixed round, as its card says", () => {
    // The card's chip reads "Mixed" for such a room; the sheet said "the
    // host has not picked a round yet" under Rounds · 0 (owner: "show
    // mixed category instead"). One row now: the mystery box, "Mixed".
    expect(sheet).toMatch(/export const MIXED_ROUND: PreviewRound = \{ name: null, icon_slug: null, source_type: "mixed" \};/);
    expect(sheet).toMatch(/const shown = rounds\.length > 0 \? rounds : \[MIXED_ROUND\];/);
    expect(sheet).toMatch(/\{t\("lobby\.summaryRounds"\)\} · \{shown\.length\}/);
    expect(sheet).toMatch(/\{shown\.map\(\(round, i\) => \(/);
    expect(sheet).toMatch(/\{round\.name \?\? t\("extra\.cpMixedCategory"\)\}/);
    expect(sheet).not.toMatch(/roomPreviewNoRounds/);
  });

  it("and a mixed round wears the question mark, not an empty tile", () => {
    // A queued mixed round is a "category" named "Mixed" in the picker's
    // language with no slug, so the tile drew DynamicIcon's nothing
    // (owner: "as a mixed category icon use this question mark icon, it
    // is empty now"). The name is what identifies it; the icon is the
    // lobby's own question-mark chip. A random round keeps the mystery box.
    expect(sheet).toMatch(/import questionIcon from "@\/assets\/lobby\/chip-question\.webp";/);
    expect(sheet).toMatch(/return round\.source_type === "mixed" \|\| undecidedRoundKind\(null, round\.name\) === "mixed";/);
    expect(sheet).toMatch(/\{isMixedRound\(round\) \? \(\s*\n\s*<img src=\{questionIcon\} alt="" className="h-7 w-7 object-contain" \/>/);
    expect(sheet).toMatch(/<DynamicIcon slug=\{roundIconSlug\(\{ \.\.\.round, category_name: round\.name \}\)\} size=\{22\} shadow=\{false\} \/>/);
  });
});

describe("where the rounds come from", () => {
  it("the public tab is answered by the RPC, because the table is shut to it", () => {
    // room_category_queue's only SELECT policy is "Participants can view
    // queue" — a stranger reading the Public tab is not one.
    expect(migration).toMatch(/SECURITY DEFINER/);
    expect(migration).toMatch(/FROM room_category_queue rq\s*\n\s*WHERE rq\.room_id = r\.id/);
    expect(migration).toMatch(/rounds jsonb,/);
    expect(migration).toMatch(/total_questions integer/);
    // The signature changed, so the old function has to go first.
    expect(migration).toMatch(/DROP FUNCTION IF EXISTS public\.public_rooms\(integer\);/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.public_rooms\(integer\) FROM PUBLIC, anon;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.public_rooms\(integer\) TO authenticated;/);
  });

  it("the private tab reads the table directly, which a participant may", () => {
    const hook = read("src/hooks/useMyRooms.ts");
    expect(hook).toMatch(/\.from\("room_category_queue"\)/);
    expect(hook).toMatch(/\.order\("position"\)/);
  });

  it("and a client ahead of the migration reads the one round the old RPC names, not a crash", () => {
    // Migrations land by hand after the merge (CLAUDE.md 4a), so for a while
    // the app knows this column and the database does not. The old RPC
    // still names the first round (first_category_name), and a sheet that
    // said "nothing picked" under a card saying "Random" was wrong (owner:
    // "why modal shows host didn't pick anything").
    const hook = read("src/hooks/usePublicRooms.ts");
    expect(hook).toMatch(/rounds: Array\.isArray\(row\.rounds\)\s*\n\s*\? \(row\.rounds as RoomRound\[\]\)\s*\n\s*: row\.first_category_name\s*\n\s*\? \[\{ name: row\.first_category_name as string, icon_slug: \(row\.first_category_icon as string \| null\) \?\? null, source_type: "category" \}\]\s*\n\s*: \[\],/);
  });

  it("proved against a real Postgres, from a stranger's seat", () => {
    const suite = read("supabase/tests/17-public-room-rounds.sql");
    expect(suite).toContain("a stranger is told how many rounds a public room plays");
    expect(suite).toContain("a room with no queue plays its own category as round one");
    expect(suite).toContain("a room with nothing picked yet returns an empty list, never null");
    expect(read(".github/workflows/pr-checks.yml")).toContain("supabase/tests/17-public-room-rounds.sql");
  });
});

describe("the sheet is written in every language", () => {
  it("the eyebrow, all seven; the empty-queue line went with the empty state", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, `${lang}.roomPreviewEyebrow`).toMatch(/\n\s+roomPreviewEyebrow: "[^"]+",/);
      expect(locale, `${lang}.roomPreviewNoRounds`).not.toMatch(/roomPreviewNoRounds/);
    }
  });
});
