/**
 * The party's name is in its logo, and its card carries its own name.
 *
 * The card said "My Trivia Party" twice — once across the banner and once
 * beside the icon below it — and nothing on it named THIS party. A wordmark
 * was tried on the banner and read badly at that size, so the icon stays
 * where it was and the banner does the job the banner is for (owner:
 * "remove this new logo, looks bad, leave our my trivia party icon... on
 * banner show name user set or 'untitled'").
 *
 * The catch is that an unnamed party is not stored unnamed: the save writes
 * `title: title || "MyTrivia Party"`, so it arrives already looking titled,
 * and titled the same as every other one. The brand's own name counts as no
 * name — resolved on the way out, because the parties already saved carry
 * that default and would otherwise look named forever.
 *
 * And the trip back: the Private tab's filter now rides in the URL beside
 * the tab, so opening a trivia and pressing Back returns to the list it was
 * opened from rather than to everything ("back button should land user on
 * online game page, trivias are selected page, to see all").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { triviaDisplayTitle } from "@/utils/triviaTitle";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const tab = read("src/components/social/MyTriviaTab.tsx");
const page = read("src/pages/TeamV2.tsx");
const chooser = read("src/components/social/CreateTriviaTypeModal.tsx");

const t = (key: string) => (key === "extra.triviaUntitled" ? "Untitled" : key);

describe("a party that was never named", () => {
  it("is called Untitled, not nothing and not the brand", () => {
    expect(triviaDisplayTitle("", t)).toBe("Untitled");
    expect(triviaDisplayTitle(null, t)).toBe("Untitled");
    expect(triviaDisplayTitle(undefined, t)).toBe("Untitled");
    // Whitespace is not a name either.
    expect(triviaDisplayTitle("   ", t)).toBe("Untitled");
  });

  it("and a named one keeps its name, trimmed of nothing else", () => {
    expect(triviaDisplayTitle("Sherlock", t)).toBe("Sherlock");
    expect(triviaDisplayTitle("  Sherlock  ", t)).toBe("  Sherlock  ".trim() || "Untitled");
  });

  it("in the reader's language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/triviaUntitled: "[^"]+",/);
    }
  });

  it("and the brand's own name is no name either", () => {
    // The save writes `title || "MyTrivia Party"`, so this is what an
    // unnamed party actually arrives as. Both spellings the app uses.
    expect(triviaDisplayTitle("MyTrivia Party", t)).toBe("Untitled");
    expect(triviaDisplayTitle("My Trivia Party", t)).toBe("Untitled");
    expect(triviaDisplayTitle("  my trivia party  ", t)).toBe("Untitled");
    // But a party the player DID name after the brand-ish keeps its name.
    expect(triviaDisplayTitle("My Trivia Party 2024", t)).toBe("My Trivia Party 2024");
  });

  it("and the card asks for it rather than printing post.title raw", () => {
    expect(tab).toMatch(/\{triviaDisplayTitle\(post\.title, t\)\}/);
  });
});

describe("the name is said once, and it names this party", () => {
  it("the meta row carries the player's own name for it", () => {
    expect(tab).toMatch(/\{triviaDisplayTitle\(post\.title, t\)\}/);
  });

  it("the brand is the icon beside it, not a second line of words", () => {
    // The words moved off the banner and into the row, where the label
    // used to be (owner: "we show my trivia party icon and title user
    // entered or untitled next to it"). Saying the brand there as well
    // would put the card back to naming everything except this party.
    expect(tab).toMatch(/src=\{iconHouseParty\}/);
    expect(tab).not.toMatch(/\{t\("extra\.myTriviaPartyLabel"\)\}/);
  });

  it("and no wordmark was left behind anywhere", () => {
    expect(tab).not.toContain("MyTriviaPartyLogo");
    expect(chooser).not.toContain("MyTriviaPartyLogo");
    // The chooser's tile is an icon with its caption again, like the others.
    expect(chooser).toMatch(/icon: iconHouseParty, title: "My Trivia Party"/);
  });
});

/**
 * The party had no face of its own; it borrowed the friends one.
 *
 * `group-of-people.png` was the MyTrivia Party icon AND the Family PRO
 * plan's header AND the invite-a-friend benefit — so the party looked like
 * a subscription tier and a subscription tier looked like a party (owner:
 * "i noticed we use my trivia party icon as friends pro icon, so we need to
 * replace my trivia party icon").
 *
 * The catalogue already had the right one, filed under Events and titled
 * "House Party". The friends artwork stays exactly where it was; only the
 * party moves off it.
 */
