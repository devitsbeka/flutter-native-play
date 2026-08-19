import { describe, it, expect } from "vitest";
import { containsBlockedText } from "@/utils/contentFilter";

describe("containsBlockedText", () => {
  it("blocks slurs and hard profanity, plain and obfuscated", () => {
    expect(containsBlockedText("fuck this game")).toBe(true);
    expect(containsBlockedText("F.u.c.k this")).toBe(true);
    expect(containsBlockedText("sh1t room")).toBe(true);
    expect(containsBlockedText("N1gger")).toBe(true);
    expect(containsBlockedText("ყლე ოთახი")).toBe(true);
    expect(containsBlockedText("შეყლეების კლუბი")).toBe(true);
    expect(containsBlockedText("ბოზო შენ")).toBe(true);
  });

  it("does not false-positive on ordinary content", () => {
    // The Scunthorpe class: blocked words embedded in innocent longer words
    expect(containsBlockedText("Scunthorpe United")).toBe(false);
    expect(containsBlockedText("Dick Van Dyke Trivia")).toBe(false);
    expect(containsBlockedText("Middlesex history")).toBe(false);
    expect(containsBlockedText("My Trivia Party")).toBe(false);
    expect(containsBlockedText("classic movies quiz")).toBe(false);
    expect(containsBlockedText("ისტორია და გეოგრაფია")).toBe(false);
    expect(containsBlockedText("სახალისო გუნდი")).toBe(false);
  });

  it("treats empty input as clean — emptiness is the caller's validation", () => {
    expect(containsBlockedText("")).toBe(false);
    expect(containsBlockedText("   ")).toBe(false);
    expect(containsBlockedText(null)).toBe(false);
    expect(containsBlockedText(undefined)).toBe(false);
  });
});
