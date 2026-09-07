import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * No consent flow may block another one forever.
 *
 * Build 50 shipped a chain: the notification explainer waited on the ad
 * consent flow, which waited on a bare `requestConsentInfo` — a cold-start
 * network round-trip to Google with no timeout anywhere in it. When that call
 * did not come back, the notification prompt was simply never reached. A
 * tester in Georgia got the tracking dialog at launch, signed in, and was
 * never asked about notifications at all.
 *
 * The failure is invisible from the outside and permanent from the inside:
 * iOS offers the notification dialog once per install, so a launch that never
 * reaches it does not retry later in the session.
 *
 * These pin the two halves of the fix. They are text assertions because the
 * real thing under test is native and only reachable on a device.
 */
const read = (p: string) =>
  readFileSync(join(process.cwd(), p), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/[^\n]*$/gm, "");

describe("the UMP network call is bounded", () => {
  const source = read("src/native/adConsent.ts");

  /**
   * The launch flow only. `openAdPrivacyOptions` calls the same API and is
   * deliberately left unbounded: it runs behind a tap in Settings, with the
   * player waiting on a screen they opened, and it holds up nothing else.
   */
  const launchFlow = source.slice(
    source.indexOf("export async function ensureAdConsent"),
    source.indexOf("export async function openAdPrivacyOptions"),
  );

  it("does not await requestConsentInfo bare on the launch path", () => {
    expect(
      launchFlow,
      "an unbounded requestConsentInfo is what stalled the notification prompt",
    ).not.toMatch(/await\s+plugin\.requestConsentInfo\(/);
  });

  it("races it against a deadline", () => {
    expect(source).toMatch(/withDeadline\(\s*\n?\s*plugin\.requestConsentInfo/);
    expect(source).toMatch(/CONSENT_INFO_DEADLINE_MS\s*=\s*\d+/);
  });

  it("leaves the state unresolved when the deadline is hit", () => {
    // Unresolved already blocks every ad request. Guessing "yes" here would
    // serve an ad in the EEA with no consent record, which is the one outcome
    // this whole file exists to prevent.
    expect(source).toMatch(/if\s*\(!info\)\s*return state;/);
  });

  it("does not bound the form itself", () => {
    // A player reading Google's form is not a stall. Cutting them off would be
    // worse than the bug being fixed.
    expect(source).not.toMatch(/withDeadline\(\s*\n?\s*plugin\.showConsentForm/);
  });
});

describe("a no-argument consent call reuses the answer on file", () => {
  const source = read("src/native/adConsent.ts");

  it("does not default the age tag to under-age", () => {
    // Defaulting to `true` made every no-argument caller disagree with
    // useConsentOrchestration, miss the cache, and drive a fresh native
    // round-trip to Google on every ad tap — while overwriting the correct
    // adult treatment with the under-age one.
    expect(source).not.toMatch(/options\?\.underAgeOfConsent\s*\?\?\s*true/);
    expect(source).toMatch(
      /options\?\.underAgeOfConsent\s*\?\?\s*resolvedForUnderAge\s*\?\?\s*true/,
    );
  });
});

describe("the notification prompt is not held hostage by the ad flow", () => {
  const source = read("src/native/PushRegistrar.tsx");

  it("bounds the wait on ad consent", () => {
    expect(
      source,
      "awaiting ensureAdConsent() bare is exactly what lost the prompt on build 50",
    ).not.toMatch(/await\s+ensureAdConsent\(\)\s*;/);
    expect(source).toMatch(/withDeadline\(\s*ensureAdConsent\(\)/);
  });

  it("still waits on the tracking dialog without a deadline", () => {
    // ATT is a system sheet that is already on screen. Walking away from it to
    // raise a second system sheet is the one permanent mistake available here.
    expect(source).toMatch(/await\s+ensureTrackingConsent\(\)\s*;/);
  });

  it("shows the explainer after the wait, however the wait ended", () => {
    expect(source).toMatch(/setExplaining\(true\)/);
  });
});
