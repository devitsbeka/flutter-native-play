import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { stripEmojisExceptFlags } from "@/utils/stripEmojisExceptFlags";

/**
 * Some translations are half a sentence, and their edge space is the joint.
 *
 * `t()` runs every string through `stripEmojisExceptFlags`, which used to end
 * in a bare `.trim()`. That trim is there for emoji removal — "🎉 Congrats"
 * must not come back as " Congrats" — but it also ate the space an author had
 * typed on purpose, so `<span>{nickname}</span><span>{t("…invitesYou")}</span>`
 * rendered as "Bekaგიწვევთ" and "Answer: " + answer as "Answer:Paris".
 *
 * Two halves to this: the function keeps the padding it was given, and the
 * locale files keep writing it.
 */
describe("stripEmojisExceptFlags", () => {
  it("keeps a leading space the author typed", () => {
    expect(stripEmojisExceptFlags(" invites you to play")).toBe(" invites you to play");
  });

  it("keeps a trailing space the author typed", () => {
    expect(stripEmojisExceptFlags("Answer: ")).toBe("Answer: ");
  });

  it("keeps both", () => {
    expect(stripEmojisExceptFlags(" about? ")).toBe(" about? ");
  });

  it("still drops the space a removed emoji leaves behind", () => {
    expect(stripEmojisExceptFlags("🎉 Congrats")).toBe("Congrats");
    expect(stripEmojisExceptFlags("Congrats 🎉")).toBe("Congrats");
    expect(stripEmojisExceptFlags("🎉 Congrats 🎉")).toBe("Congrats");
  });

  it("keeps the author's padding around an emoji it removes", () => {
    expect(stripEmojisExceptFlags(" 🎉 Congrats ")).toBe(" Congrats ");
  });

  it("keeps flags, which are not decoration", () => {
    expect(stripEmojisExceptFlags("🇬🇪 Georgia")).toBe("🇬🇪 Georgia");
  });

  it("leaves an all-whitespace string empty rather than doubling it", () => {
    expect(stripEmojisExceptFlags("   ")).toBe("");
  });

  it("collapses runs left in the middle", () => {
    expect(stripEmojisExceptFlags("Well  done")).toBe("Well done");
  });
});

/**
 * The keys whose padding is load-bearing, and which edge carries it.
 *
 * Each is concatenated against a value in the markup with nothing between
 * them, so dropping the space here glues two words together on screen. Listed
 * per key rather than swept for, because a stray space anywhere else is a typo
 * and this file should not bless it.
 *
 * `cqmTitleAbout` is the one that is deliberately absent: it is a separate
 * word in English and German (" about?") but a case ending in Georgian
 * ("-ზე?"), which attaches to the subject with no space and is right to. Only
 * separations that hold in every language belong here — the function above is
 * what protects the rest.
 */
const PADDED_KEYS: Record<string, "leading" | "trailing"> = {
  sidebarInvitesYou: "leading", // <span>{nickname}</span><span>{t(…)}</span>
  crYourScore: "trailing", // <span>{t(…)}</span><span>{score}</span>
  crAnswer: "trailing", // {t(…)}{correct_answer}
  tvCodePrefix: "trailing", // <span>{t(…)}</span><span>{code}</span>
};

describe("locale strings that are half a sentence", () => {
  const dir = join(process.cwd(), "src/locales");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "index.ts");

  it("finds the locale files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const source = readFileSync(join(dir, file), "utf8");

    for (const [key, edge] of Object.entries(PADDED_KEYS)) {
      const match = source.match(new RegExp(`^\\s*${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m"));
      if (!match) continue; // not every language defines every key

      it(`${file}: ${key} keeps its ${edge} space`, () => {
        const value = match[1];
        const has = edge === "leading" ? /^\s/.test(value) : /\s$/.test(value);
        expect(
          has,
          `${file} → ${key} is "${value}". It is joined straight onto a value in ` +
            `the markup, so it needs a ${edge} space or the two run together.`,
        ).toBe(true);
      });
    }
  }
});
