/**
 * The public room card says when it was made, and keeps its controls together.
 *
 * The card's top row named the host and, right after the name, showed a
 * flag — the report button — which read as part of the host's pill rather
 * than as a control of the card. And the card never said how old the room
 * was, though the private card beside it (same tab bar, same design) has
 * carried its age since the badge replaced the word "waiting".
 *
 * Owner: "show date when room was created - next to the host and show
 * report icon between players and leave room icon". So: the age, in the
 * private card's own words ("20 წუთის წინ", "გუშინ"), in a pill after the
 * host; and the flag on the right, with the seats count and the way out,
 * between the two.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const pub = read("src/components/team/PublicRoomsSection.tsx");

const header = pub.slice(
  pub.indexOf("{/* Top: who runs it, who already joined, and how full it is */}"),
  pub.indexOf("{/* Middle: the room, and the round it plays first */}"),
);

describe("the age, next to the host", () => {
  it("is New for the room's first hour, then nothing — the running age was one pill too many", () => {
    // It said "20 წუთის წინ" / "გუშინ" at every step at first; the owner
    // asked for New for an hour and no time label after that.
    expect(pub).toMatch(/import \{ useRoomIsNew \} from "@\/hooks\/useRoomAge";/);
    expect(pub).toMatch(/const isNew = useRoomIsNew\(room\.created_at\);/);
    expect(pub).not.toMatch(/useRoomAge\(/);
  });

  it("leads the top row now that the host label moved down to the seats, and stays on one line", () => {
    // The host pill left the top row (hostLabelLeadsTheFaces.test); New is
    // the first thing on it.
    expect(header).not.toMatch(/openProfile\(room\.host_user_id\)/);
    const age = header.indexOf("{isNew && (");
    expect(age).toBeGreaterThan(-1);
    expect(header).toMatch(
      /\{isNew && \(\s*\n\s*<span className=\{`shrink-0 whitespace-nowrap rounded-full px-2\.5 py-1 text-xs font-bold \$\{ink\.pill\} \$\{ink\.text\}`\}>\s*\n\s*\{t\("extra\.roomStatusNew"\)\}/,
    );
  });
});

describe("the report flag, between the seats and the way out", () => {
  it("is in the right-hand group, after the seats count and before the leave button", () => {
    const seats = header.indexOf("<Users className={`w-3.5 h-3.5 ${ink.text}`} />");
    const report = header.indexOf("<ContentReportButton");
    const leave = header.indexOf("{inside && (");
    expect(seats).toBeGreaterThan(-1);
    expect(report).toBeGreaterThan(seats);
    expect(leave).toBeGreaterThan(report);
  });

  it("is no longer beside the host's name", () => {
    const leftGroupEnd = header.indexOf("{/* Seats.");
    expect(header.slice(0, leftGroupEnd)).not.toMatch(/ContentReportButton/);
  });

  it("wears the same pill as the leave button beside it", () => {
    expect(header).toMatch(
      /<ContentReportButton\s*\n\s*contentType="room"\s*\n\s*contentId=\{room\.id\}\s*\n\s*authorUserId=\{room\.host_user_id\}\s*\n\s*roomId=\{room\.id\}\s*\n\s*className=\{`h-8 w-8 shrink-0 hover:bg-white\/80 \$\{ink\.pill\} \$\{ink\.text\}`\}/,
    );
  });
});
