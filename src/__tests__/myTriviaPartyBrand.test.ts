/**
 * The party's name is in its logo, and its card carries its own name.
 *
 * The MyTrivia Party brand was drawn as a generic group-of-people icon with
 * the words "My Trivia Party" set beside it — two things saying the same
 * thing, neither of them the logo. There is a wordmark now, and it says the
 * name itself (owner: "when you replace logo make sure you don't show text
 * 'my trivia party', logo includes that text already").
 *
 * On the card that meant the name was being said three times over: once
 * across the gradient header, once in the strip below, and once more by the
 * icon. The header wears the logo; the strip names THIS party — the trivia
 * the player actually wrote — and "Untitled" when they never named it
 * (owner: "when my trivia party is untitled, say untitled").
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
const logo = read("src/components/brand/MyTriviaPartyLogo.tsx");
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

  it("and the card asks for it rather than printing post.title raw", () => {
    expect(tab).toMatch(/\{triviaDisplayTitle\(post\.title, t\)\}/);
  });
});

describe("the wordmark replaces the words, it does not join them", () => {
  it("carries the name as its alt text, since the name is in the picture", () => {
    expect(logo).toMatch(/alt="MyTrivia Party"/);
    expect(logo).toMatch(/height = 28/);
    // Sized by height so the width follows the artwork, not the other way.
    expect(logo).toMatch(/style=\{\{ height \}\}/);
    expect(logo).toMatch(/w-auto/);
  });

  it("the card's header wears it instead of spelling the name out", () => {
    expect(tab).toMatch(/<MyTriviaPartyLogo height=\{40\}/);
    // And the strip below no longer repeats the brand: it names the party.
    // (A standalone trivia card still prints its own title in its header —
    // that one IS the trivia's name, so this is scoped to the brand label.)
    expect(tab).not.toMatch(/\{t\("extra\.myTriviaPartyLabel"\)\}/);
  });

  it("and the create chooser's tile has no caption under it", () => {
    expect(chooser).toMatch(/\{ key: "personal", logo: true, wide: true/);
    expect(chooser).toMatch(/card\.logo \? \(/);
    // The other two tiles keep icon-and-caption.
    expect(chooser).toMatch(/title: t\("extra\.triviaLabel"\)/);
    expect(chooser).toMatch(/title: t\("extra\.collectionLabel"\)/);
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