describe("the party and the friends icon are not the same picture", () => {
  const PARTY_SURFACES = [
    "src/components/social/MyTriviaTab.tsx",
    "src/components/social/CreateTriviaTypeModal.tsx",
    "src/components/social/TriviaOnItsWayModal.tsx",
    "src/components/social/DraftsList.tsx",
    "src/components/team/TeamMenuScreen.tsx",
    "src/components/team/CreateRoomPage.tsx",
    "src/components/team/MyRoomsSection.tsx",
    "src/components/challenge/ChallengeTypeModal.tsx",
    "src/components/home/MobileHomeFeed.tsx",
  ];

  it("every party surface wears the house", () => {
    for (const file of PARTY_SURFACES) {
      const src = read(file);
      expect(src, file).toContain("@/assets/house-party.png");
      expect(src, file).not.toContain("@/assets/group-of-people.png");
    }
  });

  it("and the friends artwork stays where it was", () => {
    // The collision, from the other side: these mean people, not a party,
    // and moving them would just swap which screen is wrong.
    expect(read("src/components/shop/MobileProCarousel.tsx"))
      .toContain("@/assets/group-of-people.png");
    expect(read("src/features/home-v3/proBenefits.ts"))
      .toContain("@/assets/icons/group-of-people.png");
    expect(read("src/components/pro/ProPaywallModal.tsx"))
      .toContain("@/assets/icons/group-of-people.png");
  });

  it("and the file is really there, not just imported", () => {
    // A broken import here is a missing icon on nine screens at once.
    const { existsSync } = require("node:fs") as typeof import("node:fs");
    expect(existsSync(join(process.cwd(), "src/assets/house-party.png"))).toBe(true);
  });
});

describe("back lands on the list you came from", () => {
  it("the Private tab's filter rides in the URL beside the tab", () => {
    expect(page).toMatch(/searchParams\.get\("filter"\) as PrivateFilter \| null/);
    expect(page).toMatch(/if \(filter === "all"\) next\.delete\("filter"\);/);
    expect(page).toMatch(/else next\.set\("filter", filter\);/);
  });

  it("and browser navigation moves it back", () => {
    expect(page).toMatch(/if \(fromUrl !== privateFilter\) setPrivateFilterState\(fromUrl\);/);
  });

  it("and a party opens its editor, not a leaderboard it can never fill", () => {
    // This briefly routed to /trivia/:id, which is a leaderboard page —
    // wrong for a party, which is private and played only by the friends
    // its host invites, so the board reads "0 players" forever.
    expect(tab).toMatch(/onClick=\{\(\) => onEdit\(post\)\}/);
    expect(tab).not.toMatch(/onClick=\{\(\) => navigate\(`\/trivia\/\$\{post\.id\}`\)\}/);
  });
});

/**
 * A party has no lobby, and a delete has to actually delete.
 *
 * /trivia/:id is a leaderboard — who played a trivia, ranked, under the
 * social counters. A MyTrivia Party is private and played by invitation, so
 * that page can only ever say "0 players, no one has played yet" (owner:
 * "we don't have leaderboards... remove this screen").
 *
 * And the delete on it did nothing visible. The DELETE itself was fine —
 * verified against the real database, HTTP 204 and the row gone — but the
 * page that opened the editor IS the trivia's own page, so closing the
 * modal left the player looking at a row that no longer existed, unchanged.
 * Nothing said it had worked, so nothing had, as far as anyone could tell.
 */
