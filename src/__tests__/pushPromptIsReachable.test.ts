import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Nothing we persist ourselves may stop the notification prompt appearing.
 *
 * iOS shows that dialog once per install and records the answer. `permission`
 * reports it back, so it is the only thing that knows whether the question has
 * been asked. We kept a second copy in localStorage, and the copy was wrong:
 * build 35 wrote it *before* arming the timer, a separate bug stopped the
 * timer firing, and the flag shipped set on installs where the dialog had
 * never appeared.
 *
 * localStorage survives an app update. So those devices carried a permanent
 * suppression forward into every later build — the original bug was fixed, and
 * the prompt still did not appear on a TestFlight update, because the poisoned
 * flag was never cleared. That was reported from a real device on build 47.
 *
 * The rule this pins: iOS is the source of truth, and no local flag may gate
 * the ask. The same mistake in the tracking flow cost a rejection, and it is
 * the same shape here.
 */
const source = readFileSync(
  join(process.cwd(), "src/native/PushRegistrar.tsx"),
  "utf8",
);

/** The effect body, with comments stripped — history explains, code decides. */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/[^\n]*$/gm, "");

describe("the notification prompt cannot be suppressed by our own state", () => {
  it("never returns early on a persisted flag", () => {
    expect(
      code,
      "a localStorage read gates the ask again — iOS already knows the answer",
    ).not.toMatch(/if\s*\(\s*localStorage\.getItem\([^)]*\)\s*\)\s*return/);
  });

  it("does not write an 'already asked' flag of its own", () => {
    expect(
      code,
      "we are persisting a copy of what iOS records; that copy is what broke",
    ).not.toMatch(/localStorage\.setItem\(\s*ASKED_KEY/);
  });

  it("clears the stale key rather than leaving it on the device", () => {
    // Devices that installed build 35 through 47 still carry it.
    expect(code).toMatch(/localStorage\.removeItem\(\s*ASKED_KEY\s*\)/);
  });

  it("still asks only when iOS says the question is open", () => {
    expect(code).toMatch(/permission\s*!==\s*"prompt"[\s\S]{0,20}return/);
  });

  it("does not gate the ask on being signed in", () => {
    // A guest is what a reviewer is. Gating on a session is what kept the
    // tracking prompt from ever appearing.
    expect(code).not.toMatch(/if\s*\(!user\?\.id\)\s*return/);
  });
});
