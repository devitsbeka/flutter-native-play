/**
 * The Guess card, and the sheet that dresses a team.
 *
 * Two changes that are easy to undo by accident:
 *
 *  - the create screen's first card used to be "Random Game", which rolled a
 *    category and opened a classic room — the same game the Classic Trivia
 *    card opens, one card to its right. It is the picture games now, which
 *    are a genuinely different thing to play and were reachable only by
 *    hunting through the library;
 *  - the crest sheet's green button used to require an icon, so renaming a
 *    side without also re-skinning it was impossible.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TEAM_NAME_MAX } from "@/utils/teamNameGenerator";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const create = read("src/components/team/CreateRoomPage.tsx");
const picker = read("src/components/team/RoomIconPickerModal.tsx");
const battle = read("src/pages/TeamBattlePage.tsx");

const LOCALES = ["en", "ka", "de", "es", "fr", "it", "pt"] as const;

describe("Guess replaced Random on the create screen", () => {
  it("the card is the guess game, and nothing rolls a category any more", () => {
    expect(create).toMatch(/\{ key: "guess", art: featuredGuess,/);
    expect(create).not.toMatch(/\{ key: "random",/);
    expect(create).not.toMatch(/extra\.modeRandom/);
    // GameChoice is the union the cards are keyed by; "random" leaving it is
    // what makes a leftover reference a compile error rather than a dead
    // branch nobody notices.
    expect(create).toMatch(/type GameChoice = "quick" \| "guess" \|/);
  });

  it("the card asks which picture game instead of starting one", () => {
    // Every other card starts its game on the tap. This one cannot: which
    // picture game IS the choice, so it unfolds them and arms the start on
    // the pick.
    expect(create).toMatch(/if \(key === "guess"\) \{/);
    const guessBranch = create.slice(create.indexOf('if (key === "guess") {'));
    const branchBody = guessBranch.slice(0, guessBranch.indexOf("autoStart.current = true;"));
    expect(branchBody).not.toMatch(/autoStart/);
    expect(create).toMatch(/extra\.guessPickTitle/);
    expect(create).toMatch(/autoStart\.current = true;\s*\n\s*\}\}/);
  });

  it("the tiles are the picture games the database actually has", () => {
    // POPULAR_IMAGE_CATEGORY_IDS names six; guess_movie has no row, and a
    // tile that opens a category nobody can play is worse than no tile.
    expect(create).toMatch(/POPULAR_IMAGE_CATEGORY_IDS as readonly string\[\]\)\s*\n?\s*\.map\(\(id\) => categories\.find/);
    expect(create).toMatch(/\.filter\(\(c\): c is Category => !!c\)/);
  });

  it("every language names it", () => {
    for (const lang of LOCALES) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/modeGuessTitle: "/);
      expect(src, lang).toMatch(/modeGuessDesc: "/);
      expect(src, lang).toMatch(/guessPickTitle: "/);
      expect(src, lang).not.toMatch(/modeRandomTitle|modeRandomDesc/);
    }
  });
});

describe("the icon sheet saves what it was opened for", () => {
  it("a rename lands without picking an icon", () => {
    // `disabled={!selectedIcon || ...}` meant a dead green button on any
    // room with no icon on its row — every battle side before its captain's
    // device writes the dealt crest — no matter what was typed.
    expect(picker).toMatch(/const iconToSave = selectedIcon \?\? currentIconUrl;/);
    expect(picker).toMatch(/const canConfirm = iconOnly \? !!iconToSave : !!iconToSave \|\| !!editableName\.trim\(\);/);
    expect(picker).toMatch(/disabled=\{!canConfirm \|\| isGeneratingName\}/);
    // Which makes the icon optional at every call site.
    expect(picker).toMatch(/onConfirm: \(iconUrl: string \| null, newName: string\) => void;/);
  });

  it("it takes its starting values once per opening", () => {
    // The reset used to re-run whenever currentIconUrl or roomName changed —
    // which in a lobby means whenever the live room row moves underneath,
    // wiping the icon just tapped and retyping over the name being typed.
    expect(picker).toMatch(/const openedRef = useRef\(false\);/);
    expect(picker).toMatch(/if \(openedRef\.current\) return;/);
  });

  it("a team's name is capped where it is typed", () => {
    expect(TEAM_NAME_MAX).toBe(12);
    expect(picker).toMatch(/maxLength=\{nameMaxLength\}/);
    expect(battle).toMatch(/nameMaxLength=\{TEAM_NAME_MAX\}/);
    expect(battle).toMatch(/p_name: name\.slice\(0, TEAM_NAME_MAX\)/);
  });

  it("the battle lobby saves either half, and reads the room back", () => {
    expect(battle).toMatch(/if \(iconUrl\) void setTeamIcon\(team, iconUrl\);/);
    expect(battle).toMatch(/if \(newName && newName !== before\) void setTeamName\(team, newName\);/);
    // Realtime is the right default and not a guarantee; a write about your
    // own room re-reads it so the screen shows what you just did.
    const ctx = read("src/contexts/TeamBattleContext.tsx");
    expect(ctx).toMatch(/const refreshRoom = useCallback\(async \(\) => \{/);
    expect((battle.match(/await refreshRoom\(\);/g) ?? []).length).toBe(2);
  });
});
