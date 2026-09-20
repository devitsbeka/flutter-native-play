import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A failed AI generation has to say so on the card.
 *
 * "clicking on this refresh button doesn't do anything... now it doesn't do
 * anything at all."
 *
 * It was doing something: `generate-single-question` was answering
 * `{"error":"AI API error: 403"}`, reproduced by calling the deployed
 * function directly with exactly the body the editor sends. The failure was
 * then reported with `toast()` — and `src/lib/toast.ts` suppresses every
 * toast in the app deliberately, so the spinner stopped and nothing else
 * happened.
 *
 * That file names the one case it keeps a toast for: "nothing else on screen
 * explains why an action did nothing, and the player cannot act on it
 * without being told." A generation that silently fails is precisely that,
 * so the reason belongs on the card.
 *
 * A source-level guard, and labelled as one: the editor is a drag-reorderable
 * embla carousel with portals and an icon picker, and standing it up would
 * test the carousel rather than this rule.
 */

const editor = readFileSync(
  "src/components/social/GameStyleQuestionEditor.tsx",
  "utf8",
);

describe("AI question generation", () => {
  it("records which card failed", () => {
    expect(editor).toMatch(/setAiError\(index\)/);
  });

  it("clears the previous failure when trying again", () => {
    const fn = editor.slice(editor.indexOf("const handleGenerateAI"));
    const body = fn.slice(0, fn.indexOf("\n  };"));
    expect(
      body.indexOf("setAiError(null)"),
      "a retry leaves the old error on screen",
    ).toBeGreaterThan(-1);
    expect(
      body.indexOf("setAiError(null)"),
      "the failure is cleared after it is set, not before the attempt",
    ).toBeLessThan(body.indexOf("setAiError(index)"));
  });

  it("puts the reason on screen, not only in a suppressed toast", () => {
    expect(
      editor,
      "the only report of a failed generation is toast(), which " +
        "src/lib/toast.ts drops — the button appears to do nothing",
    ).toMatch(/aiError === index[\s\S]{0,400}ptAIFailed/);
  });

  it("does not show a stale error while a new attempt is running", () => {
    expect(editor).toMatch(/aiError === index && !isGeneratingAI/);
  });
});

describe("the app-wide toast policy", () => {
  it("still suppresses toasts, so nothing here depends on them", () => {
    // If this ever changes, the inline error above becomes a duplicate rather
    // than the only channel — worth knowing, not worth failing over.
    const lib = readFileSync("src/lib/toast.ts", "utf8");
    expect(lib).toMatch(/swallow/);
  });
});
