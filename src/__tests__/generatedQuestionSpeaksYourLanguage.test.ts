import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LANGUAGES } from "@/locales";
import {
  isTrueFalseWord,
  isTrueWord,
  trueFalseWords,
  TRUE_WORD_KA,
  FALSE_WORD_KA,
} from "@/utils/trueFalse";

/**
 * A question the app writes for you comes back in the language you read.
 *
 * `generate-single-question` ended every prompt with "LANGUAGE: Georgian
 * only" and took no language, and no caller passed one. So an English party
 * opened on the English starter pack (config/partyStarterPack) and turned
 * Georgian the moment change-question was pressed — the question, the four
 * answers, all of it (owner: "i have selected USA ... when i clicked change
 * question it shows new question in georgian").
 *
 * Both halves are asserted here: the callers say which language, and the
 * function is built around the answer rather than around Georgian.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const FN = read("supabase/functions/generate-single-question/index.ts");
const QUIZ_FN = read("supabase/functions/generate-custom-quiz/index.ts");
const SHARED = read("supabase/functions/_shared/questionLanguage.ts");
const PARTY = read("src/components/team/GameStylePersonalTrivia.tsx");
const EDITOR = read("src/components/social/GameStyleQuestionEditor.tsx");

describe("every caller says which language", () => {
  it("the trivia editor passes it", () => {
    const call = EDITOR.slice(
      EDITOR.indexOf("invoke('generate-single-question'"),
      EDITOR.indexOf("if (error) throw error", EDITOR.indexOf("invoke('generate-single-question'")),
    );
    expect(call).toMatch(/\blanguage,/);
  });

  /**
   * The party editor no longer asks at all.
   *
   * Change-question draws from config/partyStarterPack instead — see
   * partyChangeQuestionUsesTheLibrary.test.ts. That closes this bug harder
   * than passing the parameter did: a pool chosen by `language` cannot come
   * back in the wrong one, whatever a function defaults to.
   */
  it("the party editor asks nobody, and draws in the reader's language", () => {
    expect(PARTY).not.toMatch(/invoke\('generate-single-question'/);
    expect(PARTY).toMatch(/partyStarterPool\(language\)/);
  });

  it("and reads it from the language context rather than guessing", () => {
    expect(PARTY).toMatch(/const \{ t, language \} = useLanguage\(\)/);
    expect(EDITOR).toMatch(/const \{ t, language \} = useLanguage\(\)/);
  });
});

