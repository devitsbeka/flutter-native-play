import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Accepting a friend request must spin the button that was pressed.
 *
 * A friend request card carries two buttons, Accept and Decline. The spinner
 * on each was gated on `actionLoading === notification.id` — a flag the
 * parent screens set to the notification being acted on. That says *which
 * row*, never *which button*, so pressing Accept put a spinner on Decline as
 * well: two buttons appearing to work at once, on a request that has one
 * answer.
 *
 * Both screens that render this card passed the same flag, so the fix belongs
 * in the card: it is the only place that knows which of its own buttons was
 * hit. Disabling stays shared — the other button must not be pressable while
 * the first is in flight — and only the spinner is narrowed.
 */
const card = readFileSync(
  join(process.cwd(), "src/components/notifications/CompactNotificationCard.tsx"),
  "utf8"
);

/** The `hasDualActions` block: the Accept/Decline pair and nothing else. */
function dualActionBlock(): string {
  const block = card.match(/\{hasDualActions && \([\s\S]*?\n {10}\)\}/);
  expect(block, "expected the accept/decline button pair").not.toBeNull();
  return block![0];
}

describe("the accept/decline pair", () => {
  const block = dualActionBlock();

  it("remembers which button was pressed", () => {
    expect(card, "the card must track the action, not just the notification")
      .toMatch(/const \[pressedAction, setPressedAction\] = useState/);
    expect(card).toMatch(/setPressedAction\("accept"\)/);
    expect(card).toMatch(/setPressedAction\("decline"\)/);
  });

  it("spins only the pressed button", () => {
    // The exact bug: a spinner gated on isLoading alone spins on whichever
    // button it happens to be attached to.
    const spinnerGates = block.match(/\{isLoading[^?]*\?/g) ?? [];
    expect(spinnerGates.length, "expected a gate on each button").toBe(2);
    expect(block).toMatch(/isLoading && pressedAction === "accept" \?/);
    expect(block).toMatch(/isLoading && pressedAction === "decline" \?/);
    for (const gate of spinnerGates) {
      expect(gate, "a bare isLoading gate spins both buttons at once")
        .toMatch(/pressedAction ===/);
    }
  });

  it("still disables both while one is in flight", () => {
    // Narrowing the spinner must not make the other button pressable — a
    // request answered twice is a worse bug than two spinners.
    const disabled = block.match(/disabled=\{[^}]*\}/g) ?? [];
    expect(disabled.length).toBe(2);
    for (const d of disabled) expect(d).toBe("disabled={isLoading}");
  });

  it("forgets the press once the work finishes", () => {
    // Otherwise the next press inherits the last one's button and the wrong
    // spinner appears for the instant before the new press registers.
    expect(card).toMatch(/if \(!isLoading\) setPressedAction\(null\)/);
  });
});
