/**
 * The Play-on-TV sheet rises with the keyboard.
 *
 * It is a bottom-anchored sheet whose code boxes focus themselves on open,
 * which brings up the numeric keypad. On iOS the webview is deliberately not
 * resized for the keyboard (KeyboardResize.None in nativeShell.ts), so
 * anything pinned to the bottom edge is simply covered — the owner's
 * screenshot was the lobby, blurred, with a sliver of white sheet peeking
 * over the keypad and nothing to type into.
 *
 * nativeShell publishes the keyboard's height as --keyboard-height for
 * exactly this. The sheet's bottom padding has to include it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the TV pairing sheet clears the keyboard", () => {
  const lobby = read("src/components/team/RoomLobbyV2.tsx");
  const start = lobby.indexOf("Play on TV: the pairing code entry");
  const sheet = lobby.slice(start, lobby.indexOf("</AnimatePresence>", start));

  it("is padded by the keyboard's height as well as the home indicator", () => {
    expect(start).toBeGreaterThan(-1);
    expect(sheet).toMatch(/items-end/);
    expect(sheet).toMatch(/pb-\[calc\(1rem_\+_var\(--safe-bottom\)_\+_var\(--keyboard-height,0px\)\)\]/);
  });

  it("and scrolls itself when what is left of the screen is shorter than it", () => {
    expect(sheet).toMatch(/max-h-full overflow-y-auto/);
  });

  it("the variable it relies on is the one the native shell publishes", () => {
    const shell = read("src/native/nativeShell.ts");
    expect(shell).toMatch(/setProperty\("--keyboard-height"/);
    expect(shell).toMatch(/keyboardWillShow/);
    // ...and has a web default, so the calc() never fails to parse in a browser.
    expect(read("src/index.css")).toMatch(/--keyboard-height: 0px;/);
  });
});
