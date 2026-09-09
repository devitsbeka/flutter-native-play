/**
 * An invitation on a room card: a small face, a name, and Confirm.
 *
 * The first "You're invited" pill put SafeAvatarImage straight into the
 * pill with a size on containerClassName — which dresses only the fallback.
 * The loaded image is a bare <img class="w-full h-full">, and in an
 * inline-flex pill "full" meant the card: the inviter's face filled it and
 * pushed the room's name off (owner: "what is that? ... not this large
 * avatar and broken layout").
 *
 * Owner's ask: "show beautifully if player is invited in public or in
 * private room, show users in what room they are invited with button
 * saying confirm". So: one badge — "Invited by {name}" with the face in a
 * sized, clipped box — on BOTH tabs' cards (a published room you were
 * asked into lists under Public, not Private), and the card's button turns
 * purple and says Confirm, doing what entering already did: take the seat
 * and read the invite.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const badge = read("src/components/team/RoomInviteBadge.tsx");
const mine = read("src/components/team/MyRoomsSection.tsx");
const pub = read("src/components/team/PublicRoomsSection.tsx");
const reader = read("src/utils/pendingRoomInvites.ts");

describe("the face is small", () => {
  it("lives in a sized, clipped box, and the image fills that box, not the card", () => {
    expect(badge).toMatch(/<span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white\/20">/);
    expect(badge).toMatch(/className="h-full w-full object-cover"\s*\n\s*containerClassName="h-full w-full"/);
    // The shape that broke: a size on the fallback container alone.
    expect(mine).not.toMatch(/containerClassName="h-5 w-5 shrink-0 overflow-hidden rounded-full"/);
  });

  it("says who asked, or that you were asked", () => {
    expect(badge).toMatch(/t\("extra\.roomInvitedBy", \{ name: from\.nickname \}\)/);
    expect(badge).toMatch(/: t\("extra\.roomInvitedYou"\)/);
  });
});

describe("the button says Confirm, on both tabs", () => {
  it("private card: purple, with the check, on a pending invite", () => {
    expect(mine).toMatch(/tone=\{room\.has_pending_invite \? "purple" : "white"\}/);
    expect(mine).toMatch(/\{room\.has_pending_invite \? \(\s*<>\s*<Check className="w-3\.5 h-3\.5" strokeWidth=\{3\} \/>\s*\{t\("common\.confirm"\)\}/);
  });

  it("public card: the same, read off the same map", () => {
    expect(pub).toMatch(/const pendingInvites = useMemo\(\(\) => pendingRoomInvites\(notifications\), \[notifications\]\);/);
    expect(pub).toMatch(/inviteFrom=\{pendingInvites\.get\(room\.id\) \?\? null\}/);
    expect(pub).toMatch(/const invited = inviteFrom !== null && room\.my_state !== "host";/);
    expect(pub).toMatch(/tone=\{invited \? "purple" : ready \? "mint" : "white"\}/);
    expect(pub).toMatch(/\) : invited \? \([\s\S]*?<Check className="w-3\.5 h-3\.5" strokeWidth=\{3\} \/>\s*\{t\("common\.confirm"\)\}/);
    expect(pub).toMatch(/\{invited && <RoomInviteBadge from=\{inviteFrom\} \/>\}/);
  });

  it("one reader for both tabs, off the notifications already in memory", () => {
    expect(reader).toMatch(/export function pendingRoomInvites\(/);
    expect(reader).not.toMatch(/supabase/);
    expect(read("src/hooks/useMyRooms.ts")).toMatch(/pendingRoomInvites\(notifications\)/);
  });
});

describe("the words", () => {
  it("all seven languages carry roomInvitedBy with the name slot", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/^    roomInvitedBy: "[^"]*\{name\}[^"]*",$/m);
    }
  });
});
