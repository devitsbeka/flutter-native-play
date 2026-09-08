/**
 * The TV sheet says what it is offering before it asks for a code.
 *
 * Tapping Play on your own trivia or a Trivia Party opens this. It opened
 * straight onto "Open on TV: mytrivia.io/tv" and four empty digit boxes —
 * an instruction and a form, with nothing saying why anyone would want
 * either. So an offer read as a step you had to get past.
 *
 * A title and one line of pitch above it (owner's ask). The title is the
 * lobby's own "Play on TV" — the same three words, already translated seven
 * times, rather than a second string to keep in step with the first.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const sheet = read("src/components/team/TVSetupInline.tsx");

describe("the sheet introduces itself", () => {
  it("a title, reusing the phrase the lobby already translates", () => {
    expect(sheet).toMatch(/\{t\("lobby\.uPlayOnTv"\)\}/);
    // Not a duplicate of the same words under a new key.
    expect(sheet).not.toMatch(/tvSheetTitle/);
  });

  it("and one line saying what it is for", () => {
    expect(sheet).toMatch(/\{t\("extra\.tvSheetPitch"\)\}/);
  });

  it("stacked and centred: the TV on top, the title under it, the pitch under that", () => {
    // The same retro TV the pairing modal wears, so the sheet is
    // recognisable as the TV one before a word of it is read (owner's ask).
    // It sat BESIDE the title first — two lines against a small icon — which
    // read as cramped; centring the whole block and sizing the title and
    // the pitch up a notch is the owner's later ask for a more presentable
    // header.
    expect(sheet).toMatch(/import retroTvIcon from '@\/assets\/retro-tv-colored\.png';/);
    const header = sheet.slice(sheet.indexOf('className="mb-8 flex flex-col items-center text-center"'), sheet.indexOf("{/* Instructions */}"));
    expect(header).toMatch(/src=\{retroTvIcon\}/);
    // Icon first, then the title, then the line under it.
    expect(header.indexOf("retroTvIcon")).toBeLessThan(header.indexOf('t("lobby.uPlayOnTv")'));
    expect(header.indexOf('t("lobby.uPlayOnTv")')).toBeLessThan(header.indexOf('t("extra.tvSheetPitch")'));
    // Not the icon-beside-title row it replaced.
    expect(sheet).not.toMatch(/className="mb-4 flex items-start gap-3"/);
  });

  it("above the instruction and the code, not below them", () => {
    // The order is the point: the reason, then the how.
    const pitch = sheet.indexOf('t("extra.tvSheetPitch")');
    const openOnTv = sheet.indexOf("t('extra.tvOpenOnTV')");
    const code = sheet.indexOf("t('extra.tvEnterCode')");
    expect(pitch).toBeGreaterThan(-1);
    expect(pitch).toBeLessThan(openOnTv);
    expect(pitch).toBeLessThan(code);
  });

  it("only while the code is being asked for, not on the success state", () => {
    // "Connected ✓" needs no sales pitch.
    const input = sheet.indexOf('key="input"');
    const connected = sheet.indexOf('key="connected"');
    expect(connected).toBeGreaterThan(-1);
    expect(sheet.indexOf('t("extra.tvSheetPitch")')).toBeGreaterThan(input);
  });
});

describe("the pitch is written in every language", () => {
  it("all seven, beside the code prompt it sits above", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).toMatch(/\n\s+tvSheetPitch: "[^"]+",/);
      expect(locale, lang).toMatch(/\n\s+tvEnterCode: "[^"]+",/);
    }
  });

  it("and the title is too, since it was already there", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+uPlayOnTv: "[^"]+",/);
    }
  });
});

describe("the header reads as a header, not a footnote", () => {
  const sheet = read("src/components/team/TVSetupInline.tsx");

  it("a bigger TV, a bigger title, a bigger pitch, more air around all three", () => {
    expect(sheet).toMatch(/className="h-20 w-20 shrink-0 object-contain"/);
    expect(sheet).toMatch(/font-display text-\[24px\] font-bold leading-\[30px\] text-\[#402666\]/);
    expect(sheet).toMatch(/mt-2 max-w-\[280px\] text-\[16px\] leading-\[22px\] text-\[#402666\]\/70/);
    // The panel itself gets more room too, not just the text inside it.
    expect(sheet).toMatch(/className="p-6 rounded-2xl bg-white\/50 border border-\[#e8e0f5\]"/);
  });
});
