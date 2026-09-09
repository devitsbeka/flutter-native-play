/**
 * The rooms page's Public tab drifts over the blob video, like the shop.
 *
 * GlobalSplineBackground paints the app-wide backdrop — the floating-blob
 * loop under a lavender wash — on the home, the shop, the leaderboard, the
 * profile; and it excluded /team outright. So the Public tab, other
 * people's rooms, the one list on that page that is a place rather than a
 * drawer, sat on the flat page grey (owner: "when i switch from private
 * tab to public show blob video background"). The Private tab keeps the
 * grey: it is the player's own drawer.
 *
 * The tab lives in the URL (TeamV2 keeps ?tab in step with its state), so
 * the backdrop reads it from there, and the page itself goes transparent
 * for that tab so the backdrop shows through.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPublicRoomsLocation } from "@/components/GlobalSplineBackground";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("isPublicRoomsLocation", () => {
  it("is the rooms page on its Public tab", () => {
    expect(isPublicRoomsLocation("/team", "?tab=public")).toBe(true);
  });

  it("with no tab in the URL it is Public, as the page itself defaults", () => {
    expect(isPublicRoomsLocation("/team", "")).toBe(true);
  });

  it("and the legacy ?tab=explore still means Public — those links were sent", () => {
    expect(isPublicRoomsLocation("/team", "?tab=explore")).toBe(true);
  });

  it("is not the Private tab, nor its legacy names", () => {
    expect(isPublicRoomsLocation("/team", "?tab=private")).toBe(false);
    expect(isPublicRoomsLocation("/team", "?tab=rooms")).toBe(false);
    expect(isPublicRoomsLocation("/team", "?tab=my-content")).toBe(false);
  });

  it("is not the lounges, which keep their own backdrops", () => {
    expect(isPublicRoomsLocation("/team-battle", "?tab=public")).toBe(false);
    expect(isPublicRoomsLocation("/team/anything", "")).toBe(false);
  });
});

describe("the backdrop", () => {
  const bg = read("src/components/GlobalSplineBackground.tsx");

  it("shows for the Public tab and still not for the rest of /team", () => {
    expect(bg).toMatch(/const isPublicRooms = isPublicRoomsLocation\(location\.pathname, location\.search\);/);
    expect(bg).toMatch(/const shouldShow = isPublicRooms \|\| \(!isTeamRoute && BACKGROUND_PAGES\.some/);
  });

  it("wears the shop's phone look there: no white vignette, no particles over a list of cards", () => {
    expect(bg).toMatch(/const NO_RADIAL_MASK_MOBILE_PAGES = \["\/leaderboards", "\/team"\];/);
    expect(bg).toMatch(/const NO_PARTICLES_PAGES = \[[^\]]*"\/team"\];/);
  });
});

describe("the rooms page", () => {
  const page = read("src/pages/TeamV2.tsx");

  it("goes transparent on the Public tab so the backdrop shows through, and stays grey on Private", () => {
    expect(page).toMatch(/id="team-main-content" className=\{`[^`]*\$\{activeTab === "public" \? "bg-transparent" : "bg-background"\}`\}/);
  });
});
