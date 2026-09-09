/**
 * The rooms-locked screen's own words, and one line off the PRO card.
 *
 * The screen a guest meets from the Create button used to lead with what is
 * locked — "Rooms are a PRO feature" — rather than with what PRO gets them.
 * It leads with the offer now: become PRO, invite friends, and what that
 * lets you build (owner: "title: გახდი pro და მოიწვიე მეგობრები სათამაშოდ
 * description below: შექმენი სათამაშო ოთახები და ტრივიები").
 *
 * The PRO card underneath repeated itself: a line under its title said
 * "unlimited play in every category", and the fine print below the button —
 * required on screen by store guideline 3.1.2 — says the plan and the
 * price, not the same claim twice. The owner asked for the card to be just
 * the title and the button, with the (already-required) fine print doing
 * the describing.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const modal = read("src/components/home/PlayLimitModal.tsx");

describe("the rooms-locked screen leads with the offer", () => {
  it("in Georgian, the words the owner gave", () => {
    const ka = read("src/locales/ka.ts");
    expect(ka).toMatch(/roomsLockedTitle: "გახდი PRO და მოიწვიე მეგობრები სათამაშოდ",/);
    expect(ka).toMatch(/roomsLockedBody: "შექმენი სათამაშო ოთახები და ტრივიები",/);
  });

  it("in all seven languages, none left on the old copy", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/roomsLockedTitle: "[^"]+",/);
      expect(src, lang).toMatch(/roomsLockedBody: "[^"]+",/);
      expect(src, lang).not.toMatch(/Rooms are a PRO feature|ოთახები PRO-ს ფუნქციაა/);
    }
  });
});

describe("the PRO card is a title and a button, nothing between", () => {
  it("no longer renders a second line under the title", () => {
    expect(modal).toMatch(
      /\{t\("paywall\.title"\)\}\s*\n\s*<\/p>\s*\n\s*\n\s*<motion\.button/,
    );
  });

  it("and the line's own key is gone everywhere — not just unused, retired", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).not.toMatch(/proHookBody/);
    }
    expect(modal).not.toMatch(/proHookBody/);
  });

  it("the fine print below the button is untouched — it is the description now", () => {
    expect(modal).toMatch(/t\(trialDays \? "paywall\.footnoteTrial" : "paywall\.footnote"\)/);
  });
});
