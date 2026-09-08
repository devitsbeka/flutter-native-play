/**
 * Making a trivia is not something you sit and watch.
 *
 * `generate-custom-quiz` is an AI call of unknown length, and the whole of
 * it used to be spent inside the create wizard behind a progress bar that
 * was invented on a timer — nothing downstream reports progress, so the bar
 * counted `prev + Math.random() * 15` every 500ms and stopped at 90 until
 * the call happened to return. Closing the wizard threw the work away with
 * nothing to show for it: no trivia, no error, no trace (owner: "i wait too
 * long and if i cancel it shows nothing, disappears").
 *
 * The request outlives the screen now. The wizard hands it to
 * TriviaCreationContext and closes; the questions are generated, saved and
 * the lists refreshed whether or not anybody is watching. What the player
 * gets is a sentence saying it is coming, and a Create button that carries
 * the state until it lands.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const context = read("src/contexts/TriviaCreationContext.tsx");
const modal = read("src/components/social/TriviaOnItsWayModal.tsx");
// The one the rooms page's Create button actually opens (via
// CreateTriviaTypeModal), and the one the report was about. CreateQuizModal
// is the other door into the same generator and gets the same treatment.
const blind = read("src/components/team/CreateBlindTriviaModal.tsx");
const wizard = read("src/components/social/CreateQuizModal.tsx");
const page = read("src/pages/TeamV2.tsx");
const bar = read("src/components/team/UnifiedFiltersBar.tsx");

describe("the work outlives the screen that started it", () => {
  it("the generation and the save both live in the context", () => {
    expect(context).toMatch(/supabase\.functions\.invoke\("generate-custom-quiz"/);
    expect(context).toMatch(/from\("user_quiz_posts"\)\.insert\(\[/);
    // And the list is refreshed from there, since the wizard is long gone.
    for (const key of ["my-quiz-posts", "my-trivias-for-room"]) {
      expect(context).toContain(`"${key}"`);
    }
  });

  it("and the create-trivia modal only hands over and closes", () => {
    expect(blind).toMatch(/const handOffGeneration = \(\) => \{/);
    expect(blind).toMatch(/startTriviaGeneration\(\{/);
    expect(blind).toMatch(/onTriviaHandedOff\?\.\(\);\s*\n\s*void handleClose\(\);/);
    expect(blind).toMatch(/onClick=\{handOffGeneration\}/);
    expect(blind).not.toMatch(/onClick=\{generateQuestions\}/);
    // And the page opens the card off the same signal.
    expect(page).toMatch(/onTriviaHandedOff=\{\(\) => setShowTriviaOnItsWay\(true\)\}/);
  });

  it("and the other door into the generator does the same", () => {
    expect(wizard).toMatch(/const handOffGeneration = \(\) => \{/);
    expect(wizard).toMatch(/startTriviaGeneration\(\{/);
    expect(wizard).toMatch(/onTriviaHandedOff\?\.\(\);\s*\n\s*handleClose\(\);/);
    // The blocking button is gone: no percentage counted on the generate
    // button any more, because there is nothing to count.
    expect(wizard).toMatch(/onClick=\{handOffGeneration\}/);
    expect(wizard).not.toMatch(/onClick=\{generateQuestions\}/);
  });

  it("and a failure still reaches the player, who is elsewhere by then", () => {
    // Silence here would be the original bug wearing a different hat.
    const body = context.slice(context.indexOf("} catch (err)"));
    expect(body).toMatch(/variant: "destructive"/);
  });
});

describe("one trivia at a time", () => {
  it("the context refuses a second while one runs", () => {
    expect(context).toMatch(/if \(!user \|\| running\.current\) return false;/);
    // State drives the button; a ref is what actually stops two presses in
    // the same tick, which state cannot.
    expect(context).toMatch(/const running = useRef\(false\);/);
    expect(context).toMatch(/busy: job !== null/);
  });

  it("and both Create buttons say so and stand down", () => {
    // The page's own button (md+) and the filter bar's (mobile).
    expect(page).toMatch(/const \{ busy: triviaBusy \} = useTriviaCreation\(\);/);
    expect(page).toMatch(/triviaBusy\s*\n?\s*\? \{ disabled: true \}/);
    expect(page).toMatch(/t\("extra\.triviaCreatingBtn"\)/);
    expect(page).toMatch(/addBusy=\{triviaBusy\}/);
    expect(bar).toMatch(/addBusy = false,/);
    expect(bar).toMatch(/addBusy \? \{ disabled: true \} : instantTouchProps\(onAddClick\)/);
  });

  it("and the modals' own buttons are refused too", () => {
    expect(blind).toMatch(/disabled=\{triviaBusy\}/);
    expect(wizard).toMatch(/disabled=\{triviaBusy\}/);
  });
});

describe("what the player sees instead of the wait", () => {
  it("a centred card that says it is coming, and closes itself", () => {
    expect(modal).toMatch(/export const SHOW_MS = 2000;/);
    expect(modal).toMatch(/const timer = setTimeout\(onClose, SHOW_MS\);/);
    expect(modal).toMatch(/return \(\) => clearTimeout\(timer\);/);
    expect(modal).toMatch(/flex items-center justify-center/);
  });

  it("with a way out that is not a cancel", () => {
    // The × dismisses the card; nothing about the job changes. Prose still
    // says so, so only the code is checked for a way to call anything off.
    expect(modal).toMatch(/aria-label=\{t\("common\.close"\)\}/);
    const code = modal
      .split("\n")
      .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
      .join("\n");
    expect(code).not.toMatch(/abort|cancel/i);
  });

  it("wearing the face of the thing being made", () => {
    expect(modal).toMatch(/import triviaBuzzer from "@\/assets\/trivia-buzzer\.png";/);
    expect(modal).toMatch(/import iconHouseParty from "@\/assets\/house-party\.png";/);
    expect(modal).toMatch(/trivia: triviaBuzzer,/);
    expect(modal).toMatch(/party: iconHouseParty,/);
  });

  it("and the page opens it when the wizard hands off", () => {
    expect(page).toMatch(/<TriviaOnItsWayModal/);
    expect(page).toMatch(/onTriviaHandedOff=\{\(\) => setShowTriviaOnItsWay\(true\)\}/);
  });

  it("in the reader's language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of [
        "triviaOnItsWayTitle",
        "partyOnItsWayTitle",
        "triviaOnItsWayBody",
        "triviaCreatingBtn",
      ]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`${key}: "[^"]+",`));
      }
    }
  });

  it("and the saved row matches what the in-modal save wrote", () => {
    // A trivia made in the background must be indistinguishable from one
    // made in front of you, or the list grows two kinds of card.
    expect(context).toMatch(/iconSlug: q\.icon_slug \|\| null,/);
    expect(context).toMatch(/incorrect_answers\?\.length === 1 \? "true_false" : "4_answers"/);
    expect(context).toMatch(/is_blind: true,/);
    expect(context).toMatch(/COVER_GRADIENTS\[Math\.floor\(Math\.random\(\)/);
  });

  it("and reuses the app's own 'it landed' pair rather than a second one", () => {
    expect(context).toMatch(/t\("extra\.triviaReady"\)/);
    expect(context).toMatch(/t\("extra\.triviaReadyDesc", \{ count: generated\.length, title \}\)/);
  });
});
