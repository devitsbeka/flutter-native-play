import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The display face must be one we are allowed to ship.
 *
 * The app shipped TA Solivare Bold inside the binary and served it from the
 * website as an installable OTF. Its own name table read "Copyright (c) 2025
 * by Tural Alisoy. All rights reserved.", and no licence for it existed
 * anywhere in this repository — not an OFL.txt, not a receipt, not a note.
 * App embedding is a separate licence tier from desktop or webfont use, so
 * that was a live App Store guideline 5.2 exposure sitting in every build.
 *
 * It was replaced with Google Sans, which is SIL Open Font License 1.1
 * (github.com/googlefonts/googlesans). This test is here so it cannot come
 * back by accident, and so the licence text keeps shipping beside the font,
 * which the OFL requires.
 */
const root = process.cwd();
const FONT_DIR = join(root, "public/fonts");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe("the display font is one we may ship", () => {
  it("ships no TA Solivare font file", () => {
    const offenders = walk(FONT_DIR).filter((f) => /solivare/i.test(f));
    expect(
      offenders,
      "an unlicensed font is back in public/fonts",
    ).toEqual([]);
  });

  it("names no TA Solivare family anywhere that sets a font", () => {
    // src/ AND the Tailwind config. The config is here because it is exactly
    // what the first sweep missed: `font-hero` and `font-display` still listed
    // the old family there, so the built CSS shipped it while every component
    // looked clean.
    const files = [...walk(join(root, "src")), join(root, "tailwind.config.ts"), join(root, "index.html")];
    const offenders: string[] = [];
    for (const file of files) {
      if (!/\.(ts|tsx|css|html)$/.test(file)) continue;
      if (file.endsWith("displayFontIsLicensed.test.ts")) continue;
      const text = readFileSync(file, "utf8");
      // A font-family reference, not the historical note in a comment.
      if (/["']TASolivare["']/.test(text)) offenders.push(file.replace(root + "/", ""));
    }
    expect(
      offenders,
      "these still set TASolivare as a font-family",
    ).toEqual([]);
  });

  it("self-hosts the display weight with Georgian coverage", () => {
    const css = readFileSync(join(root, "src/index.css"), "utf8");

    expect(css, "the display token no longer points at Google Sans").toMatch(
      /--font-display:\s*'Google Sans'/,
    );

    for (const subset of ["latin", "latin-ext", "georgian"]) {
      const file = `GoogleSans-Bold-${subset}.woff2`;
      expect(existsSync(join(FONT_DIR, file)), `${file} is missing`).toBe(true);
      expect(css, `${file} is not referenced by an @font-face`).toContain(file);
    }

    // Mkhedruli and Mtavruli both. toMtavruli() uppercases Georgian by
    // codepoint into U+1C90-1CBF, so a face without that range renders the
    // app's own uppercase Georgian as tofu.
    expect(css, "the Georgian subset does not cover Mkhedruli").toMatch(/U\+10A0-10FF/);
    expect(css, "the Georgian subset does not cover Mtavruli").toMatch(/U\+1C90-1CBA/);
  });

  it("ships the licence text the OFL requires", () => {
    const ofl = join(FONT_DIR, "GoogleSans-OFL.txt");
    expect(existsSync(ofl), "GoogleSans-OFL.txt is missing").toBe(true);
    expect(readFileSync(ofl, "utf8")).toContain("SIL OPEN FONT LICENSE");
  });

  it("does not also fetch the self-hosted weight from the CDN", () => {
    // Two @font-face rules for the same family and weight race each other,
    // and the point of self-hosting is that a title never waits on a
    // third-party request.
    const html = readFileSync(join(root, "index.html"), "utf8");
    const link = html.match(/Google\+Sans:wght@([\d;]+)/);
    expect(link, "the Google Sans CDN request is gone entirely").not.toBeNull();
    expect(link![1].split(";"), "weight 700 is self-hosted and must not also be fetched").not.toContain("700");
  });
});
