import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The App Tracking Transparency prompt must be reachable on a fresh install,
 * by a reviewer who does nothing but open the app.
 *
 * This file exists because of a real rejection. App Review installed build 34
 * on an iPad Air running iPadOS 26.6, played as a guest, and could not find
 * the prompt:
 *
 *   Guideline 2.1 — "The app uses the AppTrackingTransparency framework, but
 *   we are unable to locate the App Tracking Transparency permission request
 *   when reviewed on iPadOS 26.6."
 *
 * The cause was a condition added in front of the prompt: it only fired once
 * the player had declared themselves 18+, and a guest never declares an age at
 * all. Every existing tracking test passed throughout, because none of them
 * exercised the launch path with no age on file — which is the only path a
 * reviewer takes.
 *
 * So these tests are about reachability, not about ATT mechanics. The rule
 * they encode: nothing may stand between a cold start and this prompt.
 */

const platform = { native: true, name: "ios" };

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => platform.native,
    getPlatform: () => platform.name,
  },
  registerPlugin: () => ({}),
}));

const att = { status: "notDetermined", requests: 0 };

vi.mock("@/native/appTracking", () => ({
  AppTracking: {
    getStatus: async () => ({ status: att.status }),
    request: async () => {
      att.requests += 1;
      att.status = "authorized";
      return { status: att.status, shown: true };
    },
  },
}));

async function freshLaunch() {
  vi.resetModules();
  return import("@/native/trackingConsent");
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  },
});

beforeEach(() => {
  platform.native = true;
  platform.name = "ios";
  att.status = "notDetermined";
  att.requests = 0;
  localStorage.clear();
});

afterEach(() => vi.useRealTimers());

describe("a reviewer on a fresh install reaches the tracking prompt", () => {
  it("asks a guest who never signs up and never declares an age", async () => {
    const { primeTrackingConsent, acknowledgePrePrompt } = await freshLaunch();

    // Exactly what App Review did: launch, and nothing else. No sign-up, no
    // age gate, no ad screen.
    const primed = primeTrackingConsent();
    await flush();
    acknowledgePrePrompt();
    await primed;
    await flush();

    expect(
      att.requests,
      "a guest was never asked for tracking permission — this is the rejection",
    ).toBe(1);
  });

  it("still asks when the age is explicitly unknown", async () => {
    const { primeTrackingConsent, declareAgeGroup, acknowledgePrePrompt } =
      await freshLaunch();

    // `useConsentOrchestration` calls this with null once auth settles for a
    // guest. It must not cancel or suppress the prompt.
    declareAgeGroup(null);
    const primed = primeTrackingConsent();
    await flush();
    acknowledgePrePrompt();
    await primed;
    await flush();

    expect(att.requests, "declaring an unknown age suppressed the prompt").toBe(1);
  });

  it("asks a player who says they are a teenager", async () => {
    const { primeTrackingConsent, declareAgeGroup, acknowledgePrePrompt } =
      await freshLaunch();

    declareAgeGroup("teen");
    const primed = primeTrackingConsent();
    await flush();
    acknowledgePrePrompt();
    await primed;
    await flush();

    // Apple does not forbid this — only Kids Category apps must not use ATT,
    // and this app is not one. Younger players are protected by the ad
    // restrictions keyed off age, not by never being asked.
    expect(att.requests, "a teenager was never asked").toBe(1);
  });

  it("asks even if the explanation screen never appears", async () => {
    vi.useFakeTimers();
    const { primeTrackingConsent } = await freshLaunch();

    // Nothing acknowledges the pre-prompt — the case where the gate is
    // unmounted, crashed, or laid out off-screen. On an iPad running an
    // iPhone-only app in compatibility mode, that is not hypothetical.
    const primed = primeTrackingConsent();
    await vi.advanceTimersByTimeAsync(10_000);
    await primed;

    expect(
      att.requests,
      "a broken explanation screen swallowed the system prompt",
    ).toBe(1);
  });
});

describe("the prompt has no conditions in front of it", () => {
  const source = readFileSync(
    join(process.cwd(), "src/native/trackingConsent.ts"),
    "utf8",
  );

  it("does not gate the request on an age group", () => {
    const gate = source.slice(
      source.indexOf("function promptIfPermitted"),
      source.indexOf("export async function primeTrackingConsent"),
    );
    // Comments explain the history; code must not reintroduce it.
    const code = gate.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(
      code,
      "an age condition is back in front of the tracking prompt",
    ).not.toMatch(/declaredAgeGroup\s*!==/);
  });

  it("does not gate the request on being signed in", () => {
    expect(source).not.toMatch(/\buseAuth\b/);
    expect(source).not.toMatch(/\bprofile\b\s*\./);
  });
});
