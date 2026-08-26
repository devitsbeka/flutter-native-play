import { describe, it, expect } from "vitest";
import { georgianDative } from "@/utils/georgianName";

/**
 * The invite screen says "<name> MyTrivia-ზე მეგობრობა სურს" — <name> wants
 * friendship on MyTrivia — and "სურს" governs the dative, so the name in
 * front of it has to carry the ending. The design shows "TriviaMaste-ს"; the
 * sentence is wrong without it.
 */
describe("putting a nickname in the Georgian dative", () => {
  it("hyphenates a Latin name, which is the convention for foreign words", () => {
    expect(georgianDative("TriviaMaste")).toBe("TriviaMaste-ს");
    expect(georgianDative("Beka")).toBe("Beka-ს");
  });

  it("joins the ending to a name written in Georgian", () => {
    // Hyphenating a Georgian word would be wrong: ნინო becomes ნინოს.
    expect(georgianDative("ნინო")).toBe("ნინოს");
    expect(georgianDative("გიორგი")).toBe("გიორგის");
  });

  it("leaves a Georgian name that already ends in ს alone", () => {
    // ლუკას is already the dative; ლუკასს would be a stutter.
    expect(georgianDative("ლუკას")).toBe("ლუკას");
  });

  it("still hyphenates a Latin name ending in s, which is a different letter", () => {
    // Latin "s" is not Georgian "ს", and "Lukas-ს" is how a foreign name
    // takes the ending. This assertion had it the other way round at first.
    expect(georgianDative("Lukas")).toBe("Lukas-ს");
  });

  it("does nothing with an empty or blank name", () => {
    expect(georgianDative("")).toBe("");
    expect(georgianDative("   ")).toBe("");
  });

  it("works on names in a third script, which get the hyphen", () => {
    expect(georgianDative("Ярослав")).toBe("Ярослав-ს");
    expect(georgianDative("さくら")).toBe("さくら-ს");
  });
});
