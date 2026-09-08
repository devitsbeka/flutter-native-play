/**
 * "All Trivias" goes to your trivias.
 *
 * The rooms page opens on the Public tab, and its Private tab has a filter of
 * its own — so a link to the player's own trivias is not `/team`, it is
 * `/team` plus the tab plus the filter. The home rail's "All Trivias" sent
 * players to a bare `/team`, which meant the header above their own trivias
 * led to a list of strangers' rooms (owner: "when i click 'all trivias' on
 * main page it should take me on online page and filter should show only
 * trivias, now it goes to the online page but on public tab, not on private
 * with trivias selected in filter").
 *
 * Three screens already knew the full destination and the rail did not, which
 * is the whole reason it is a constant now: the same drift would otherwise
 * happen again the next time the tab or the filter name changes.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MY_TRIVIAS_PATH } from "@/utils/triviaListRoute";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const feed = read("src/components/home/MobileHomeFeed.tsx");
const lobby = read("src/pages/TriviaLobby.tsx");
const page = read("src/pages/TeamV2.tsx");

describe("the destination", () => {
  it("names the tab and the filter, not just the page", () => {
    expect(MY_TRIVIAS_PATH).toBe("/team?tab=private&filter=trivias");
  });

  it("and the page it points at reads both off the URL", () => {
    // Without these two the link would land on the default tab regardless,
    // which is exactly the bug being fixed.
    expect(page).toMatch(/normalizeTab\(searchParams\.get\("tab"\)\) \?\? "public"/);
    expect(page).toMatch(/\(searchParams\.get\("filter"\) as PrivateFilter \| null\) \?\? "all"/);
  });
});

describe("everyone who links there uses it", () => {
  it("the home rail's All Trivias", () => {
    expect(feed).toMatch(
      /\{ label: t\("extra\.allTriviasBtn"\), onPress: \(\) => navigate\(MY_TRIVIAS_PATH\) \}/,
    );
    // The bare page, which is where it used to go. Scoped to this label:
    // the ROOMS rail's "view all" is a bare /team and is right to be, since
    // the rooms list is what that page opens on.
    expect(feed).not.toMatch(
      /\{ label: t\("extra\.allTriviasBtn"\), onPress: \(\) => navigate\("\/team"\) \}/,
    );
    expect(feed).toMatch(/\{ label: t\("extra\.viewAllRooms"\), onPress: \(\) => navigate\("\/team"\) \}/);
  });

  it("and the trivia page, turning a party away and after a delete", () => {
    expect((lobby.match(/navigate\(MY_TRIVIAS_PATH, \{ replace: true \}\)/g) ?? []).length).toBe(2);
  });

  it("and nobody spells it out by hand any more", () => {
    for (const [name, src] of [["MobileHomeFeed", feed], ["TriviaLobby", lobby]] as const) {
      expect(src, name).not.toContain("tab=private&filter=trivias");
      expect(src, name).toContain('from "@/utils/triviaListRoute"');
    }
  });
});
