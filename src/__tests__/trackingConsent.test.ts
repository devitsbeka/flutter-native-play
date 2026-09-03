import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * The App Tracking Transparency prompt, and the five ways it used to vanish.
 *
 * Build 34 was rejected under guideline 2.1 — "unable to locate the App
 * Tracking Transparency permission request" — with the framework present, the
 * usage string written, and the consent screen mounted. Nothing was missing;
 * the prompt was simply unreachable in a review session.
 *
 * Each block below is one of the ways that happened. They are cheap to
 * reintroduce and expensive to discover: the app works perfectly either way,
 * and the only symptom is a rejection weeks later.
 */

// ── Test doubles ───────────────────────────────────────────────────────────

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

/** A fresh module graph, which is what a relaunch actually is. */
async function loadConsent() {
  vi.resetModules();
  return import("@/native/trackingConsent");
}

/** Let queued microtasks run without advancing the clock. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * These tests run under the node environment, so there is no localStorage to
 * inspect. The store is real enough to catch a write, which is the whole
 * point: the flow must not persist a refusal of its own.
 */
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
const storedKeys = () => [...store.keys()];

beforeEach(() => {
  platform.native = true;
  platform.name = "ios";
  att.status = "notDetermined";
  att.requests = 0;
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Behaviour ──────────────────────────────────────────────────────────────

describe("asking for tracking consent", () => {
  it("shows the explanation screen and waits for it before asking iOS", async () => {
    const { ensureTrackingConsent, subscribeToPrePrompt, acknowledgePrePrompt } =
      await loadConsent();

    const opens: boolean[] = [];
    subscribeToPrePrompt((open) => opens.push(open));

    const pending = ensureTrackingConsent();
    await flush();

    expect(opens.at(-1), "the screen should be open").toBe(true);
    expect(att.requests, "iOS must not be asked before the player has read why").toBe(0);

    acknowledgePrePrompt();
    await expect(pending).resolves.toBe("authorized");

    expect(att.requests).toBe(1);
    expect(opens.at(-1), "the screen should close again").toBe(false);
  });

  it("does not ask again once iOS has an answer on file", async () => {
    att.status = "denied";
    const { ensureTrackingConsent, subscribeToPrePrompt } = await loadConsent();

    const opens: boolean[] = [];
    subscribeToPrePrompt((open) => opens.push(open));

    await expect(ensureTrackingConsent()).resolves.toBe("denied");
    expect(att.requests).toBe(0);
    expect(opens.some(Boolean), "no screen for a decided status").toBe(false);
  });

  it("is a no-op off iOS", async () => {
    platform.name = "android";
    const { ensureTrackingConsent } = await loadConsent();
    await expect(ensureTrackingConsent()).resolves.toBe("unavailable");

    platform.native = false;
    platform.name = "web";
    const web = await loadConsent();
    await expect(web.ensureTrackingConsent()).resolves.toBe("unavailable");

    expect(att.requests).toBe(0);
  });

  it("shows one dialog when several callers ask at once", async () => {
    const { ensureTrackingConsent, acknowledgePrePrompt } = await loadConsent();

    const all = Promise.all([
      ensureTrackingConsent(),
      ensureTrackingConsent(),
      ensureTrackingConsent(),
    ]);
    await flush();
    acknowledgePrePrompt();

    expect(await all).toEqual(["authorized", "authorized", "authorized"]);
    expect(att.requests, "iOS shows one dialog; asking twice strands a caller").toBe(1);
  });

  /**
   * The screen is the nicety; the prompt is the requirement. If the gate is
   * unmounted or covered, ATT still has to be asked rather than hang forever.
   */
  it("falls through to the system dialog if the screen never answers", async () => {
    vi.useFakeTimers();
    const { ensureTrackingConsent } = await loadConsent();

    const pending = ensureTrackingConsent();
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toBe("authorized");
    expect(att.requests).toBe(1);
  });

  /**
   * The old flow wrote `mytrivia_att_asked` and, on a refusal, never asked iOS
   * again for the life of the install — one tap on "Not now" and the prompt
   * was gone. A reviewer who did that would report exactly what Apple did.
   */
  it("keeps asking on later launches while iOS is still undecided", async () => {
    const first = await loadConsent();
    const pending = first.ensureTrackingConsent();
    await flush();
    // The player ignores it — the app is closed with nothing decided.
    att.status = "notDetermined";
    first.acknowledgePrePrompt();
    await pending;

    att.status = "notDetermined";
    att.requests = 0;

    const relaunch = await loadConsent();
    const opens: boolean[] = [];
    relaunch.subscribeToPrePrompt((open) => opens.push(open));

    const second = relaunch.ensureTrackingConsent();
    await flush();
    expect(opens.at(-1), "a fresh launch must ask again").toBe(true);
    relaunch.acknowledgePrePrompt();
    await second;

    expect(att.requests).toBe(1);
    expect(
      storedKeys(),
      "no private flag may suppress a prompt iOS has not recorded",
    ).toHaveLength(0);
  });

  it("personalises ads only on an explicit yes", async () => {
    const { ensureTrackingConsent, personalizedAdsAllowed, acknowledgePrePrompt } =
      await loadConsent();

    const pending = ensureTrackingConsent();
    await flush();
    acknowledgePrePrompt();
    await pending;
    expect(personalizedAdsAllowed()).toBe(true);

    att.status = "denied";
    const denied = await loadConsent();
    await denied.ensureTrackingConsent();
    expect(denied.personalizedAdsAllowed()).toBe(false);
  });
});

// ── Wiring that cannot be observed from a unit test ────────────────────────

describe("where the prompt is triggered from", () => {
  it("is primed at launch, not behind an ad", () => {
    const bridge = src("src/native/NativeBridge.tsx");
    expect(
      bridge.includes("primeTrackingConsent"),
      "NativeBridge must prime ATT on launch — ads are opt-in and App Review " +
        "never pressed the button that used to be the only trigger",
    ).toBe(true);
  });

  /**
   * Both ad paths return early for VIP. With the consent call below that
   * return, a PRO or admin account — including the demo account handed to App
   * Review — could not reach the prompt by any route in the app.
   */
  it("asks before the VIP bypass in both ad paths", () => {
    const ads = src("src/services/adService.ts");

    for (const method of ["showRewardedAdWithPreload", "showInterstitial"]) {
      const start = ads.indexOf(`async ${method}(`);
      expect(start, `${method} not found`).toBeGreaterThan(-1);

      const body = ads.slice(start, start + 1600);
      const consent = body.indexOf("ensureTrackingConsent()");
      const vip = body.indexOf("this.isVipUser");

      expect(consent, `${method} must call ensureTrackingConsent()`).toBeGreaterThan(-1);
      expect(vip, `${method} must still have a VIP bypass`).toBeGreaterThan(-1);
      expect(
        consent,
        `${method} asks for consent after its VIP early-return, so a PRO ` +
          "account can never reach the ATT prompt",
      ).toBeLessThan(vip);
    }
  });

  it("does not let AdMob present the dialog itself", () => {
    const ads = src("src/services/adService.ts");
    expect(
      /requestTrackingAuthorization:\s*false/.test(ads),
      "the AdMob plugin defaults this to true and would race the explanation " +
        "screen with a bare system dialog at whatever moment the SDK starts",
    ).toBe(true);
  });

  it("reaches ATT without going through the ad SDK", () => {
    const service = src("src/services/trackingService.ts");
    const bridgeImport = service.indexOf('from "@/native/appTracking"');
    expect(
      bridgeImport,
      "trackingService must talk to the native ATT plugin directly; routing " +
        "ATT through the AdMob import made a store requirement fail silently " +
        "whenever that import did",
    ).toBeGreaterThan(-1);

    expect(
      service.indexOf("AppTracking.request()"),
      "the primary request path must be the native plugin",
    ).toBeGreaterThan(-1);
  });

  /**
   * The screen may explain, delay, and translate. It may not record a refusal
   * of its own — that belongs to iOS, which offers "Ask App Not to Track" and
   * lets the player revisit it in Settings.
   */
  it("gives the explanation screen no way to skip the system dialog", () => {
    const gate = src("src/native/TrackingConsentGate.tsx");
    expect(gate.includes("acknowledgePrePrompt")).toBe(true);
    expect(
      /notNow|answerPrePrompt\(false\)/.test(gate),
      "a dismiss action that suppresses the prompt is what build 34 shipped",
    ).toBe(false);
  });
});
