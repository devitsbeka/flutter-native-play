/**
 * The lobby's Joining row — Open / Ask me — is the host's alone.
 *
 * A guest in a public room's lobby was shown the door switch greyed out: a
 * rule they could read but not touch, under "Waiting for host to start
 * the game…". The door is the host's to set, and nobody else's business
 * (owner: "in public room lobby only hosts should see: joining - open/ask
 * me"). The row is gated on isHost with the rest of its conditions, and
 * since only the host ever sees it, its switch no longer asks who is
 * looking.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lobby = readFileSync(join(process.cwd(), "src/components/team/RoomLobbyV2.tsx"), "utf8");

describe("the Joining row", () => {
  it("is drawn for the host of a public room only", () => {
    expect(lobby).toMatch(/\.\.\.\(isHost && isPublicRoom && hasApprovalColumn && !playsOwnTrivia\s*\n\s*\? \[\{\s*\n\s*key: "joining",/);
  });

  it("and its switch is live, not conditional — nobody else ever sees it", () => {
    expect(lobby).toMatch(/key: "joining",[\s\S]*?onChange: \(v: string\) => void setApproval\(v\),/);
    expect(lobby).not.toMatch(/onChange: isHost \? \(v: string\) => void setApproval\(v\) : undefined/);
  });
});
