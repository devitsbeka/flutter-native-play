import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Three permission surfaces at launch, one at a time, in a fixed order.
 *
 *   1. Apple's App Tracking Transparency dialog
 *   2. Google's European consent form  (EEA, UK and Switzerland only)
 *   3. iOS notifications
 *
 * Order is not cosmetic. On iOS a system dialog takes the window regardless of
 * what is already on screen, so a CMP form racing the ATT dialog is a form the
 * player dismisses blind. And a player who has just tapped through two
 * unexplained screens will tap through the third.
 *
 * Each is preceded by a full-bleed explanation screen that says what the next
 * dialog is and why it exists — ConsentScreen, shared by all three so they read
 * as one sequence rather than three unrelated interruptions.
 *
 * The chain is: ensureAdConsent awaits ensureTrackingConsent; PushRegistrar
 * awaits both. This test pins that, because the failure it prevents is
 * invisible in a simulator and only shows up as two dialogs fighting on a
 * device — or, worse, as a missing prompt and another rejection.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the launch consent sequence", () => {
  it("puts Google's form behind Apple's dialog", () => {
    const source = read("src/native/adConsent.ts");
    expect(
      source,
      "ensureAdConsent no longer waits for the tracking prompt — the two will race",
    ).toMatch(/await ensureTrackingConsent\(\)/);

    // Before the plugin is asked anything, not after.
    const wait = source.indexOf("await ensureTrackingConsent()");
    const ask = source.indexOf("plugin.requestConsentInfo");
    expect(wait, "the tracking wait is missing").toBeGreaterThan(-1);
    expect(
      wait < ask,
      "the consent form is requested before the tracking dialog resolves",
    ).toBe(true);
  });

  it("puts notifications behind both", () => {
    const source = read("src/native/PushRegistrar.tsx");
    expect(source).toMatch(/await ensureTrackingConsent\(\)/);
    expect(source).toMatch(/await ensureAdConsent\(\)/);
  });

  it("asks about notifications whether or not anyone is signed in", () => {
    const source = read("src/native/PushRegistrar.tsx");
    // A guest is the reviewer's path. Gating this on a session is what kept
    // the tracking prompt from ever appearing; the same mistake is available
    // here and would cost the notification dialog, which iOS only offers once.
    expect(
      source,
      "push registration is gated on a signed-in user again",
    ).not.toMatch(/if\s*\(!user\?\.id\)\s*return/);
  });

  it("explains each dialog before it opens", () => {
    // Every gate renders the shared full-bleed ConsentScreen.
    for (const file of [
      "src/native/TrackingConsentGate.tsx",
      "src/native/AdConsentGate.tsx",
      "src/native/PushConsentGate.tsx",
    ]) {
      expect(read(file), `${file} no longer uses ConsentScreen`).toMatch(
        /<ConsentScreen/,
      );
    }
  });

  it("mounts all three gates", () => {
    const bridge = read("src/native/NativeBridge.tsx");
    expect(bridge).toMatch(/<TrackingConsentGate\s*\/>/);
    expect(bridge).toMatch(/<AdConsentGate\s*\/>/);
    // PushConsentGate is rendered by PushRegistrar, which App mounts.
    expect(read("src/native/PushRegistrar.tsx")).toMatch(/<PushConsentGate/);
  });

  it("gives every explanation screen a deadline, so a broken one cannot swallow its dialog", () => {
    expect(read("src/native/trackingConsent.ts")).toMatch(/PRE_PROMPT_DEADLINE_MS/);
    expect(read("src/native/adConsent.ts")).toMatch(/AD_PRE_PROMPT_DEADLINE_MS/);
  });

  it("has copy for all three in every language the app ships", () => {
    for (const lang of ["ka", "en", "es", "fr", "de", "it", "pt"]) {
      const source = read(`src/locales/${lang}.ts`);
      for (const key of ["att:", "pushConsent:", "adConsent:"]) {
        expect(source, `${lang}.ts is missing ${key}`).toContain(key);
      }
    }
  });
});
