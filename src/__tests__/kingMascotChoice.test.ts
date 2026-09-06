/**
 * The blue mascot is a choice again, and the way back to him.
 *
 * The King is the home screen's default: a player who has never picked sees
 * his idle loop. He was deliberately left out of the mascot grid as "the
 * default, not a choice" — which made him a one-way door. Pick any animal
 * once and there was no tile to pick him back, so the app's own mascot
 * simply disappeared from your home screen for good.
 *
 * He has no scene of his own, so "the King" IS the absence of a pick:
 * choosing his tile clears `profiles.home_mascot`, which is exactly the
 * state a new player is in. That needs no migration — the CHECK has always
 * allowed NULL, and NULL is what the wolf and dolphin retirements set.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MASCOT_IDS, isMascotId, parseMascotId } from "@/config/mascots";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const modal = read("src/components/home/AvatarModal.tsx");
const hook = read("src/hooks/useHomeMascot.ts");

describe("the King leads the grid", () => {
  it("his tile is the first one, before the animals", () => {
    // Scoped to the SCENE grid. The same faces appear twice in this modal
    // now — once as avatars to wear, once as scenes to live on the home
    // screen — so "the first MASCOTS.map in the file" is the other grid,
    // and the King belongs only to this one.
    const king = modal.indexOf("onClick={() => chooseMascot(null)}");
    expect(king).toBeGreaterThan(-1);
    const animals = modal.indexOf("{MASCOTS.map((mascot) => {", king);
    expect(animals).toBeGreaterThan(king);
    // And he is in the scene grid rather than the avatar gallery: the tile
    // above him sets the home screen.
    expect(modal.slice(king - 800, king)).toMatch(/avatar\.mascotsHint/);
  });

  it("and picking him clears the choice rather than storing an id", () => {
    // He has no scene: the home screen plays his loop when nothing is set.
    expect(modal).toMatch(/chooseMascot\(null\)/);
    expect(hook).toMatch(/setMascot: \(id: MascotId \| null\) => Promise<void>;/);
    expect(hook).toMatch(/async \(id: MascotId \| null\) => \{/);
  });

  it("he reads as selected when nothing is picked", () => {
    expect(modal).toMatch(/aria-pressed=\{mascotId === null\}/);
    expect(modal).toMatch(/\{mascotId === null && \(/);
  });

  it("wearing his own face, fitted rather than cropped", () => {
    // The animals' tiles are square face crops; his art is a whole
    // character on transparency, so object-cover would behead him.
    expect(modal).toMatch(/import kingMascotThumb from "@\/assets\/play-chooser\/icon-king\.webp";/);
    expect(modal).toMatch(/src=\{kingMascotThumb\}/);
    expect(modal).toMatch(/object-contain p-1/);
  });

  it("and he is named in every language already", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+king: "Trivia King",/);
    }
    expect(modal).toMatch(/aria-label=\{t\("avatar\.mascotNames\.king"\)\}/);
  });
});

describe("null stays the King, everywhere it is read", () => {
  it("he is not one of the stored ids", () => {
    // Storing "king" would need a scene and a CHECK that already lists it;
    // clearing the column reuses the path a new player is on.
    expect(MASCOT_IDS).not.toContain("king");
    expect(isMascotId("king")).toBe(false);
    expect(parseMascotId("king")).toBeNull();
  });

  it("and the local cache clears with it", () => {
    // Otherwise this device would keep painting the animal the account no
    // longer has.
    expect(hook).toMatch(/if \(id\) localStorage\.setItem\(cacheKey\(userId\), id\);\s*\n\s*else localStorage\.removeItem\(cacheKey\(userId\)\);/);
  });

  it("no migration was needed", () => {
    // The constraint has allowed NULL since it was written, and the wolf and
    // dolphin retirements set exactly this value on the players who had them.
    const retire = read("supabase/migrations/20261007100000_home_mascot_retire_wolf_dolphin.sql");
    expect(retire).toMatch(/home_mascot IS NULL/);
    expect(retire).toMatch(/SET home_mascot = NULL/);
  });
});
