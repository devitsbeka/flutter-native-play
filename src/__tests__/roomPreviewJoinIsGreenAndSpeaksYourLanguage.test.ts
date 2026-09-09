import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The preview sheet's button is green, and its rounds are in the reader's
 * language.
 *
 * Two things the owner saw on one sheet. The Join beside Close was white —
 * the card's own colour for a room not yet ready — where every button one
 * tap from a game is mint; and the rounds read "Random", "Guess the Logo",
 * "Mixed" under a Georgian UI, because a round is stored under the name
 * the host's picker was showing and the sheet drew it as stored (owner:
 * "show join button as green button on room preview modals and i noticed
 * if i switch country to Georgia categories need translations, check we
 * have translations across the app on all 7 languages").
 *
 * The translations exist — every active category has a row in all six
 * non-Georgian languages — so this is about READING them: the one resolver
 * (useLocalizedCategoryName) maps a stored name in any of the seven to the
 * viewer's, says Mixed and Random in the viewer's words, and passes a
 * trivia's own title through. Every screen that still printed the stored
 * name reads through it now.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the sheet's button", () => {
  const sheet = read("src/components/team/RoomPreviewSheet.tsx");

  it("is mint, whatever the card's was", () => {
    expect(sheet).toMatch(/export const PREVIEW_BUTTON_TONE: RoomCardTone = "mint";/);
    expect(sheet).toMatch(/tone\?: RoomCardTone; then\?: \(\) => void/);
  });

  it("is asked for in mint by both lists, and the card factories honour it", () => {
    const mine = read("src/components/team/MyRoomsSection.tsx");
    const pub = read("src/components/team/PublicRoomsSection.tsx");
    expect(mine).toMatch(/tone: PREVIEW_BUTTON_TONE, then: \(\) => setPreviewing\(null\)/);
    expect(pub).toMatch(/tone: PREVIEW_BUTTON_TONE, then: \(\) => setPreviewing\(null\)/);
    // On the card itself (no opts.tone) the colour still says what it said.
    expect(mine).toMatch(/tone=\{opts\.tone \?\? \(room\.has_pending_invite \? "mint" : "white"\)\}/);
    expect(pub).toMatch(/tone=\{opts\.tone \?\? \(invited \|\| ready \? "mint" : "white"\)\}/);
  });
});

describe("the sheet's rounds", () => {
  const sheet = read("src/components/team/RoomPreviewSheet.tsx");

  it("are named in the reader's language", () => {
    expect(sheet).toMatch(/import \{ useLocalizedCategoryName \} from "@\/utils\/categoryDisplayName";/);
    expect(sheet).toMatch(/const localizeCategory = useLocalizedCategoryName\(\);/);
    expect(sheet).toMatch(/\{localizeCategory\(round\.name\) \?\? t\("extra\.cpMixedCategory"\)\}/);
    expect(sheet).not.toMatch(/\{round\.name \?\? t\(/);
  });
});

describe("the resolver says Mixed and Random in the reader's words too", () => {
  it("through undecidedRoundKind, before the category map", () => {
    const resolver = read("src/utils/categoryDisplayName.ts");
    expect(resolver).toMatch(/const kind = undecidedRoundKind\(null, stored\);/);
    expect(resolver).toMatch(/if \(kind\) return t\(kind === "mixed" \? "extra\.mixedCategory" : "extra\.cpRandomTitle"\);/);
  });
});

describe("every other screen that printed the stored name reads through it now", () => {
  const cases: Array<[string, RegExp[]]> = [
    ["src/components/team-battle/TeamBattleMatch.tsx", [/\{localizeCategory\(tile\.category_name\)\}/, /· \{localizeCategory\(tile\.category_name\)\}/]],
    ["src/components/tv/TVResultsScreenV2.tsx", [/\{localizeCategory\(nextRound\.category_name\)\}/]],
    ["src/pages/TVHostController.tsx", [/\{localizeCategory\(item\.category_name\)\}/, /name: localizeCategory\(item\.category_name\)/]],
    ["src/pages/ChallengeLanding.tsx", [/\{localizeCategory\(challenge\.category_name\)\}/]],
    ["src/components/tv/TVPollScreen.tsx", [/\{localizeCategory\(suggestion\.category_name\)\}/]],
    ["src/components/controller/ControllerPollScreen.tsx", [/\{localizeCategory\(suggestion\.category_name\)\}/]],
    ["src/components/controller/ControllerPollResults.tsx", [/\{localizeCategory\(suggestion\.category_name\)\}/]],
    ["src/components/controller/ControllerPollResultsGuest.tsx", [/\{localizeCategory\(suggestion\.category_name\)\}/]],
  ];

  for (const [file, pins] of cases) {
    it(file, () => {
      const src = read(file);
      expect(src).toMatch(/import \{ useLocalizedCategoryName \} from "@\/utils\/categoryDisplayName";/);
      expect(src).toMatch(/const localizeCategory = useLocalizedCategoryName\(\);/);
      for (const pin of pins) expect(src).toMatch(pin);
      // No player-facing render of the raw name is left in the file.
      expect(src).not.toMatch(/>\{(tile|nextRound|item|challenge|suggestion)\.category_name\}</);
    });
  }
});