describe("the function is built around that language", () => {
  it("knows the seven the app ships, in one table both generators read", () => {
    for (const { code } of LANGUAGES) {
      expect(SHARED, `LANGUAGE_NAMES is missing ${code}`).toMatch(
        new RegExp(`^\\s+${code}: "`, "m"),
      );
    }
    // Neither function keeps a copy of it — two tables is how one of them
    // ends up a language short.
    for (const source of [FN, QUIZ_FN]) {
      expect(source).toMatch(/from "\.\.\/_shared\/questionLanguage\.ts"/);
      expect(source).not.toMatch(/const LANGUAGE_NAMES/);
    }
  });

  it("falls back to Georgian for a caller that says nothing", () => {
    // An old client keeps the behaviour it has always had.
    expect(SHARED).toMatch(/export const FALLBACK_LANGUAGE = "ka";/);
    for (const source of [FN, QUIZ_FN]) {
      expect(source).toMatch(/const lang = knownLanguage\(requestedLanguage\);/);
    }
  });

  it("no longer pins either prompt to Georgian", () => {
    // At the start of a line is the prompt; in quotes mid-sentence is the
    // note at the top of the file recording what it used to say.
    expect(FN).not.toMatch(/^LANGUAGE: Georgian only/m);
    expect(FN.match(/LANGUAGE: \$\{name\} only/g)?.length).toBe(2);
    expect(FN).toMatch(/function buildTriviaPrompt\([^)]*lang: string\)/);
    expect(FN).toMatch(/function buildPersonalPrompt\([^)]*lang: string\)/);
  });

  it("keeps the Georgian-only steps behind the Georgian check", () => {
    // verify-georgian-grammar is a Georgian proofreader: handed a Spanish
    // question it would "correct" it into Georgian, which is this same bug
    // one step later. The icon fallback is a table keyed by Georgian words.
    expect(FN).toMatch(/if \(lang === "ka"\) \{\s*\n\s*console\.log\("Verifying Georgian grammar/);
    expect(FN).toMatch(/if \(!iconSlug && mode === "personal" && lang === "ka"\)/);
  });

  it("fact-checks in the language the question was written in", () => {
    expect(FN).toMatch(/language: lang,/);
    expect(FN).not.toMatch(/language: "ka",/);
  });
});

describe("true and false stay the two words every screen knows", () => {
  it("is the Georgian pair for Georgian and the English pair otherwise", () => {
    expect(trueFalseWords("ka")).toEqual({ yes: TRUE_WORD_KA, no: FALSE_WORD_KA });
    for (const { code } of LANGUAGES.filter((l) => l.code !== "ka")) {
      expect(trueFalseWords(code)).toEqual({ yes: "True", no: "False" });
    }
  });

  it("matches what the play screens detect", () => {
    // QuizGameScreenProd, the room, the TV and the controller all ask for
    // (მართალია && მცდარია) || (true && false), lowercased.
    const pairs = [trueFalseWords("ka"), trueFalseWords("es")];
    for (const pair of pairs) {
      const answers = [pair.yes.toLowerCase(), pair.no.toLowerCase()];
      expect(
        (answers.includes("მართალია") && answers.includes("მცდარია")) ||
          (answers.includes("true") && answers.includes("false")),
      ).toBe(true);
    }
  });

  it("recognises its own words, and the one the editor used to write", () => {
    expect(isTrueWord("მართალია")).toBe(true);
    expect(isTrueWord(" True ")).toBe(true);
    expect(isTrueWord("False")).toBe(false);
    expect(isTrueFalseWord("მცდარი")).toBe(true); // one letter short, still a default
    expect(isTrueFalseWord("Paris")).toBe(false);
  });

  it("is what the editor writes and reads, in one place", () => {
    expect(EDITOR).toMatch(/const tf = trueFalseWords\(language\);/);
    expect(EDITOR).toMatch(/const isTrue = isTrueWord\(answer\.text\);/);
    expect(EDITOR).not.toMatch(/answer\.text === "მართალია"/);
    expect(EDITOR).not.toMatch(/text !== "მართალია"/);
  });

  it("and what both functions tell the model to use", () => {
    expect(SHARED).toMatch(/export function trueFalseWords\(lang: string\)/);
    for (const source of [FN, QUIZ_FN]) {
      expect(source).toMatch(/The two answer words are FIXED: "\$\{tf\.yes\}" and "\$\{tf\.no\}"/);
    }
  });
});

describe("the countdown before a solo game", () => {
  const PAGE = read("src/pages/CategoryQuizPage.tsx");

  it("names the category in the player's language", () => {
    // `category` is the static table in src/data/categories.ts, whose names
    // are Georgian for everyone; `categoryTitle` is the same name through
    // category_translations, which this page already computes for its
    // heading. The countdown was reading the raw one.
    expect(PAGE).toMatch(/<p className="font-display text-2xl text-foreground">\{categoryTitle\}<\/p>/);
    expect(PAGE).not.toMatch(/\{category\?\.name \?\? ""\}/);
  });
});

/**
 * The same bug, one function over.
 *
 * `generate-custom-quiz` is the bigger of the two: it writes a whole quiz —
 * ten questions, forty answers and a title — and it said "Generate ALL
 * questions and answers in Georgian (ქართული)" while four player-facing
 * modals called it without a language.
 */
describe("a whole generated quiz", () => {
  const QUIZ_CALLERS = [
    "src/components/team/CreateBlindTriviaModal.tsx",
    "src/components/social/AddRoundToCollectionModal.tsx",
    "src/components/social/CreateQuizModal.tsx",
    "src/components/social/CreateCollectionModal.tsx",
  ];

  it.each(QUIZ_CALLERS)("%s says which language", (path) => {
    const source = read(path);
    const call = source.slice(source.indexOf('invoke("generate-custom-quiz"'));
    expect(call.slice(0, call.indexOf("});"))).toMatch(/\blanguage\b/);
    expect(source).toMatch(/const \{ t, language \} = useLanguage\(\)/);
  });

  it("is written in that language, title included", () => {
    expect(QUIZ_FN).not.toMatch(/Generate ALL questions and answers in Georgian/);
    expect(QUIZ_FN).toMatch(/- Generate ALL questions, answers and the title in \$\{langName\}/);
    expect(QUIZ_FN).toMatch(/"suggestedTitle": "catchy title for this quiz, in \$\{langName\}"/);
    expect(QUIZ_FN).toMatch(/3\. ALL text must be in \$\{langName\}/);
  });

  it("keeps the Georgian proofreader behind the Georgian check", () => {
    expect(QUIZ_FN).toMatch(/if \(lang === "ka"\) \{\s*\n\s*console\.log\("Verifying Georgian grammar/);
  });

  it("fact-checks in the language it wrote", () => {
    expect(QUIZ_FN).toMatch(/language: lang,/);
    expect(QUIZ_FN).not.toMatch(/language: "ka",/);
  });
});

describe("what a player reads outside the app", () => {
  it("a challenge share card is in the challenger's language", () => {
    // A share card has no viewer to ask, so it is the person who made it —
    // the only language this function can know.
    const OG = read("supabase/functions/challenge-og-image/index.ts");
    expect(OG).toMatch(/const CARD_COPY: Record<string, \{ challenge: string; cta: string \}>/);
    for (const { code } of LANGUAGES) {
      expect(OG, `CARD_COPY is missing ${code}`).toMatch(new RegExp(`^\\s+${code}: \\{ challenge:`, "m"));
    }
    expect(OG).toMatch(/\.select\("preferred_language"\)/);
    expect(OG).toMatch(/CARD_COPY\[challenger\?\.preferred_language \?\? "en"\] \?\? CARD_COPY\.en/);
    expect(OG).not.toMatch(/🎯 შეგიძლია დამამარცხო\?\n/);
  });

  it("a gem receipt is in the buyer's language", () => {
    // The line item was already localised; the payment description was the
    // Georgian catalog name from _shared/gems.ts.
    const CHECKOUT = read("supabase/functions/create-gem-checkout/index.ts");
    expect(CHECKOUT).toMatch(/const copy = gemPackCopy\(pack\.gems, language\);/);
    expect(CHECKOUT).toMatch(/description: copy\.description,/);
    expect(CHECKOUT).not.toMatch(/description: pack\.name,/);
  });
});
