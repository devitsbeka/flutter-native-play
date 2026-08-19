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

  it("blocks the fast obfuscations a reviewer would try", () => {
    // spelled out with spaces / hyphens
    expect(containsBlockedText("f u c k")).toBe(true);
    expect(containsBlockedText("f-u-c-k this room")).toBe(true);
    expect(containsBlockedText("ყ ლ ე")).toBe(true);
    // stretched letters
    expect(containsBlockedText("fuuuck")).toBe(true);
    expect(containsBlockedText("shiiit")).toBe(true);
    // plurals / inflections
    expect(containsBlockedText("bitches")).toBe(true);
    expect(containsBlockedText("retarded")).toBe(true);
    // russian
    expect(containsBlockedText("сука блядь")).toBe(true);
    expect(containsBlockedText("пиздец")).toBe(true);
  });

  it("does not block legitimate trivia subjects", () => {
    expect(containsBlockedText("Nazi Germany quiz")).toBe(false);
    expect(containsBlockedText("Adolf Hitler")).toBe(false);
    expect(containsBlockedText("Coon Rapids, Minnesota")).toBe(false);
  });

  it("survives the new rules without false positives", () => {
    expect(containsBlockedText("bookkeeper quiz")).toBe(false); // doubles kept
    expect(containsBlockedText("a b c quiz")).toBe(false); // clean spelled run
    expect(containsBlockedText("raccoons of Georgia")).toBe(false); // suffix strip on innocent word
    expect(containsBlockedText("assassins creed")).toBe(false);
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
