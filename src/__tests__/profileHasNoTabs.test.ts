/**
 * A player's profile has no Info or Trophies section.
 *
 * Under the name and the buttons sat a two-tab strip: Info (the record
 * between the two of you, answered / success / strongest category) and
 * Trophies (the achievement grid). Both are gone (owner: "remove info and
 * rewards section from players profiles"): the profile is who someone is
 * — face, name, points, the way to play them or befriend them — and,
 * for a friend, the recent activity between you. Nothing below that.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const modal = readFileSync(join(process.cwd(), "src/components/profile/PlayerProfileModal.tsx"), "utf8");

describe("the profile modal", () => {
  it("draws no tab strip and neither panel", () => {
    expect(modal).not.toMatch(/<Tabs\b|<TabsList|<TabsTrigger|<TabsContent/);
    expect(modal).not.toMatch(/from "@\/components\/ui\/tabs"/);
    expect(modal).not.toMatch(/VersusPanel|hasVersusContent/);
    expect(modal).not.toMatch(/extra\.infoTab|extra\.trophiesTab|extra\.noTrophiesYet/);
    expect(modal).not.toMatch(/data\.achievements/);
    expect(modal).not.toMatch(/icon-trophy\.png|icon-info\.png/);
  });

  it("and carries no tab state left over", () => {
    expect(modal).not.toMatch(/chosenTab|showInfoTab|activeTab|fallbackTab/);
  });

  it("keeps the person: face, name, the buttons, and a friend's recent activity", () => {
    expect(modal).toMatch(/\{data\.profile\.nickname\}/);
    expect(modal).toMatch(/\{canSeePrivateInfo && !data\.isCurrentUser && data\.interactions\.length > 0 && \(/);
  });

  /**
   * The points total went the same way as the tabs.
   *
   * It was the last of the scoreboard — the games/wins/win-rate/streak row
   * had already gone for the reason this whole file is about, and a lone
   * running total is that in one line: a number about somebody that says
   * nothing about who they are (owner: "it shows points, we don't need it,
   * remove points").
   *
   * What stands in that slot instead is a place taken on a month's
   * leaderboard — something that happened once, not a counter.
   */
  it("but not a points total", () => {
    expect(modal).not.toMatch(/totalPoints/);
    expect(modal).not.toMatch(/extra\.pointsLabel/);
    expect(modal).toMatch(/<MonthlyAwardChips userId=\{data\.profile\.user_id\} \/>/);
  });
});