describe("a party has no lobby, and delete deletes", () => {
  const lobby = read("src/pages/TriviaLobby.tsx");
  const editor = read("src/components/social/EditQuizModal.tsx");
  const roundEditor = read("src/components/social/EditRoundModal.tsx");

  it("the page turns a party away, for the links already out there", () => {
    expect(lobby).toMatch(/const isParty = \(trivia\?\.subject \?\? ""\) === "personal";/);
    expect(lobby).toMatch(/if \(!isLoading && trivia && isParty\) \{/);
    expect(lobby).toMatch(/navigate\(MY_TRIVIAS_PATH, \{ replace: true \}\)/);
  });

  it("a delete that removed nothing is not reported as success", () => {
    // A DELETE matching no rows answers 204 with no error. Without asking
    // for the rows back, "deleted" was said either way.
    for (const [name, src] of [["EditQuizModal", editor], ["EditRoundModal", roundEditor]] as const) {
      expect(src, name).toMatch(/\.select\("id"\);/);
      expect(src, name).toMatch(/if \(!removed\?\.length\) throw new Error\("delete matched no rows"\);/);
    }
  });

  it("and deleting the page you are standing on navigates off it", () => {
    expect(editor).toMatch(/onDeleted\?: \(\) => void;/);
    expect(editor).toMatch(/onDeleted\?\.\(\);/);
    expect(lobby).toMatch(/onDeleted=\{\(\) => navigate\(MY_TRIVIAS_PATH, \{ replace: true \}\)\}/);
  });
});

/**
 * The lobby heading said what kind of room it was, not which room it was.
 *
 * A MyTrivia Party room is SAVED under the brand, so the one big heading over
 * the lobby read "My Trivia Party" for every party anyone ever made (owner:
 * "my trivia party goes up next to the icon in category container and below
 * goes either untitled or name host will provide for room").
 *
 * The heading half is settled next door in partyRoomIsItsParty: `roomName`
 * resolves to the party's own title while the room still wears a dealt name,
 * and to Untitled when the party was never named. What is here is the other
 * half — the kind, said small beside the emblem, so a room called "Untitled"
 * still says what it is.
 */
describe("the lobby says what kind of room it is, beside the emblem", () => {
  const roomLobby = read("src/components/team/RoomLobbyV2.tsx");
  const universal = read("src/components/lobby/UniversalLobby.tsx");

  it("the brand rides beside the emblem, not in the heading", () => {
    expect(roomLobby).toMatch(
      /const heroKicker = isPartyRoom \? t\("extra\.myTriviaPartyLabel"\) : undefined;/,
    );
    expect(roomLobby).toMatch(/roomName=\{roomName\}\s*\n\s*roomKicker=\{heroKicker\}/);
    // Beside it, in a row — not a second stacked line above the heading.
    expect(universal).toMatch(/<span className="mb-\[15px\] flex items-center justify-center gap-3">/);
    expect(universal).toMatch(/\{kicker && \(/);
  });

  it("and only a real party is captioned as one", () => {
    // isPartyRoom checks the trivia's subject; playsOwnTrivia is also true
    // for a room built on a trivia the player merely WROTE, which is not a
    // party — the same distinction the room's icon makes.
    expect(roomLobby).toMatch(/const isPartyRoom = partyTitle !== undefined;/);
    expect(roomLobby).not.toMatch(/heroKicker = playsOwnTrivia/);
  });

  it("and an ordinary room gets no kicker at all", () => {
    expect(universal).toMatch(/kicker\?: string;/);
    expect(universal).toMatch(/kicker && \(/);
  });

  it("and the rename sheet still edits the room's name", () => {
    expect(roomLobby).toMatch(/roomName=\{roomName\}\s*\n\s*onConfirm=\{handleUpdateRoomIconAndName\}/);
  });
});
