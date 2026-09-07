/**
 * Inviting somebody is not them arriving, and the report sheet speaks Georgian.
 *
 * THE ARRIVAL NOTE. Sending an invitation INSERTS a participant row with
 * status "invited". The lobby diffed raw row ids to find arrivals, so that
 * insert read as a new player: it flashed "joined" beside the name, played
 * the join sound and toasted "a new player joined" — for somebody who had not
 * answered yet. Half a second later the row settled into its "invited" pill
 * and contradicted all three.
 *
 * The note is gone entirely (owner's ask): an invited seat is drawn in grey
 * and turns full colour on arrival, so the word was the third time of asking.
 * The sound and the toast stay, but they now key off SEATED rows, so they
 * fire when the invitation is accepted rather than when it is sent.
 *
 * THE PLACEHOLDER. "Add details (optional)" was a bare English string in a
 * sheet whose every other line is translated.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const room = read("src/components/team/RoomLobbyV2.tsx");
const universal = read("src/components/lobby/UniversalLobby.tsx");
const sheet = read("src/components/social/ReportBlockSheet.tsx");

describe("an invitation is not an arrival", () => {
  it("arrivals are diffed on seated rows, not on every row", () => {
    expect(room).toMatch(
      /const seatedIds = participants\s*\n\s*\.filter\(\(p\) => \(p\.status as string\) !== "invited"\)\s*\n\s*\.map\(\(p\) => p\.user_id\);/,
    );
    expect(room).toMatch(/const arrived = seatedIds\.filter\(\(id\) => !prevIds\.includes\(id\)\);/);
    expect(room).not.toMatch(/const newParticipants = currentIds\.filter/);
  });

  it("and the sound and the toast follow that, not the insert", () => {
    expect(room).toMatch(/if \(arrived\.length > 0 && arrived\[0\] !== user\?\.id\) \{\s*\n\s*playSound\("room-join"\);/);
  });

  it("the remembered snapshot is seated too, or an accepted invite never lands", () => {
    // Diffing seated ids against a snapshot of ALL ids would mean the person
    // was already "known" from the moment they were invited, so accepting
    // would pass unnoticed.
    expect(room).toMatch(/prevParticipantsRef\.current = seatedIds;/);
    expect(room).not.toMatch(/prevParticipantsRef\.current = currentIds;/);
  });

  it("departures still read from every row, since an invitee can be withdrawn", () => {
    expect(room).toMatch(/const gone = prevIds\.filter\(\(id\) => !currentIds\.includes\(id\) && id !== user\?\.id\);/);
  });
});

describe("the joined note is gone from both ends", () => {
  it("the lobby's note type carries only a departure", () => {
    expect(universal).toMatch(/note\?: "left";/);
    expect(universal).not.toMatch(/joinedLabel/);
    expect(universal).not.toMatch(/note === "joined"/);
  });

  it("and the room stops setting it or labelling it", () => {
    expect(room).toMatch(/useState<Map<string, "left">>/);
    expect(room).not.toMatch(/next\.set\(id, "joined"\)/);
    expect(room).not.toMatch(/uJoinedNote/);
  });

  it("the invited pill stays — that is the one word this row needs", () => {
    expect(room).toMatch(/pending: \(p\.status as string\) === "invited",/);
  });
});

describe("the report sheet is translated", () => {
  it("the details box asks in the reader's language", () => {
    expect(sheet).toMatch(/placeholder=\{t\("moderation\.reportDetailsPlaceholder"\)\}/);
    expect(sheet).not.toMatch(/placeholder="Add details \(optional\)"/);
  });

  it("in all seven, beside the question it sits under", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).toMatch(/\n\s+reportDetailsPlaceholder: "[^"]+",/);
      expect(locale, lang).toMatch(/\n\s+reportReasonTitle: "[^"]+",/);
    }
    expect(read("src/locales/ka.ts")).toMatch(/reportDetailsPlaceholder: "დაამატე დეტალები \(არასავალდებულო\)",/);
  });
});
