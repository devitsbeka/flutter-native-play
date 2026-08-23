import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A picture question shows a picture, and never its own text.
 *
 * Every stem on an image question in this bank is generic — "Which animal is
 * shown?", "Which bridge is shown?", "Which brand's logo is this?" — because
 * the picture IS the question. So the text carries no information at all, and
 * printing it turns a deliberately wordless card into a text one.
 *
 * The card and the TV screen both used to fall back to that text when the
 * image failed to load, on the reasoning that it was better than an empty
 * card. It is not: four brand names under "Which brand's logo is this?" and
 * no picture is not a question anyone can answer, it just looks like one.
 * Both now say the picture did not load, which is at least true.
 *
 * These pin it in both places, because they are separate markup and the
 * fallback was written twice.
 */

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("picture questions never fall back to their own text", () => {
  it("the quiz card treats hideQuestionText as absolute", () => {
    const source = read("src/components/ui/quiz-question-card.tsx");

    const assignment = source.match(/const effectiveHideText = ([^;]+);/);
    expect(assignment, "expected effectiveHideText to be derived").not.toBeNull();
    expect(
      assignment![1],
      "hideQuestionText must mean hidden — an imageFailed escape hatch puts " +
        "the stem back on a card that is supposed to have none",
    ).toBe("hideQuestionText");
  });

  it("the quiz card says the picture failed instead", () => {
    const source = read("src/components/ui/quiz-question-card.tsx");
    expect(
      source,
      "a failed image must leave something on the card, or it is a white box " +
        "with four options under it",
    ).toContain("extra.questionImageFailed");
  });

  it("the TV screen says the same, rather than printing the stem", () => {
    const source = read("src/components/tv/TVQuestionScreenV4.tsx");

    const fallback = source.match(/tvImageFailed \? \(([\s\S]*?)\) : \(/);
    expect(fallback, "expected the TV image-failure branch").not.toBeNull();
    expect(
      fallback![1],
      "the TV fallback must not render the question's own text",
    ).not.toMatch(/currentQuestion\.question_text/);
    expect(fallback![1]).toContain("extra.questionImageFailed");
  });

  it("every language has something to say when a picture fails", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const source = read(`src/locales/${lang}.ts`);
      expect(
        source,
        `${lang} is missing questionImageFailed — a missing key renders as the ` +
          "key itself, which is worse than the stem was",
      ).toContain("questionImageFailed:");
    }
  });
});
