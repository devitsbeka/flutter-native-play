/**
 * The old preset faces are retired, cards wear the profile's face, seats
 * change on the cards at once, and your own lobby row is the way out.
 *
 * Four asks from the owner in one round:
 *  - replace the old avatars with the animals, one dealt to each;
 *  - "I set my avatar but the room card shows the blue mascot";
 *  - joining and leaving must show on the cards at once, not on the poll;
 *  - tapping your own row in the lobby opens a leave-room sheet.
 *
 * The FIRST of those was reversed a release later, on seeing it: an animal
 * face cropped into a 64px circle reads as stock illustration rather than as
 * anything of MyTrivia's, so the round characters are the profile picture
 * again and the animals go back to being the home screen's scene. What that
 * left standing is what this file now pins — the drawn people (bot-avatar-N)
 * are still retired, and the other three asks are untouched. The reversal
 * itself is pinned by ourOwnFaceAvatars.test.ts.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const utils = read("src/utils/avatarUtils.ts");
const reel = read("src/components/profile/AvatarReel.tsx");
const pub = read("src/components/team/PublicRoomsSection.tsx");
const room = read("src/components/team/RoomLobbyV2.tsx");

describe("the drawn people are still retired", () => {
  it("a stored one resolves to a face of ours, dealt by the preset's name", () => {
    // Was: dealt an animal. Reversed — see the note at the top of this file.
    expect(utils).toMatch(/const RETIRED_PRESET_PATTERN = \/\(bot-avatar\)-\(\\d\+\)\//);
    expect(utils).toMatch(/const retired = retiredPresetFromAvatarUrl\(avatarUrl\);\s*\n\s*if \(retired\) return ourFaceAvatarFor\(retired\);/);
  });

  it("and so is the fallback for a player with no picture", () => {
    expect(utils).toMatch(/export function fallbackAvatarFor\(seed: string \| null \| undefined\): string \{\s*\n\s*return ourFaceAvatarFor\(seed \|\| ''\);/);
  });

  it("the first migration is left in place, applied and spent", () => {
    // It ran; 20261012100000 rewrites what it dealt. Deleting it would make
    // the history lie about what the database has actually had done to it.
    const p = "supabase/migrations/20261011100000_retire_preset_avatars.sql";
    expect(existsSync(join(process.cwd(), p))).toBe(true);
    const sql = read(p);
    expect(sql).toMatch(/md5\(user_id::text\)/);
    expect(sql).toMatch(/UPDATE public\.room_participants rp\s*\n\s*SET avatar_url = p\.avatar_url/);
  });
});

describe("the room card wears the profile's face", () => {
  it("the seats' snapshots are refreshed from profiles on every read", () => {
    expect(pub).toMatch(/await supabase\.from\("profiles"\)\.select\("user_id, avatar_url"\)\.in\("user_id", seatedIds\)/);
    expect(pub).toMatch(/avatar_url: profileFace\.has\(p\.user_id\) \? profileFace\.get\(p\.user_id\) \?\? null : p\.avatar_url,/);
  });
});

describe("a seat taken or left shows on the cards at once", () => {
  it("the public list listens to room_participants and refreshes faces and counts", () => {
    expect(pub).toMatch(/\.channel\("public-rooms-seats"\)\s*\n\s*\.on\("postgres_changes", \{ event: "\*", schema: "public", table: "room_participants" \}/);
    expect(pub).toMatch(/invalidateQueries\(\{ queryKey: \["public-room-players"\] \}\);\s*\n\s*void queryClient\.invalidateQueries\(\{ queryKey: PUBLIC_ROOMS_KEY \}\);/);
  });
});

describe("your own row in the lobby is the way out", () => {
  it("tapping it opens the leave sheet, which carries the leave-room button", () => {
    expect(room).toMatch(/p\.user_id === user\?\.id\s*\n\s*\? \(\) => setShowLeaveConfirm\(true\)/);
    expect(room).toMatch(/onClick=\{handleLeavePermanently\}/);
  });
});
