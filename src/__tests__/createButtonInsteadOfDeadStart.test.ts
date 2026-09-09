/**
 * A host alone in a finished room gets a way out, not a dead button.
 *
 * The room is built — it has a category, a name, a face — and the only thing
 * missing is another person. Start could not fire, so the screen's one big
 * call to action sat greyed in front of the person it was for, and the only
 * way on was the back arrow, which reads as abandoning what you just made.
 *
 * It says "Create" in that state and goes to the rooms hub, on the tab the
 * room is actually listed under: the Public tab for a published room, the
 * Private tab otherwise — a public room shown on the Private tab looks like
 * it never published (owner: "instead start game disabled show create button
 * and after clicking it user goes on online game page on public rooms and
 * sees their room as first with little stroke animation we have, if room is
 * private goes on private tab").
 *
 * Both lists already lead with the room just made; the ring that says WHICH
 * one was only on the public card, so the private card wears it now too —
 * same condition, same three seconds, one shared clock.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { FRESH_RING_MS, JUST_CREATED_MS, isRoomStampFresh } from "@/hooks/usePublicRooms";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const mine = read("src/components/team/MyRoomsSection.tsx");
const publicSection = read("src/components/team/PublicRoomsSection.tsx");

describe("the state the button changes for", () => {
  it("is named once and read by both the button and its caption", () => {
    expect(lobby).toMatch(
      /const awaitingPlayers = !needsCategorySelection && !enoughPlayers && !isStarting;/,
    );
    expect(lobby).toMatch(/caption: awaitingPlayers/);
  });

  it("says Create, and only there — choosing a category is still its own label", () => {
    expect(lobby).toMatch(/awaitingPlayers\s*\n\s*\? t\("extra\.createBtn"\)\s*\n\s*: t\("lobby\.uStartGame"\)/);
    expect(lobby).toMatch(/needsCategorySelection\s*\n\s*\? t\("extra\.rlChooseCategory"\)/);
  });

  it("and is no longer a reason to disable the button", () => {
    expect(lobby).toMatch(/disabled: !canStartGame \|\| isStarting \|\| loading,/);
    // The old fourth clause is gone from the disabled test entirely.
    expect(lobby).not.toMatch(/\|\| \(!needsCategorySelection && !enoughPlayers\)/);
  });

  it("but a lone host still cannot actually start — the runtime guard stands", () => {
    // The button is not the only door: the category picker can start a round
    // on its own, and the last guest can leave between the tap and the write.
    expect(lobby).toMatch(
      /if \(!enoughPlayersRef\.current\) \{\s*\n\s*toast\.error\(t\("extra\.rlNeedsSecondPlayer"\)\);/,
    );
  });
});

describe("where Create goes", () => {
  it("to the hub, on the tab the room is listed under", () => {
    expect(lobby).toMatch(
      /navigate\(`\/team\?tab=\$\{currentRoom\?\.is_public \? "public" : "private"\}`, \{ replace: true \}\);/,
    );
  });

  it("leaving the room the way the back arrow does, so nothing is half-exited", () => {
    expect(lobby).toMatch(/const handleDoneCreating = \(\) => \{\s*\n\s*exitRoom\(\);/);
    expect(lobby).toMatch(/onPress: awaitingPlayers \? handleDoneCreating : handleStartOrPick,/);
  });

  it("and the hub reads that tab off the URL, which is why a param is enough", () => {
    const hub = read("src/pages/TeamV2.tsx");
    expect(hub).toMatch(/normalizeTab\(searchParams\.get\("tab"\)\) \?\? "public"/);
  });
});

describe("the ring on the card, now on both tabs", () => {
  it("the private card arms it for a room of mine nobody has joined", () => {
    expect(mine).toMatch(
      /const freshlyMine =\s*\n\s*room\.is_host && room\.participants\.length <= 1 && isRoomStampFresh\(room\.last_activity_at \?\? room\.created_at\);/,
    );
    expect(mine).toMatch(/className="fresh-room-ring pointer-events-none absolute inset-0 z-30 rounded-2xl"/);
  });

  it("and takes it down after the same three seconds the public one does", () => {
    for (const src of [mine, publicSection]) {
      expect(src).toMatch(/setTimeout\(\(\) => setRingUp\(false\), FRESH_RING_MS\)/);
      expect(src).toMatch(/const \[ringUp, setRingUp\] = useState\(freshlyMine\);/);
    }
    // One clock, imported by both, rather than a copy per tab.
    expect(mine).toMatch(/import \{ FRESH_RING_MS, isRoomStampFresh \} from "@\/hooks\/usePublicRooms";/);
    expect(publicSection).toMatch(/FRESH_RING_MS,/);
    expect(publicSection).not.toMatch(/const FRESH_RING_MS = /);
  });

  it("over a card that can hold it — clipped, and a positioning parent", () => {
    // Without `relative` the overlay would anchor to whatever ancestor is
    // positioned and stop tracing the card's own edge.
    expect(mine).toMatch(/className=\{`relative aspect-\[1\.45\/1\]/);
  });

  it("fades out and unmounts rather than turning invisibly forever", () => {
    expect(mine).toMatch(/<AnimatePresence>\s*\n\s*\{ringUp && \(/);
    expect(mine).toMatch(/exit=\{\{ opacity: 0 \}\}/);
  });
});

describe("the freshness clock both tabs now share", () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it("is the ten-minute window, not a second opinion about it", () => {
    expect(isRoomStampFresh(ago(60_000))).toBe(true);
    expect(isRoomStampFresh(ago(JUST_CREATED_MS + 5_000))).toBe(false);
  });

  it("reads nothing at all as not fresh, rather than as brand new", () => {
    expect(isRoomStampFresh(null)).toBe(false);
    expect(isRoomStampFresh(undefined)).toBe(false);
    expect(isRoomStampFresh("not a date")).toBe(false);
  });

  it("is absolute, so a fast device clock cannot pin a room forever", () => {
    expect(isRoomStampFresh(new Date(Date.now() + 3 * 3600_000).toISOString())).toBe(false);
  });

  it("and the ring is much shorter than the place at the top of the list", () => {
    expect(FRESH_RING_MS).toBe(3000);
    expect(FRESH_RING_MS).toBeLessThan(JUST_CREATED_MS);
  });
});
