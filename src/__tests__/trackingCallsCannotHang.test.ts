import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * An unresolved tracking call freezes the whole launch, silently.
 *
 * `ensureTrackingConsent` keeps one in-flight promise and hands it to every
 * later caller. Everything queues behind it: `ensureAdConsent` awaits it before
 * it does anything, `PushRegistrar` awaits both before showing the
 * notification explainer, and the rewarded-ad gate awaits it on every tap.
 *
 * So a bridge call that never resolves does not fail the tracking prompt, it
 * freezes it — and takes the notification prompt and every ad in the app with
 * it, with no error logged anywhere. On build 50 that is what a device saw:
 * the tracking screen appeared, and after it nothing was ever asked and no ad
 * ever loaded.
 *
 * The cause was in `AppTrackingPlugin.swift`. `whenActive` waited on
 * `didBecomeActiveNotification`, which is not guaranteed to arrive — the app is
 * `.inactive` for reasons that do not end in a fresh activation, and if it was
 * already foregrounded the notification has been and gone before the observer
 * exists. `work()` was never called, so the plugin call was never resolved.
 *
 * Two deadlines now cover it, one on each side of the bridge. These pin both.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const stripped = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/\/?[^\n]*$/gm, "");

describe("the native side always resolves its call", () => {
  const swift = stripped("ios/App/App/AppTrackingPlugin.swift");

  it("does not wait on didBecomeActive alone", () => {
    expect(
      swift,
      "waiting only on a notification that may never arrive is what hung build 50",
    ).toMatch(/asyncAfter\(deadline:/);
    expect(swift).toMatch(/activeDeadline/);
  });

  it("runs the work exactly once however it is triggered", () => {
    // The observer and the deadline can both fire. Asking iOS twice would
    // strand one of the two calls, which is the bug in a different costume.
    expect(swift).toMatch(/guard\s+!done\s+else\s*\{\s*return\s*\}/);
  });

  it("does not claim a dialog was shown when it was not", () => {
    // Reaching the request while inactive means iOS presents nothing and
    // reports the stored status. `shown: true` there would tell the caller the
    // player had answered.
    expect(swift).not.toMatch(/"shown":\s*true/);
    expect(swift).toMatch(/status\s*!=\s*"notDetermined"/);
  });
});

describe("the JavaScript side does not wait forever either", () => {
  const source = stripped("src/services/trackingService.ts");

  it("bounds both bridge calls", () => {
    expect(source).toMatch(/withDeadline\(AppTracking\.getStatus\(\)/);
    expect(source).toMatch(/withDeadline\(AppTracking\.request\(\)/);
  });

  it("treats a timeout as no answer rather than a decision", () => {
    // Falling back to `null` normalises to "unavailable", which routes to the
    // AdMob path and, failing that, leaves the status undetermined so the next
    // launch asks again. Recording a refusal would be permanent.
    expect(source).toMatch(/withDeadline\(AppTracking\.(getStatus|request)\(\),\s*null,/);
  });
});

describe("the UMP debug override sends a value the bridge parses", () => {
  const source = stripped("src/native/adConsent.ts");

  it("sends debugGeography as a number", () => {
    // Native reads it with `call.getInt`. "EEA" does not parse, so it fell
    // back to 0 (disabled) and the override silently did nothing.
    expect(source).not.toMatch(/debugGeography:\s*["']EEA["']/);
    expect(source).toMatch(/debugGeography:\s*DEBUG_GEOGRAPHY_EEA/);
    expect(source).toMatch(/DEBUG_GEOGRAPHY_EEA\s*=\s*1/);
  });
});
