/**
 * A removed seat leaves every screen.
 *
 * The participants channel listened with a filter on room_id, and a
 * Postgres DELETE event carries only the old row's primary key — a
 * filtered DELETE needs REPLICA IDENTITY FULL, which room_participants
 * does not have. So the host removed a player, the server deleted the
 * seat, and the row stayed on every device's list; the removed player's
 * own device never noticed either (owner: "i removed player and player
 * was not deleted"). A second, unfiltered DELETE listener keeps the
 * events whose id is a seat this room knows.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ctx = readFileSync(join(process.cwd(), "src/contexts/MultiplayerContextV2.tsx"), "utf8");

describe("the participants channel", () => {
  it("hears DELETE unfiltered and keeps the seats it knows", () => {
    expect(ctx).toMatch(/\{ event: "DELETE", schema: "public", table: "room_participants" \},/);
    expect(ctx).toMatch(/const gone = \(payload\.old as \{ id\?: string \} \| null\)\?\.id;\s*\n\s*if \(!gone \|\| !seatIdsRef\.current\.has\(gone\)\) return;\s*\n\s*void onParticipantChange\(/);
    expect(ctx).toMatch(/seatIdsRef\.current = new Set\(participants\.map\(\(p\) => p\.id\)\);/);
  });

  it("runs the same handler for both listeners, so a leaving seat re-checks completion", () => {
    expect(ctx).toMatch(/const onParticipantChange = async \(payload: \{/);
    expect(ctx).toMatch(/\(payload\) => void onParticipantChange\(payload as unknown as Parameters<typeof onParticipantChange>\[0\]\),/);
    expect(ctx).toMatch(/const seatDroppedOut =\s*\n\s*payload\.eventType === "DELETE" \|\|/);
  });
});
