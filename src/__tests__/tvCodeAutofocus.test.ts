import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The four-digit box is ready to type into the moment it appears.
 *
 * Turning TV mode on, or opening the connect dialog, is already the decision
 * — the only thing left is four digits. Asking for a second tap on the boxes
 * to say so again is a tap that buys nothing, and on a phone it is a tap plus
 * waiting for a keyboard.
 *
 * Two details this pins, because both are ways to write the fix and have it
 * quietly do nothing:
 *
 *   - the focus is DELAYED. Both surfaces arrive on an AnimatePresence
 *     entrance; focus() on an element still at opacity 0 mid-transition is a
 *     no-op. 100ms is the interval RoomIconPickerModal already uses for the
 *     same reason.
 *   - the effect re-runs on OPEN, not just on mount. A modal focused only the
 *     first time it is created looks fixed until you close and reopen it.
 *
 * What this does NOT prove: that iOS raises the keyboard. A programmatic
 * focus outside a user-gesture call stack does not always do that in a
 * WKWebView, and there is no way to find out from here — it wants a device.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const SURFACES: [string, string][] = [
  ["the inline panel behind the TV-mode toggle", "src/components/team/TVSetupInline.tsx"],
  ["the connect-to-TV dialog", "src/components/team/TVEnterCodeModal.tsx"],
];

describe.each(SURFACES)("%s", (_label, path) => {
  const src = read(path);

  it("holds a ref to the code input", () => {
    expect(src).toMatch(/const codeInputRef = useRef<HTMLInputElement>\(null\);/);
    expect(src).toMatch(/ref=\{codeInputRef\}/);
  });

  it("focuses it, after letting the entrance land", () => {
    expect(src).toMatch(/setTimeout\(\(\) => codeInputRef\.current\?\.focus\(\), 100\)/);
  });

  it("clears its timer, so a fast close cannot focus a gone element", () => {
    expect(src).toMatch(/return \(\) => clearTimeout\(timer\);/);
  });

  it("does not steal focus once the TV is connected", () => {
    // Past that point the panel is a status, not a form.
    expect(src).toMatch(/isConnected/);
    expect(src).toMatch(/\}, \[[^\]]*isConnected\]\);/);
  });

  it("asks for the numeric keypad", () => {
    // Four digits; a full keyboard is a longer reach for no reason.
    expect(src).toMatch(/inputMode="numeric"/);
    expect(src).toMatch(/autoComplete="one-time-code"/);
  });
});

describe("the dialog specifically", () => {
  const modal = read("src/components/team/TVEnterCodeModal.tsx");

  it("re-focuses every time it opens, not only on first mount", () => {
    expect(modal).toMatch(/if \(!open \|\| isConnected\) return;/);
    expect(modal).toMatch(/\}, \[open, isConnected\]\);/);
  });

  it("does not reopen holding the last attempt's digits", () => {
    expect(modal).toMatch(/if \(!open\) setCode\(''\);/);
  });
});

/**
 * The ref has to reach a real <input>, or `.focus()` is a no-op on a div.
 * input-otp's OTPInput maps the forwarded ref onto its internal input through
 * useImperativeHandle — verified against the installed package rather than
 * assumed, because this is the one way the whole change could silently fail.
 */
describe("what the ref actually lands on", () => {
  it("input-otp forwards its ref to the input element", () => {
    const dist = read("node_modules/input-otp/dist/index.mjs");
    expect(dist).toMatch(/useImperativeHandle\(/);
  });

  it("our wrapper passes props straight through to it", () => {
    const wrapper = read("src/components/ui/input-otp.tsx");
    expect(wrapper).toMatch(/<OTPInput\s*\n\s*ref=\{ref\}/);
    expect(wrapper).toMatch(/\{\.\.\.props\}/);
  });
});
