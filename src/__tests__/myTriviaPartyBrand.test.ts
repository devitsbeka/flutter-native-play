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
  it("the banner carries the player's own name for it", () => {
    expect(tab).toMatch(/\{triviaDisplayTitle\(post\.title, t\)\}/);
  });

  it("the brand stays where it was, beside the icon", () => {
    expect(tab).toMatch(/\{t\("extra\.myTriviaPartyLabel"\)\}/);
    expect(tab).toMatch(/src=\{iconGroupOfPeople\}/);
  });

  it("and no wordmark was left behind anywhere", () => {
    expect(tab).not.toContain("MyTriviaPartyLogo");
    expect(chooser).not.toContain("MyTriviaPartyLogo");
    // The chooser's tile is an icon with its caption again, like the others.
    expect(chooser).toMatch(/icon: iconGroupOfPeople, title: "My Trivia Party"/);
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

  it("and tapping a party opens it, rather than opening the editor", () => {
    // The pencil is still what edits; the card body is how you go and look.
    expect(tab).toMatch(/onClick=\{\(\) => navigate\(`\/trivia\/\$\{post\.id\}`\)\}/);
    expect(tab).toMatch(/onEdit\(post\); \}\}/);
  });
});
