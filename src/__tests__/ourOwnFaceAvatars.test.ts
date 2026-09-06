/**
 * The profile picture is one of OUR characters again.
 *
 * The avatar studio had started offering the animal mascots' faces as profile
 * pictures; cropped into a 64px circle an elephant reads as stock
 * illustration rather than as anything of MyTrivia's. The app's own round
 * characters are the set again, in the studio grid and the profile reel, from
 * one shared list so the two cannot drift apart.
 *
 * The blue King is in the set but not on offer. He is the home screen's own
 * mascot: a player wearing him reads as the app's furniture.
 *
 * The art is the original renders. They were reframed once — squared to
 * 512x512 with the character at 80% and its own background blurred behind it
 * — to stop the circle's `object-cover` from slicing crowns and hat brims.
 * The owner's answer on seeing it was that it looked wrong, and it did: the
 * blurred ring reads as a smudge, and a face pulled that far back stops being
 * a face at 64px. So the assertions here pin the FILENAMES and the set rather
 * than any framing — the paths are what `avatar_url` stores, and they are
 * what must not move.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_MASCOT_AVATARS,
  MASCOT_AVATARS,
  SCENE_MASCOT_AVATAR_ID,
  mascotAvatarByPath,
} from "@/config/mascotAvatars";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const modal = read("src/components/home/AvatarModal.tsx");
const reel = read("src/components/profile/AvatarReel.tsx");
const utils = read("src/utils/avatarUtils.ts");

/** Width and height straight out of the PNG's IHDR chunk. */
function pngSize(path: string): { w: number; h: number } {
  const buf = readFileSync(join(process.cwd(), path));
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

describe("the art is the original renders", () => {
  it("all eight at the size they were drawn", () => {
    // Pinned so the reframing that was tried and rejected — squaring them to
    // 512x512 over a blurred copy of themselves — cannot come back by
    // accident. Changing the framing is a decision about the ART.
    for (const face of ALL_MASCOT_AVATARS) {
      const { w, h } = pngSize(`src/assets/avatars/${face.id}.png`);
      expect({ id: face.id, w, h }).toEqual({ id: face.id, w: 397, h: 334 });
    }
  });

  it("under the filenames avatar_url stores, so no stored picture breaks", () => {
    // These paths are in the database. A new filename would need a migration
    // and would blank the picture of everyone the migration had not reached.
    for (const face of ALL_MASCOT_AVATARS) {
      expect(face.path).toBe(`/src/assets/avatars/${face.id}.png`);
    }
    expect(ALL_MASCOT_AVATARS).toHaveLength(8);
  });
});

describe("the King is kept, and not offered", () => {
  it("he is in the set but out of the choices", () => {
    expect(ALL_MASCOT_AVATARS.some((a) => a.id === SCENE_MASCOT_AVATAR_ID)).toBe(true);
    expect(MASCOT_AVATARS.some((a) => a.id === SCENE_MASCOT_AVATAR_ID)).toBe(false);
    expect(MASCOT_AVATARS).toHaveLength(7);
  });

  it("his path still resolves, for anyone already wearing him", () => {
    // Dropping him from the map would have blanked their picture.
    expect(mascotAvatarByPath("/src/assets/avatars/mascot-avatar-1.png")?.id).toBe(
      SCENE_MASCOT_AVATAR_ID,
    );
    expect(utils).toMatch(/ALL_MASCOT_AVATARS\.map\(\(a\) => \[`\$\{a\.id\}\.png`, a\.url\]\)/);
  });

  it("and the no-picture fallback hands out the other seven only", () => {
    // One player in eight had no avatar_url; giving those the King made them
    // look like the home screen rather than like people.
    expect(utils).toMatch(/return MASCOT_AVATARS\[hashSeed\(seed\) % MASCOT_AVATARS\.length\]\.url;/);
    expect(utils).toMatch(/return ourFaceAvatarFor\(seed \|\| ''\);/);
  });

  it("mascotAvatarByPath answers null for everything else", () => {
    expect(mascotAvatarByPath("https://example.com/a.png")).toBeNull();
    expect(mascotAvatarByPath("mascot:panda")).toBeNull();
    expect(mascotAvatarByPath(null)).toBeNull();
    expect(mascotAvatarByPath(undefined)).toBeNull();
  });
});

describe("both surfaces offer the same faces", () => {
  it("the studio's grid picks from the shared list and stores the path", () => {
    expect(modal).toMatch(/import \{ MASCOT_AVATARS, mascotAvatarByPath \} from "@\/config\/mascotAvatars";/);
    expect(modal).toMatch(/\{MASCOT_AVATARS\.map\(\(face\) => \{/);
    expect(modal).toMatch(/onClick=\{\(\) => chooseMascotAvatar\(face\.path\)\}/);
    expect(modal).toMatch(/avatar_url: path, animated_avatar_url: null/);
    // The tick follows what is worn, read back through the same path.
    expect(modal).toMatch(/mascotAvatarByPath\(profile\?\.avatar_url\)\?\.id === face\.id/);
  });

  it("the profile reel takes the same list rather than spelling out 1..8", () => {
    // It was the reel that let a player pick the King in the first place.
    expect(reel).toMatch(/const REEL_AVATARS: ReelItem\[\] = MASCOT_AVATARS\.map\(\(face\) => \(\{/);
    expect(reel).not.toMatch(/\[1, 2, 3, 4, 5, 6, 7, 8\]\.map/);
  });

  it("and the section is named in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/\n\s+mascotFaces: "[^"]+",/);
      expect(src, lang).toMatch(/\n\s+mascotFacesHint: "[^"]+",/);
      // The old heading called them animals.
      expect(src, lang).not.toMatch(/animalAvatars/);
    }
    expect(modal).toMatch(/t\("avatar\.mascotFaces"\)/);
    expect(modal).toMatch(/t\("avatar\.mascotFacesHint"\)/);
  });
});

describe("the animals keep the job they were made for", () => {
  it("they are still the home screen's scene, in the grid below", () => {
    expect(modal).toMatch(/t\("avatar\.mascots"\)/);
    expect(modal).toMatch(/\{MASCOTS\.map\(\(mascot\) => \{/);
  });

  it("and `mascot:<animal>` still resolves, so nothing blanks mid-rewrite", () => {
    // Between the deploy and the migration being pasted, every player dealt
    // an animal is still storing one. Dropping the branch would have left
    // them with no picture at all for that window.
    expect(utils).toMatch(/const mascotId = mascotIdFromAvatarUrl\(avatarUrl\);/);
    expect(utils).toMatch(/if \(mascotId\) return MASCOTS\.find\(\(m\) => m\.id === mascotId\)\?\.thumb;/);
  });
});

describe("the database is put back too", () => {
  const sql = read("supabase/migrations/20261012100000_our_faces_back_as_avatars.sql");

  it("deals every animal-wearing player one of ours, by their id", () => {
    // Dealt from the id, as the migration it reverses dealt them: random
    // across players, the same face for a given player on every reload.
    expect(sql).toMatch(/WHERE avatar_url LIKE 'mascot:%'/);
    expect(sql).toMatch(/md5\(user_id::text\)/);
    expect(sql).toMatch(/'\/src\/assets\/avatars\/mascot-avatar-'/);
  });

  it("out of seven faces, never the King", () => {
    // `2 + (h % 7)` lands in 2..8. `1 + (h % 8)` would deal him to one in
    // eight, which is the thing the owner asked to avoid.
    expect(sql).toMatch(/\|\| \(2 \+ \(\(\('x' \|\| left\(md5\(user_id::text\), 7\)\)::bit\(28\)::int\) % 7\)\)::text/);
    expect(sql).not.toMatch(/1 \+ \(\(\('x'/);
  });

  it("and refreshes the seat snapshots, which are copies", () => {
    // room_participants.avatar_url is taken when the seat is filled and never
    // updated, so a card would go on drawing an animal for a player who is
    // no longer wearing one.
    expect(sql).toMatch(/UPDATE public\.room_participants rp\s*\n\s*SET avatar_url = p\.avatar_url/);
    expect(sql).toMatch(/AND rp\.avatar_url LIKE 'mascot:%'/);
  });
});
