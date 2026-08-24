import { describe, expect, it } from "vitest";
import { imageTreatmentFor, PHOTO_BAND_CATEGORY_IDS } from "@/utils/questionImageTreatment";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

/**
 * A picture bank gets exactly one treatment, and picking the wrong one is
 * visible rather than broken — which is why it survived: a brand mark on a
 * coloured wash looks like a design choice.
 */

describe("imageTreatmentFor", () => {
  it("gives the photographic banks the band and nothing else", () => {
    for (const id of PHOTO_BAND_CATEGORY_IDS) {
      expect(imageTreatmentFor(id)).toEqual({ inset: false, framed: false, band: true });
    }
  });

  it("gives a logo plain white, never a band", () => {
    // The reported bug: a coloured wash behind the Land Rover mark.
    expect(imageTreatmentFor("guess_logo")).toEqual({ inset: true, framed: false, band: false });
  });

  it("gives a flag its frame, never a band", () => {
    expect(imageTreatmentFor("guess_flag")).toEqual({ inset: false, framed: true, band: false });
  });

  it("gives an unrecognised category the neutral ground", () => {
    // The old rule was negative — "not a logo, not a flag" — so anything it
    // could not place got the photographic treatment. A room storing a uuid
    // instead of a slug is exactly that case, and is why a logo had a band.
    for (const unknown of [
      null,
      undefined,
      "",
      "6fa574e2-c61e-5ac2-bf17-85f742804238",
      "geography",
    ]) {
      expect(imageTreatmentFor(unknown)).toEqual({ inset: false, framed: false, band: false });
    }
  });

  it("never assigns two treatments at once", () => {
    for (const id of [...POPULAR_IMAGE_CATEGORY_IDS, "geography", "unknown", null]) {
      const t = imageTreatmentFor(id);
      expect(Number(t.inset) + Number(t.framed) + Number(t.band)).toBeLessThanOrEqual(1);
    }
  });

  it("covers every picture bank with a deliberate treatment", () => {
    // Each of the six is either a photograph, a logo, or a flag. If a seventh
    // bank is added, this fails until somebody decides which it is.
    const undecided = (POPULAR_IMAGE_CATEGORY_IDS as readonly string[]).filter((id) => {
      const t = imageTreatmentFor(id);
      return !t.inset && !t.framed && !t.band;
    });
    expect(undecided).toEqual([]);
  });

  it("treats city as a photograph, like celebrity and movie", () => {
    // A city shot is a photograph that happens to be landscape; the thing
    // that decides the treatment is what the picture IS, not its shape.
    expect(imageTreatmentFor("guess_city")).toEqual(imageTreatmentFor("guess_celebrity"));
    expect(imageTreatmentFor("guess_city").band).toBe(true);
  });
});

describe("logo tile-reveal stays bound to the logo treatment", () => {
  // The reveal is what makes the logo bank a game rather than a lookup: a
  // great many marks are the company's name set in a typeface, so an
  // uncovered logo prints the answer on the card. It used to be wired to its
  // own `category_id === "guess_logo"` comparison at each call site; it is now
  // bound to the same `inset` flag, and must stay that way.
  const CALL_SITES = [
    "src/components/team/MultiplayerGameScreenV2.tsx",
    "src/components/team/MultiplayerObserverScreen.tsx",
    "src/components/game/QuizGameScreenProd.tsx",
    "src/pages/CategoryQuizPage.tsx",
  ];

  it("passes imageReveal from the inset flag at every call site", async () => {
    const { readFileSync } = await import("node:fs");
    for (const path of CALL_SITES) {
      const src = readFileSync(path, "utf8");
      const bindings = [...src.matchAll(/imageReveal=\{([^}]*)\}/g)].map((m) => m[1]);
      expect(bindings.length, `${path} renders no imageReveal`).toBeGreaterThan(0);
      for (const expr of bindings) {
        expect(expr, `${path} decoupled imageReveal from the logo treatment`).toMatch(/\.inset\b/);
      }
    }
  });

  it("turns the reveal on for logos and off for everything else", () => {
    expect(imageTreatmentFor("guess_logo").inset).toBe(true);
    for (const other of ["guess_flag", "guess_celebrity", "guess_movie", "guess_sportsman", "guess_city", null]) {
      expect(imageTreatmentFor(other).inset).toBe(false);
    }
  });
});
