import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { selectionKey, togglePicked, type SelectedItem } from "@/components/team/CategoryPickerModal";

/**
 * Picking more than one category at a time.
 *
 * The picker held a single selection and offered two buttons for it — "select
 * now", which set the round's category, and "add to queue". Lining up several
 * categories meant opening the sheet once per category. It takes as many as
 * you tap now, and adds them in the order you tapped them.
 */
const cat = (id: string): SelectedItem => ({ type: "category", id, name: id });
const trivia = (id: string): SelectedItem => ({ type: "trivia", id, name: id });
const random: SelectedItem = { type: "random" };

describe("what counts as the same pick", () => {
  it("tells two categories apart", () => {
    expect(selectionKey(cat("a"))).not.toBe(selectionKey(cat("b")));
  });

  it("tells a category apart from a trivia with the same id", () => {
    // Both are uuids from different tables and could collide.
    expect(selectionKey(cat("same-id"))).not.toBe(selectionKey(trivia("same-id")));
  });

  it("gives random a key of its own even with no id", () => {
    expect(selectionKey(random)).toBe("random:-");
  });
});

describe("toggling picks", () => {
  it("adds a category that was not picked", () => {
    expect(togglePicked([], cat("a")).map(selectionKey)).toEqual(["category:a"]);
  });

  it("keeps the order things were picked in", () => {
    // The queue is built in this order, so it is not incidental.
    const picked = [cat("a"), cat("b"), cat("c")].reduce(togglePicked, [] as SelectedItem[]);
    expect(picked.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("takes a category back off when tapped again", () => {
    const picked = togglePicked([cat("a"), cat("b")], cat("a"));
    expect(picked.map((p) => p.id)).toEqual(["b"]);
  });

  it("removes the right one when a category and a trivia share an id", () => {
    const picked = togglePicked([cat("x"), trivia("x")], cat("x"));
    expect(picked.map(selectionKey)).toEqual(["trivia:x"]);
  });

  it("mixes categories, trivias and random in one selection", () => {
    const picked = [cat("a"), trivia("t"), random].reduce(togglePicked, [] as SelectedItem[]);
    expect(picked).toHaveLength(3);
    expect(picked.map(selectionKey)).toEqual(["category:a", "trivia:t", "random:-"]);
  });

  it("does not mutate the list it was given", () => {
    const before: SelectedItem[] = [cat("a")];
    togglePicked(before, cat("b"));
    expect(before).toHaveLength(1);
  });

  it("empties back out when everything is untapped", () => {
    const picked = [cat("a"), cat("b")].reduce(togglePicked, [] as SelectedItem[]);
    const emptied = [cat("a"), cat("b")].reduce(togglePicked, picked);
    expect(emptied).toEqual([]);
  });
});

describe("the Add button counts only when the count is news", () => {
  const modal = readFileSync(
    join(process.cwd(), "src/components/team/CategoryPickerModal.tsx"),
    "utf8",
  );

  it("no (1) — the button only appears once something is picked", () => {
    // On the first screen the four tiles are one choice, so it was always
    // "(1)": a number telling the player what they had just done.
    expect(modal).toMatch(/\{selectedItems\.length > 1 \? ` \(\$\{selectedItems\.length\}\)` : ""\}/);
    expect(modal).not.toMatch(/cpAddBtn"\)\} \(\{selectedItems\.length\}\)/);
  });

  it("but it still counts a real multi-pick", () => {
    // Library and My Trivias take several, and there the number is worth
    // having — so this is not "drop the count", it is "drop the 1".
    expect(modal.match(/togglePick\(/g)?.length ?? 0).toBeGreaterThan(2);
    expect(modal).toMatch(/selectedItems\.length > 1/);
  });
});
