/**
 * The out-of-lives screen, drawn the way the design says.
 *
 * The screen itself was already wired up right — Play opens it, and it
 * offers an ad, PRO, or the wait (outOfLivesGoesToTheOffer.test.ts) — but it
 * still wore an earlier look: an hourglass, a giant ticking number up top, a
 * flat white card, a small X in the corner. The design moved on (Figma
 * 1102:4315): a title that says what happened and a line under it saying
 * there is a choice, a dark "watch an ad" card with a "+1" heart badge, a
 * mint PRO card with a crown floating above it, and — replacing the X — an
 * honest pink "give up" card that says what closing costs: waiting out the
 * clock rather than watching an ad or going PRO (owner: "check if you merge
 * to main, i can't see design i provided via Figma link").
 *
 * One thing the reference does NOT get copied verbatim: its fine print reads
 * "first 3 days free, then 59.88 GEL/year" — a trial and an annual plan this
 * app's checkout does not offer (`useStorePrice`/`PRICES.pro_monthly` is a
 * plain monthly price with no trial wired in here). Printing that line would
 * be a 3.1.2 rejection waiting to happen — a paywall promising money terms
 * the purchase does not honour. The real price and the real
 * SubscriptionTerms disclosure stay exactly where they were.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const modal = read("src/components/home/PlayLimitModal.tsx");
const adOffer = read("src/components/home/ExtraPlaysOffer.tsx");

describe("the card behind the Play button", () => {
  it("leads with what happened, then that there is a choice", () => {
    expect(modal).toMatch(/\{t\("playLimit\.limitReached"\)\}/);
    expect(modal).toMatch(/\{t\("playLimit\.chooseHow"\)\}/);
  });

  it("and the old chrome is gone: no hourglass, no top-of-card countdown, no corner X", () => {
    expect(modal).not.toMatch(/hourglassIcon/);
    expect(modal).not.toMatch(/PlayLimitCountdown/);
    expect(modal).not.toMatch(/aria-label="close"/);
    // The gamepad stood for PRO before the crown illustration did.
    expect(modal).not.toMatch(/gamepadIcon/);
  });
});

describe("the PRO card", () => {
  it("wears the crown above it and the mint-to-teal gradient the design uses", () => {
    expect(modal).toMatch(/crownDecorIcon/);
    expect(modal).toMatch(/linear-gradient\(135deg, #d1f1e2 0%, #f9ffe2 100%\)/);
    expect(modal).toMatch(/linear-gradient\(180deg, #88e2ca 0%, #4accad 58%, #31c3a1 100%\)/);
  });

  it("keeps the real price and the real renewal disclosure", () => {
    // Both survive verbatim from before the reskin — this is the guard
    // against someone matching the Figma reference's trial copy instead.
    expect(modal).toMatch(/\{proPrice\.display\}/);
    expect(modal).toMatch(/\{monthLabel\(\)\}/);
    expect(modal).toMatch(/<SubscriptionTerms className="mt-3 text-center" onNavigate=\{onClose\} \/>/);
    // And no borrowed promise of a trial or a yearly price this checkout
    // does not sell.
    expect(modal).not.toMatch(/free trial|3 days free|59\.88/i);
  });

  it("and the button says PRO, not a claim about being free", () => {
    expect(modal).toMatch(/\{t\("playLimit\.becomePro"\)\}/);
  });
});

describe("the give-up card replaces the corner X", () => {
  it("is a real close button, not decoration", () => {
    const giveUp = modal.slice(modal.indexOf("The close button, honestly labelled"));
    expect(giveUp).toMatch(/onClick=\{onClose\}/);
    expect(giveUp).toMatch(/brokenHeartIcon/);
    expect(giveUp).toMatch(/\{t\("playLimit\.giveUp"\)\}/);
  });

  it("says how long the wait actually is, ticking", () => {
    expect(modal).toMatch(/const giveUpClock = usePlayLimitClock\(resetsAt, timeUntilNextPlay\);/);
    expect(modal).toMatch(/\{t\("playLimit\.giveUpBody", \{ time: giveUpClock \}\)\}/);
    // Only when there is something to say — no timestamp is not "in 0:00".
    expect(modal).toMatch(/\{giveUpClock && \(/);
  });

  it("the clock survives as a hook now that the giant top-of-card number is gone", () => {
    expect(existsSync(join(process.cwd(), "src/hooks/usePlayLimitClock.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/components/home/PlayLimitCountdown.tsx"))).toBe(false);
  });
});

describe("the watch-ad card", () => {
  it("is the whole button, dark, with the clapperboard spilling over its top", () => {
    expect(adOffer).toMatch(/watchAdIcon/);
    expect(adOffer).toMatch(/bg-\[#5e5e5e\]/);
    expect(adOffer).toMatch(/onClick=\{\(\) => void buy\(adPack, "ad"\)\}/);
  });

  it('carries the "+1" heart pill instead of a separate "Watch" label', () => {
    expect(adOffer).toMatch(/heartIcon/);
    expect(adOffer).toMatch(/>\s*\+1\s*<\/>/);
    expect(adOffer).not.toMatch(/t\("playLimit\.adRowAction"\)/);
  });

  it("and its title wraps instead of pushing the pill off the card", () => {
    // A flex child's default min-width is its own unwrapped content, not 0 —
    // without this a longer translation shoves the "+1" pill past the
    // card's own edge instead of wrapping to a second line.
    expect(adOffer).toMatch(/className="min-w-0 flex-1 font-display text-\[\d+px\] font-extrabold uppercase/);
  });
});

describe("the assets are really there, not just imported", () => {
  // A broken import here is a blank spot on the one screen every non-PRO
  // player who runs out eventually sees.
  for (const asset of ["broken-heart.png", "crown-decor.png", "watch-ad.png", "heart.png"]) {
    it(`playlimit/${asset} exists`, () => {
      expect(existsSync(join(process.cwd(), `src/assets/playlimit/${asset}`))).toBe(true);
    });
  }

  it("and the retired hourglass does not linger unused", () => {
    expect(existsSync(join(process.cwd(), "src/assets/playlimit/hourglass.png"))).toBe(false);
  });
});

describe("in the reader's language", () => {
  for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
    it(`${lang} has the new copy`, () => {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["chooseHow", "giveUp", "giveUpBody"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`${key}: "[^"]+",`));
      }
    });
  }
});
