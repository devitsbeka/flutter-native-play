import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Consent, and the two ways this app was serving ads without it.
 *
 * 1. **No EU consent mechanism at all.** `GoogleUserMessagingPlatform` has
 *    been linked into the binary the whole time — `ios/App/Podfile.lock`, via
 *    `CapacitorCommunityAdmob` — and nothing ever called it. The app ships de,
 *    fr, it, es and pt locales, so it is plainly distributed in the EEA, where
 *    AdMob was serving with no GDPR consent record. ATT is Apple's mechanism
 *    and is not a lawful basis; the two questions are separate and both have
 *    to be asked.
 *
 * 2. **An unknown age failed open to adult treatment.** `isUnderAgeOfConsent`
 *    matched only `teen` and `child`, so `null` — every anonymous guest, who
 *    never passes through onboarding and therefore never has an age group —
 *    got personalised ads with no content rating cap.
 *
 * Both are invisible from inside the app: it works perfectly either way, and
 * the only symptom is a rejection or a regulator.
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

/**
 * `useAgeGroup` reaches the Supabase client through `useAuth`, and the client
 * pulls `@capacitor/preferences`, which touches `window` at import time. These
 * tests run under the node environment; none of them go near a database.
 */
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/native/appTracking", () => ({
  AppTracking: {
    getStatus: async () => ({ status: "authorized" }),
    request: async () => ({ status: "authorized", shown: true }),
  },
}));

const ump = vi.hoisted(() => ({
  /** What `requestConsentInfo` answers with. */
  info: {
    status: "NOT_REQUIRED",
    isConsentFormAvailable: false,
    canRequestAds: true,
    privacyOptionsRequirementStatus: "NOT_REQUIRED",
  } as Record<string, unknown>,
  /** What `showConsentForm` answers with, once the player has been through it. */
  afterForm: {
    status: "OBTAINED",
    canRequestAds: true,
    privacyOptionsRequirementStatus: "REQUIRED",
  } as Record<string, unknown>,
  /** Every plugin call, in order — the ordering rule is the point. */
  calls: [] as string[],
  /** The options the last `requestConsentInfo` was given. */
  lastRequestOptions: null as Record<string, unknown> | null,
}));

const admob = vi.hoisted(() => ({
  requestConsentInfo: async (options?: Record<string, unknown>) => {
    ump.calls.push("requestConsentInfo");
    ump.lastRequestOptions = options ?? null;
    return ump.info;
  },
  showConsentForm: async () => {
    ump.calls.push("showConsentForm");
    return ump.afterForm;
  },
  showPrivacyOptionsForm: async () => {
    ump.calls.push("showPrivacyOptionsForm");
  },
  initialize: async () => {
    ump.calls.push("initialize");
  },
  addListener: async () => ({ remove: () => undefined }),
  prepareRewardVideoAd: async () => {
    ump.calls.push("prepareRewardVideoAd");
  },
  showRewardVideoAd: async () => {
    ump.calls.push("showRewardVideoAd");
  },
  prepareInterstitial: async () => {
    ump.calls.push("prepareInterstitial");
  },
  showInterstitial: async () => {
    ump.calls.push("showInterstitial");
  },
}));

vi.mock("@capacitor-community/admob", () => ({
  AdMob: admob,
  RewardAdPluginEvents: {
    Loaded: "reward.loaded",
    FailedToLoad: "reward.failed",
    Showed: "reward.showed",
    Dismissed: "reward.dismissed",
    Rewarded: "reward.rewarded",
    FailedToShow: "reward.failedToShow",
  },
  InterstitialAdPluginEvents: {
    Loaded: "interstitial.loaded",
    FailedToLoad: "interstitial.failed",
    Dismissed: "interstitial.dismissed",
    FailedToShow: "interstitial.failedToShow",
  },
}));

