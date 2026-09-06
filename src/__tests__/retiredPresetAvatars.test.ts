/**
 * The old preset faces are retired, cards wear the profile's face, seats
 * change on the cards at once, and your own lobby row is the way out.
 *
 * Four asks from the owner in one round:
 *  - replace the old avatars with the animals, one dealt to each;
 *  - "I set my avatar but the room card shows the blue mascot";
 *  - joining and leaving must show on the cards at once, not on the poll;
 *  - tapping your own row in the lobby opens a leave-room sheet.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const utils = read("src/utils/avatarUtils.ts");
const reel = read("src/components/profile/AvatarReel.tsx");
const pub = read("src/components/team/PublicRoomsSection.tsx");
const room = read("src/components/team/RoomLobbyV2.tsx");

describe("the old presets are retired", () => {
  it("a stored preset resolves to an animal, dealt by the preset's name", () => {
    expect(utils).toMatch(/const RETIRED_PRESET_PATTERN = \/\(bot-avatar\|mascot-avatar\)-\(\\d\+\)\//);
    expect(utils).toMatch(/const retired = retiredPresetFromAvatarUrl\(avatarUrl\);\s*\n\s*if \(retired\) return animalAvatarFor\(retired\);/);
    expect(utils).toMatch(/return MASCOTS\[hashSeed\(seed\) % MASCOTS\.length\]\.thumb;/);
  });

  it("the fallback face is an animal too, not a blue King", () => {
    expect(utils).toMatch(/export function fallbackAvatarFor\(seed: string \| null \| undefined\): string \{\s*\n\s*return animalAvatarFor\(seed \|\| ''\);/);
    expect(utils).not.toMatch(/const MASCOT_AVATARS/);
  });

  it("the reel offers the animals by id, not the blue Kings by file", () => {
    expect(reel).toMatch(/const REEL_AVATARS: ReelItem\[\] = MASCOTS\.map\(\(m\) => \(\{\s*\n\s*id: `mascot-\$\{m\.id\}`,\s*\n\s*path: mascotAvatarUrl\(m\.id\),/);
    expect(reel).not.toMatch(/mascot-avatar-\$\{n\}/);
  });

  it("and the database rewrite deals each player one, by their id", () => {
    const p = "supabase/migrations/20261011100000_retire_preset_avatars.sql";
    expect(existsSync(join(process.cwd(), p))).toBe(true);
    const sql = read(p);
    expect(sql).toMatch(/UPDATE public\.profiles\s*\n\s*SET avatar_url = 'mascot:' \|\| \(ARRAY\['owl','panda','tiger','monkey','elephant','giraffe','bull','penguin'\]\)/);
    expect(sql).toMatch(/md5\(user_id::text\)/);
    expect(sql).toMatch(/WHERE avatar_url ~ '\(bot-avatar\|mascot-avatar\)-\[0-9\]\+'/);
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
