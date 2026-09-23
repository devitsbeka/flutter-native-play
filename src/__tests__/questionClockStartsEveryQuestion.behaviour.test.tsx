// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "en" }),
}));

import { QuizQuestionCard } from "@/components/ui/quiz-question-card";

/**
 * The question clock waits for the card to say it can be read. The card is
 * not remounted per question, so a second text-only question has the same
 * imageUrl (none) as the first — and when readiness was keyed on the picture
 * alone, that question never said so. Its clock sat at full time and its
 * opponent never moved until the player answered (found in a walkthrough of
 * build 75). A new question arrives as a new callback; it must be called.
 */
describe("every question starts its clock", () => {
  it("says the second of two text-only questions is ready", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<QuizQuestionCard questionText="Q1" onMediaReady={first} />);
    expect(first).toHaveBeenCalledTimes(1);

    rerender(<QuizQuestionCard questionText="Q2" onMediaReady={second} />);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does not say it again for an ordinary re-render of the same question", () => {
    const ready = vi.fn();
    const { rerender } = render(<QuizQuestionCard questionText="Q1" onMediaReady={ready} />);
    rerender(<QuizQuestionCard questionText="Q1" onMediaReady={ready} state="frozen" />);
    expect(ready).toHaveBeenCalledTimes(1);
  });
});