/** A fresh module graph, because both modules under test hold state. */
async function load() {
  vi.resetModules();
  const consent = await import("@/native/adConsent");

  // Stand in for AdConsentGate.
  //
  // Google's form is now preceded by a full-bleed explanation screen, the same
  // one the tracking and notification prompts use. In the app that screen is
  // rendered by AdConsentGate, which acknowledges it when the player taps
  // Continue; in a test nothing renders, so without this the flow waits out its
  // eight-second deadline and every case here times out.
  //
  // Acknowledging immediately is the honest stand-in: it makes these tests
  // about what UMP does, which is what they were written for, and the deadline
  // itself is covered separately in consentSequence.test.ts.
  consent.subscribeToAdPrePrompt((open) => {
    if (open) consent.acknowledgeAdPrePrompt();
  });

  return {
    consent,
    ads: (await import("@/services/adService")).adService,
  };
}

beforeEach(() => {
  platform.native = true;
  platform.name = "ios";
  ump.calls = [];
  ump.lastRequestOptions = null;
  ump.info = {
    status: "NOT_REQUIRED",
    isConsentFormAvailable: false,
    canRequestAds: true,
    privacyOptionsRequirementStatus: "NOT_REQUIRED",
  };
  ump.afterForm = {
    status: "OBTAINED",
    canRequestAds: true,
    privacyOptionsRequirementStatus: "REQUIRED",
  };
});

// ── The UMP flow ───────────────────────────────────────────────────────────

describe("the EEA consent flow", () => {
  it("asks UMP before AdMob is initialized", async () => {
    const { ads } = await load();
    await ads.initialize();

    expect(
      ump.calls.indexOf("requestConsentInfo"),
      "requestConsentInfo must run — the UMP framework shipped in the binary " +
        "and was never once called",
    ).toBeGreaterThan(-1);
    expect(
      ump.calls.indexOf("requestConsentInfo"),
      "consent has to be resolved BEFORE AdMob.initialize(), which is the " +
        "last moment a refusal can still stop the ad SDK starting",
    ).toBeLessThan(ump.calls.indexOf("initialize"));
  });

  it("presents the form when UMP says consent is required", async () => {
    ump.info = {
      status: "REQUIRED",
      isConsentFormAvailable: true,
      canRequestAds: false,
      privacyOptionsRequirementStatus: "REQUIRED",
    };

    const { consent, ads } = await load();
    await ads.initialize();

    expect(ump.calls).toContain("showConsentForm");
    expect(consent.getAdConsent().status).toBe("OBTAINED");
    expect(consent.adRequestsAllowed()).toBe(true);
  });

  it("presents no form outside the regulated regions", async () => {
    const { ads } = await load();
    await ads.initialize();
    expect(ump.calls).not.toContain("showConsentForm");
  });

  it("does not request an ad when consent was refused", async () => {
    ump.info = {
      status: "REQUIRED",
      isConsentFormAvailable: true,
      canRequestAds: false,
      privacyOptionsRequirementStatus: "REQUIRED",
    };
    // The player closed the form without agreeing.
    ump.afterForm = {
      status: "REQUIRED",
      canRequestAds: false,
      privacyOptionsRequirementStatus: "REQUIRED",
    };

    const { consent, ads } = await load();
    await ads.initialize();

    expect(consent.adRequestsAllowed()).toBe(false);
    await expect(ads.loadRewardedAd()).resolves.toBe(false);
    await expect(ads.showRewardedAdWithPreload()).resolves.toBe(false);
    await expect(ads.showInterstitial()).resolves.toBe(false);

    expect(
      ump.calls,
      "an EEA player who refused must see no ad at all — not a " +
        "non-personalised one",
    ).not.toContain("prepareRewardVideoAd");
    expect(ump.calls).not.toContain("prepareInterstitial");
  });

  it("requests ads once consent permits it", async () => {
    const { consent, ads } = await load();
    await ads.initialize();

    expect(consent.adRequestsAllowed()).toBe(true);
    await expect(ads.loadRewardedAd()).resolves.toBe(true);
    expect(ump.calls).toContain("prepareRewardVideoAd");
  });

  it("offers the privacy options entry point only when UMP requires it", async () => {
    const { consent, ads } = await load();
    await ads.initialize();
    expect(consent.privacyOptionsRequired()).toBe(false);

    ump.info = {
      status: "OBTAINED",
      isConsentFormAvailable: true,
      canRequestAds: true,
      privacyOptionsRequirementStatus: "REQUIRED",
    };
    const eea = await load();
    await eea.ads.initialize();
    expect(eea.consent.privacyOptionsRequired()).toBe(true);

    await expect(eea.consent.openAdPrivacyOptions()).resolves.toBe(true);
    expect(ump.calls).toContain("showPrivacyOptionsForm");
  });

  it("leaves the web simulation alone", async () => {
    platform.native = false;
    platform.name = "web";

    const { consent } = await load();
    expect(consent.adRequestsAllowed()).toBe(true);
    expect(consent.analyticsConsentAllowed()).toBe(true);
    await expect(consent.ensureAdConsent()).resolves.toMatchObject({ resolved: true });
    expect(ump.calls, "there is no UMP off a device").toEqual([]);
  });
});

