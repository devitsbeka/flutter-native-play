/**
 * Getting back into a room you are already in.
 *
 * Four small things stood between a player and a room that was waiting for
 * them, and each was invisible from inside the lobby:
 *
 *  - the header's bell counted notifications, drew the badge, and did
 *    nothing at all when pressed — in the one place an invitation or a join
 *    request is most likely to be sitting;
 *  - a seated player who had closed the app looked exactly like one who had
 *    not, so the host waited on somebody who left ten minutes ago;
 *  - a room whose whole roster is online — the only room on the list you
 *    can walk into and play this minute — sorted by recency, wherever that
 *    happened to put it;
 *  - and the arena's VS sat under both benches rather than between them,
 *    because grid auto-placement is sparse.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compareRooms, type OrderableRoom } from "@/utils/roomOrder";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const universal = read("src/components/lobby/UniversalLobby.tsx");
const battle = read("src/pages/TeamBattlePage.tsx");

describe("the lobby's bell", () => {
  it("is a button that opens the notifications", () => {
    expect(universal).toMatch(/onClick=\{onBell\}/);
    expect(universal).toMatch(/onBell\?: \(\) => void;/);
    // A <span> with a badge on it is decoration.
    expect(universal).not.toMatch(/<span className="relative flex h-10 w-10 items-center justify-center rounded-full">\s*\n\s*<Bell/);
  });

  it("every lobby wires it", () => {
    for (const file of [
      "src/pages/KingPage.tsx",
      "src/pages/TeamBattlePage.tsx",
      "src/components/team/RoomLobbyV2.tsx",
      "src/components/team/CreateRoomPage.tsx",
    ]) {
      expect(read(file), file).toMatch(/onBell=\{\(\) => navigate\("\/notifications"\)\}/);
    }
  });
});

describe("an absent player is visible, and callable", () => {
  it("the row greys and grows a bell", () => {
    expect(universal).toMatch(/offline\?: boolean;/);
    expect(universal).toMatch(/onCall\?: \(\) => void;/);
    expect(universal).toMatch(/player\.offline && "opacity-45 grayscale"/);
    expect(universal).toMatch(/player\.offline && player\.onCall \?/);
  });

  it("the arena reads presence and pings the person who is missing", () => {
    expect(battle).toMatch(/const \{ online \} = useParticipantPresence\(seatedIds\)/);
    // A bot is never away; nor are you, sitting here looking at the screen.
    expect(battle).toMatch(
      /offline: !pending && !p\.is_bot && p\.user_id !== user\?\.id && !online\.has\(p\.user_id\)/,
    );
    // Same road the in-match call takes: a notification that routes back
    // here, plus a push for somebody who has left the app.
    expect(battle).toMatch(/createNotification\(\s*target\.user_id,\s*"room_ping",/);
    expect(battle).toMatch(/invoke\("send-social-push", \{ body: \{ kind: "team_poke", roomId: room\.id \} \}\)/);
    // And one per person per half-minute.
    expect(battle).toMatch(/calledIds\.has\(target\.user_id\)/);
    expect(battle).toMatch(/30_000,/);
  });
});

describe("a room you can play in right now sorts first", () => {
  const room = (over: Partial<OrderableRoom> = {}): OrderableRoom => ({
    created_at: "2026-01-01T00:00:00Z",
    last_activity_at: "2026-01-01T00:00:00Z",
    ...over,
  });

  it("beats an invitation, a live TV session and anything newer", () => {
    const live = room({ hasFullRoster: true, created_at: "2020-01-01T00:00:00Z" });
    expect(compareRooms(live, room({ hasPendingInvite: true }))).toBeLessThan(0);
    expect(compareRooms(live, room({ hasLiveTV: true }))).toBeLessThan(0);
    expect(compareRooms(live, room({ created_at: "2030-01-01T00:00:00Z" }))).toBeLessThan(0);
  });

  it("and the old order still holds underneath it", () => {
    expect(compareRooms(room({ hasPendingInvite: true }), room({ hasLiveTV: true }))).toBeLessThan(0);
    expect(
      compareRooms(room({ created_at: "2030-01-01T00:00:00Z" }), room()),
    ).toBeLessThan(0);
  });

  it("is everyone, not anyone — a room with one of four present is a wait", () => {
    const hook = read("src/hooks/useMyRooms.ts");
    expect(hook).toMatch(
      /has_full_roster:\s*\n?\s*participants\.length > 1 && onlineParticipants\.length === participants\.length,/,
    );
  });
});

describe("the arena's heading and its VS", () => {
  it("the VS sits between the crests, on their own row", () => {
    // Grid auto-placement is sparse: naming columns 1 and 3 and leaving 2
    // for a later child put that child on a row of its own.
    expect(universal).toMatch(/gridColumn: i === 0 \? 1 : 3, gridRow: 1/);
    expect(universal).toMatch(/gridColumn: 2, gridRow: 1/);
  });

  it("the room's icon and its name share one row", () => {
    expect(universal).toMatch(/<div className="flex items-center gap-2\.5">/);
    expect(universal).toMatch(/size-\[44px\] object-contain/);
    expect(universal).not.toMatch(/flex flex-col items-start gap-2/);
  });

  it("and the card starts higher up the screen", () => {
    // 36px of fixed air plus a flex-1 that ate every spare pixel pushed the
    // card — the point of the screen — under the fold.
    expect(universal).toMatch(/min-h-\[12px\] flex-\[0\.35\]/);
    expect(universal).toMatch(/mb-\[7px\] mt-\[16px\]/);
  });
});
