import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NICKNAME_MAX_CHARS, clampNickname } from "@/config/nickname";

/**
 * Your own face in the friends reel opens the page you can change things on.
 *
 * It opened `PlayerProfileModal` — the card built to introduce a stranger.
 * Pointed at yourself it showed your avatar, your flag, your name and your
 * points with nothing to do about any of them, having already suppressed the
 * only two things it adds (the Challenge button and the played-together
 * record) because it knows it is you. So it is the account page now, which is
 * called My Profile, carries the flag as something you can change, and no
 * longer prints the league under the name (owner: "instead show my account
 * page ... we should name it 'my profile'").
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const REEL = read("src/components/team/FriendsStoriesBar.tsx");
const PAGE = read("src/pages/Profile.tsx");

/** Every field in the app that takes the player's display name. */
const NAME_FIELDS = [
  "src/pages/Profile.tsx",
  "src/pages/SettingsName.tsx",
  "src/pages/Auth.tsx",
  "src/components/home/ChangeNameModal.tsx",
  "src/components/home/SettingsModal.tsx",
  "src/components/onboarding/SignupOnboardingModal.tsx",
];

describe("your own tile in the reel", () => {
  it("goes to the account page", () => {
    expect(REEL).toMatch(/onOpen=\{\(\) => navigate\("\/profile"\)\}/);
    expect(REEL).not.toMatch(/onOpen=\{\(\) => openProfile\(user\.id\)\}/);
  });

  it("still opens the modal for everyone else", () => {
    // The modal is right for a stranger; this only changes where YOU go.
    expect(REEL).toMatch(/onProfileClick=\{openProfile\}/);
    expect(REEL).toMatch(/openProfile\(friend\.friendId\)/);
  });
});

describe("the account page", () => {
  it("is called My Profile", () => {
    expect(PAGE).toMatch(/<PageHeader title=\{t\("profile\.myProfile"\)\}/);
  });

  it("wears the flag before the name, and the flag is the way to change it", () => {
    const flag = PAGE.indexOf("setShowCountry(true)");
    const name = PAGE.indexOf("{profile.nickname}");
    expect(flag).toBeGreaterThan(-1);
    expect(flag).toBeLessThan(name);
    expect(PAGE).toMatch(/<CountrySelectModal\s*\n\s*isOpen=\{showCountry\}/);
    expect(PAGE).toMatch(/currentCountryCode=\{profile\.country_code\}/);
  });

  it("no longer prints the league under the name", () => {
    expect(PAGE).not.toMatch(/getRankFromPoints/);
    expect(PAGE).not.toMatch(/\{rank\?\.name \|\| t\("profile\.beginner"\)\}/);
  });
});

describe("the display name limit", () => {
  it("is ten", () => {
    expect(NICKNAME_MAX_CHARS).toBe(10);
  });

  it("holds against a paste as well as against typing", () => {
    expect(clampNickname("  Britney  ")).toBe("Britney");
    expect(clampNickname("Bartholomew the Third")).toHaveLength(NICKNAME_MAX_CHARS);
    expect(clampNickname("Bartholomew")).toBe("Bartholome");
  });

  it("is the same number in every field that takes a name", () => {
    // A cap enforced only where the name is edited is not a cap: the long
    // name typed at sign-up stays, and the screens that truncate it never
    // see the difference. So sign-up counts too.
    for (const path of NAME_FIELDS) {
      const source = read(path);
      expect(source, `${path} must read the shared limit`).toMatch(/NICKNAME_MAX_CHARS/);
      expect(source, `${path} still carries a hardcoded name length`).not.toMatch(
        /maxLength=\{20\}/,
      );
    }
  });

  it("says the right thing when a name is too long", () => {
    // The sign-up schema capped at 20 and reported it as "too short".
    expect(read("src/pages/Auth.tsx")).toMatch(
      /\.max\(NICKNAME_MAX_CHARS, t\("auth\.usernameTooLong", \{ max: NICKNAME_MAX_CHARS \}\)\)/,
    );
  });
});