// ── Analytics rides on the same answer ─────────────────────────────────────

describe("analytics consent", () => {
  it("is withheld until the flow has resolved", async () => {
    const { consent } = await load();
    expect(
      consent.analyticsConsentAllowed(),
      "PostHog used to initialise at module scope, before anything had been " +
        "asked of anyone",
    ).toBe(false);
  });

  it("is withheld from a player who refused", async () => {
    ump.info = {
      status: "REQUIRED",
      isConsentFormAvailable: true,
      canRequestAds: false,
      privacyOptionsRequirementStatus: "REQUIRED",
    };
    ump.afterForm = {
      status: "REQUIRED",
      canRequestAds: false,
      privacyOptionsRequirementStatus: "REQUIRED",
    };

    const { consent } = await load();
    await consent.ensureAdConsent({ underAgeOfConsent: false });
    expect(consent.analyticsConsentAllowed()).toBe(false);
  });

  it("is granted where consent is not required, and where it was given", async () => {
    const notRequired = await load();
    await notRequired.consent.ensureAdConsent({ underAgeOfConsent: false });
    expect(notRequired.consent.analyticsConsentAllowed()).toBe(true);

    ump.info = {
      status: "REQUIRED",
      isConsentFormAvailable: true,
      canRequestAds: false,
      privacyOptionsRequirementStatus: "REQUIRED",
    };
    const obtained = await load();
    await obtained.consent.ensureAdConsent({ underAgeOfConsent: false });
    expect(obtained.consent.analyticsConsentAllowed()).toBe(true);
  });
});

// ── The age default ────────────────────────────────────────────────────────

describe("an unknown age is under the age of consent", () => {
  it("only an explicit adult opts out of restricted treatment", async () => {
    const { isUnderAgeOfConsent, isKnownAdult } = await import("@/hooks/useAgeGroup");

    expect(isUnderAgeOfConsent("adult")).toBe(false);
    expect(isKnownAdult("adult")).toBe(true);

    for (const value of [null, undefined, "teen", "child", "", "grown-up"]) {
      expect(
        isUnderAgeOfConsent(value as string | null | undefined),
        `${String(value)} must be treated as under the age of consent — an ` +
          "anonymous guest has no age group and used to be treated as an adult",
      ).toBe(true);
      expect(isKnownAdult(value as string | null | undefined)).toBe(false);
    }
  });

  it("tags UMP for an under-age player when the age is unknown", async () => {
    const { ads } = await load();
    ads.setAgeGroup(null);
    await ads.initialize();

    expect(ump.lastRequestOptions).toMatchObject({ tagForUnderAgeOfConsent: true });
  });

  it("does not tag a player who said they are 18+", async () => {
    const { ads } = await load();
    ads.setAgeGroup("adult");
    await ads.initialize();

    expect(ump.lastRequestOptions).toMatchObject({ tagForUnderAgeOfConsent: false });
  });
});
