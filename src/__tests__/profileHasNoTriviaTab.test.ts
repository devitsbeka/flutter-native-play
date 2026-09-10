/**
 * A player's trivias never show on their profile.
 *
 * Trivias are private now: a creator plays and manages them from the
 * private tab on the online-game page, and can invite someone to play one
 * directly, but nobody browses another player's quizzes from their profile
 * card (owner: "we don't show trivias to other users, trivias are private
 * now... user can invite to play their trivias but not show on their
 * profile"). This used to be conditional - a `hideTrivias` flag dropped the
 * tab only for a few callers (join requests, friend requests, game invites)
 * - so every other entry point, including the plain /profile/:userId route,
 * still showed it. The tab is gone outright, for every caller.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const modal = read("src/components/profile/PlayerProfileModal.tsx");

describe("PlayerProfileModal has no quizzes tab", () => {
  it("no trivias trigger, panel, or the flag that used to gate it", () => {
    expect(modal).not.toMatch(/TabsTrigger value="trivias"/);
    expect(modal).not.toMatch(/TabsContent value="trivias"/);
    expect(modal).not.toMatch(/hideTrivias/);
    expect(modal).not.toMatch(/showTriviasTab/);
  });

  it("and no tabs at all now — Info and Trophies went too (profileHasNoTabs.test.ts)", () => {
    expect(modal).not.toMatch(/<Tabs\b/);
  });

  it("no longer reads trivias or collections off the profile data", () => {
    expect(modal).not.toMatch(/data\.trivias/);
    expect(modal).not.toMatch(/data\.collections/);
  });
});

describe("openProfile no longer takes a visibility flag", () => {
  it("every caller passes just the user id", () => {
    for (const file of [
      "src/components/team/JoinRequestGate.tsx",
      "src/components/team/FriendRequestGate.tsx",
      "src/components/team/GameInviteGate.tsx",
    ]) {
      const src = read(file);
      expect(src, file).not.toMatch(/hideTrivias/);
    }
    expect(read("src/contexts/PlayerProfileContext.tsx")).not.toMatch(/hideTrivias/);
  });
});

describe("the profile hook stops fetching quiz content it will never show", () => {
  const hook = read("src/hooks/usePlayerProfile.ts");

  it("no more user_quiz_posts or quiz_collections query", () => {
    expect(hook).not.toMatch(/user_quiz_posts/);
    expect(hook).not.toMatch(/quiz_collections/);
  });

  it("PlayerProfileData carries no trivias or collections field", () => {
    expect(hook).not.toMatch(/trivias:/);
    expect(hook).not.toMatch(/collections:/);
  });
});
