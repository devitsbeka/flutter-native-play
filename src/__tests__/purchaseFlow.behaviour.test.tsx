// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

/**
 * The purchase path, executed rather than read.
 *
 * Every other test of this file is a regex over its source: they confirm a line
 * is present and never run it. That is how six builds went out, each fixing a
 * real bug, none of which any test could have caught — because all four were
 * behavioural:
 *
 *   - a `finally` that never ran, because two awaits above it were unbounded
 *   - `ensureIdentified` swallowing failure, so the charge went through against
 *     RevenueCat's anonymous id and could never be credited to the account
 *   - the `!synced.success` branch returning without announcing anything
 *   - the `catch` reporting only through a toast that src/lib/toast.ts swallows
 *
 * Each of those is invisible to a source-text assertion and obvious to a test
 * that calls purchase() and looks at what happened. This drives the real hook
 * against a mocked RevenueCat plugin and a mocked edge function.
 *
 * The module holds state across calls — `storeInit`, `identifiedAs`,
 * `storeProducts` are module-level singletons, deliberately, so every hook
 * instance shares one store. Tests therefore reset the module registry and
 * re-import, or the second test inherits the first one's store.
 */

const GEMS_500 = "io.mytrivia.gems.500";
const PRO_ANNUAL = "io.mytrivia.pro.annual";

/** The RevenueCat plugin, rebuilt per test so call history is clean. */
function makePlugin(overrides: Record<string, unknown> = {}) {
  const product = (identifier: string) => ({
    identifier,
    title: identifier,
    description: "",
    priceString: "$3.99",
    price: 3.99,
    currencyCode: "USD",
  });
  const storeProduct = product(GEMS_500);
  const catalogue = [product(GEMS_500), product(PRO_ANNUAL)];
  return {
    setLogLevel: vi.fn().mockResolvedValue(undefined),
    configure: vi.fn().mockResolvedValue(undefined),
    logIn: vi.fn().mockResolvedValue({}),
    // Without this, resetPurchaseIdentity swallows a TypeError and the app
    // silently never signs out of RevenueCat — a harness gap wearing the
    // costume of a passing test, exactly like the missing registerPlugin above.
    logOut: vi.fn().mockResolvedValue({}),
    getOfferings: vi.fn().mockResolvedValue({
      current: { availablePackages: catalogue.map((p) => ({ storeProduct: p })) },
      all: { default: { availablePackages: catalogue.map((p) => ({ storeProduct: p })) } },
    }),
    getProducts: vi.fn().mockImplementation(async ({ productIdentifiers }: any) => ({
      products: catalogue.filter((p) => productIdentifiers.includes(p.identifier)),
    })),
    purchasePackage: vi.fn().mockResolvedValue({
      customerInfo: { latestExpirationDate: "2027-01-01T00:00:00.000Z" },
    }),
    purchaseStoreProduct: vi.fn().mockResolvedValue({
      customerInfo: { latestExpirationDate: "2027-01-01T00:00:00.000Z" },
    }),
    restorePurchases: vi.fn().mockResolvedValue({}),
    getCustomerInfo: vi.fn().mockResolvedValue({ customerInfo: { activeSubscriptions: [] } }),
    ...overrides,
  };
}

/** Everything the hook reaches outside itself. */
function installMocks(opts: {
  plugin: ReturnType<typeof makePlugin>;
  invoke: ReturnType<typeof vi.fn>;
  profileGems?: number;
  user?: { id: string } | null;
  isVip?: boolean;
}) {
  const applyEntitlement = vi.fn();
  const refreshVip = vi.fn();
  const setProfileLocal = vi.fn();
  const fetchProfile = vi.fn().mockResolvedValue(null);

  // registerPlugin included deliberately. Without it, any path that reaches
  // the REAL @revenuecat/purchases-capacitor (rather than the stub below)
  // dies with "No registerPlugin export is defined on the @capacitor/core
  // mock" — which surfaces as a restore reporting "failed", i.e. a test
  // harness gap wearing the costume of a product bug.
  vi.doMock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
    registerPlugin: () => opts.plugin,
  }));

  vi.doMock("@revenuecat/purchases-capacitor", () => ({
    Purchases: opts.plugin,
    LOG_LEVEL: { DEBUG: "DEBUG", ERROR: "ERROR" },
  }));

  // attachResumeListener imports this dynamically. Capturing the handler is
  // the only way to exercise the resume trigger, which is what notices an
  // Apple ID swapped in Settings while the app was suspended.
  vi.doMock("@capacitor/app", () => ({
    App: {
      addListener: (_event: string, handler: (s: { isActive: boolean }) => void) => {
        resumeHandlers.push(handler);
        return { remove: () => {} };
      },
    },
  }));

  vi.doMock("@/integrations/supabase/client", () => ({
    supabase: { functions: { invoke: opts.invoke } },
  }));

  // Mutable, so a test can sign the user out and back in without re-mocking:
  // vi.doMock after the module has been imported changes nothing, since the
  // import is already cached.
  const authState = {
    user: (opts.user === undefined ? { id: "user-1" } : opts.user) as { id: string } | null,
  };

  vi.doMock("@/hooks/useAuth", () => ({
    useAuth: () => ({
      user: authState.user,
      profile: { gems: opts.profileGems ?? 100 },
      fetchProfile,
      setProfileLocal,
    }),
  }));

  vi.doMock("@/contexts/VipContext", () => ({
    useVipStatus: () => ({
      refresh: refreshVip,
      applyEntitlement,
      isVip: opts.isVip ?? false,
    }),
  }));

  vi.doMock("@/contexts/LanguageContext", () => ({
    t: (key: string) => key,
  }));

  vi.doMock("@/lib/toast", () => ({
    toast: Object.assign(vi.fn(), {
      error: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      message: vi.fn(),
    }),
  }));

  return { applyEntitlement, refreshVip, setProfileLocal, fetchProfile, authState };
}

/** Mount the hook and collect everything it announces. */
async function mountPurchases() {
  const mod = await import("@/hooks/useInAppPurchases");
  const announcements: any[] = [];

  const { result } = renderHook(() => {
    mod.usePurchaseAnnouncements((a: any) => announcements.push(a));
    return mod.useInAppPurchases();
  });

  // Let the store finish initialising before anything is bought.
  await waitFor(() => expect(result.current.loading).toBe(false));
  return { result, announcements };
}

const okInvoke = () =>
  vi.fn().mockResolvedValue({
    data: { success: true, tier: null, gemsCredited: 500 },
    error: null,
  });

/** Resume handlers registered by the module under test, one list per test. */
let resumeHandlers: Array<(s: { isActive: boolean }) => void> = [];
const resume = () => resumeHandlers.forEach((h) => h({ isActive: true }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  resumeHandlers = [];
});

afterEach(() => {
  // Unmount everything this test rendered.
  //
  // @testing-library/react registers its own afterEach cleanup only when the
  // test globals are present, and this project does not set `globals: true` —
  // so nothing was ever unmounted. Every renderHook in the file stayed
  // mounted for the rest of it, effects live, holding the module instance the
  // test that created them was given. With the sign-in reconcile now firing
  // on mount, those stale hooks kept doing store work across test boundaries,
  // and the restore-failure case intermittently read a Capacitor that was no
  // longer the mocked one: it reported 'notMobile' for a product path that
  // was never reached. One failure in six full runs, never in isolation.
  cleanup();

  // Unconditionally, not just on the happy path. The hang test switches to
  // fake timers and restored them only at its own end, so a failure there left
  // every later test running on a frozen clock — which showed up once as the
  // restore-failure case flaking in a full run and passing in isolation.
  vi.useRealTimers();
  // Deliberately NOT vi.doUnmock here.
  //
  // It used to unmock @capacitor/core and @revenuecat/purchases-capacitor,
  // which opened a window: the sign-in reconcile leaves detached async work
  // in flight, and a dynamic import that resolved inside that window got the
  // REAL @capacitor/core. The next test then read isNativePlatform() as false
  // and restore returned 'notMobile' — a harness slip wearing the costume of
  // a product bug, once in six full runs and never in isolation.
  //
  // There is nothing to unmock for: vitest isolates by file, all 29 tests
  // here call installMocks, and beforeEach resets the module registry. A mock
  // that is simply always registered cannot be missing.
});

describe("a successful gem purchase", () => {
  it("announces success exactly once, and does so before the server is asked", async () => {
    const invoke = vi.fn().mockImplementation(async () => {
      // The confirmation must already be up by the time the server is called.
      expect(announcements.length).toBe(1);
      return { data: { success: true, tier: null, gemsCredited: 500 }, error: null };
    });
    installMocks({ plugin: makePlugin(), invoke });

    const mounted = await mountPurchases();
    const { result } = mounted;
    const announcements = mounted.announcements;

    await act(async () => {
      await result.current.purchase(GEMS_500);
    });

    expect(invoke).toHaveBeenCalledWith("verify-receipt");
    expect(announcements).toHaveLength(1);
    expect(announcements[0]).toMatchObject({ productId: GEMS_500, gems: 500 });
    expect(announcements[0].failed).toBeFalsy();
  });

  it("credits the balance optimistically rather than waiting on verify-receipt", async () => {
    const mocks = installMocks({ plugin: makePlugin(), invoke: okInvoke(), profileGems: 100 });
    const { result } = await mountPurchases();

    await act(async () => {
      await result.current.purchase(GEMS_500);
    });

    expect(
      mocks.setProfileLocal,
      "the gems are not added locally — the counter sits on the old number " +
        "while the confirmation says +500",
    ).toHaveBeenCalledWith({ gems: 600 });
  });

  it("releases the buy button", async () => {
    installMocks({ plugin: makePlugin(), invoke: okInvoke() });
    const { result } = await mountPurchases();

    await act(async () => {
      await result.current.purchase(GEMS_500);
    });

    expect(result.current.purchasing).toBe(false);
  });
});

describe("a PRO purchase", () => {
  it("turns PRO on from customerInfo, without waiting for the row to be written", async () => {
    const invoke = vi.fn().mockImplementation(async () => {
      // applyEntitlement must already have run.
      expect(mocks.applyEntitlement).toHaveBeenCalled();
      return { data: { success: true, tier: "pro_plus", gemsCredited: 0 }, error: null };
    });
    const mocks = installMocks({ plugin: makePlugin(), invoke });

    const { result } = await mountPurchases();
    await act(async () => {
      await result.current.purchase(PRO_ANNUAL);
    });

    expect(mocks.applyEntitlement).toHaveBeenCalledWith(
      "pro_plus",
      "2027-01-01T00:00:00.000Z",
    );
    expect(mocks.refreshVip).toHaveBeenCalled();
  });
});

describe("a repeat purchase of a subscription already owned", () => {
  it("is not announced as a fresh subscription", async () => {
    // StoreKit does not refuse this: it shows its own "you're already
    // subscribed" sheet and then resolves normally with customerInfo. Treating
    // that as a new purchase congratulated the player every single tap — which
    // is exactly what they do when the screen still shows them non-PRO.
    // StoreKit is the authority here, not VipContext — activeSubscriptions is
    // what decides, because our own row can go briefly unreadable.
    const plugin = makePlugin({
      getCustomerInfo: vi.fn().mockResolvedValue({
        customerInfo: { activeSubscriptions: [PRO_ANNUAL] },
      }),
    });
    // A subscription that genuinely lands comes back with a tier; okInvoke
    // models a gem sync and would now trip the not-granted guard.
    const subInvoke = vi.fn().mockResolvedValue({
      data: { success: true, tier: "pro_plus", gemsCredited: 0 },
      error: null,
    });
    installMocks({ plugin, invoke: subInvoke, isVip: true });

    const { result, announcements } = await mountPurchases();
    await act(async () => {
      await result.current.purchase(PRO_ANNUAL);
    });

    expect(announcements).toHaveLength(1);
    expect(
      announcements[0].alreadyActive,
      "a repeat subscription purchase is announced as a brand new one",
    ).toBe(true);
  });

  it("trusts StoreKit over our database when the row is unreadable", async () => {
    // The exact failure from a device: VipContext momentarily reports non-PRO
    // because RLS hid the row, so the shop card falls back to Buy. StoreKit
    // knows better, and it is the one that actually took the money.
    const plugin = makePlugin({
      getCustomerInfo: vi.fn().mockResolvedValue({
        customerInfo: { activeSubscriptions: [PRO_ANNUAL] },
      }),
    });
    const subInvoke = vi.fn().mockResolvedValue({
      data: { success: true, tier: "pro_plus", gemsCredited: 0 },
      error: null,
    });
    installMocks({ plugin, invoke: subInvoke, isVip: false });

    const { result, announcements } = await mountPurchases();
    await act(async () => {
      await result.current.purchase(PRO_ANNUAL);
    });

    expect(
      announcements[0].alreadyActive,
      "announced a brand new subscription while StoreKit reported it already " +
        "active — this is the congratulations-on-every-tap loop",
    ).toBe(true);
  });

  it("still treats a gem pack as a real purchase even when subscribed", async () => {
    // Consumables are bought over and over by design; being PRO is irrelevant.
    installMocks({ plugin: makePlugin(), invoke: okInvoke(), isVip: true });

    const { result, announcements } = await mountPurchases();
    await act(async () => {
      await result.current.purchase(GEMS_500);
    });

    expect(announcements[0].alreadyActive).toBeFalsy();
    expect(announcements[0].gems).toBe(500);
  });
});

describe("a subscription that granted this account nothing", () => {
  it("is reported honestly instead of celebrated", async () => {
    // Observed on a device: the Apple ID already held PRO under app user
    // a22491af…, and the player was signed in as 215a70e6…. Apple refused to
    // charge ("you're already subscribed"), RevenueCat kept the entitlement
    // where it was, this account received nothing — and the app congratulated
    // them on subscribing.
    //
    // StoreKit answers for the Apple ID; the entitlement belongs to the app
    // account. verify-receipt is what knows the difference, and here it
    // reports no tier.
    const invoke = vi.fn().mockResolvedValue({
      data: { success: true, tier: null, gemsCredited: 0 },
      error: null,
    });
    installMocks({ plugin: makePlugin(), invoke });

    const { result, announcements } = await mountPurchases();
    let outcome: any;
    await act(async () => {
      outcome = await result.current.purchase(PRO_ANNUAL);
    });

    expect(outcome.error).toBe("entitlement_not_granted");

    const last = announcements[announcements.length - 1];
    expect(
      last.failed,
      "a subscription that attached to no account was announced as a success",
    ).toBe(true);
    expect(last.reason).toBe("iap.subscriptionOnAnotherAccount");
  });

  it("does not misfire on a gem pack, which grants no tier by design", async () => {
    // Consumables legitimately return tier: null. Treating that as a failed
    // entitlement would break every gem purchase.
    const invoke = vi.fn().mockResolvedValue({
      data: { success: true, tier: null, gemsCredited: 500 },
      error: null,
    });
    installMocks({ plugin: makePlugin(), invoke });

    const { result, announcements } = await mountPurchases();
    let outcome: any;
    await act(async () => {
      outcome = await result.current.purchase(GEMS_500);
    });

    expect(outcome.success).toBe(true);
    expect(announcements.some((a) => a.failed)).toBe(false);
  });
});

describe("failures are never silent", () => {
  it("announces when the store rejects the purchase", async () => {
    // The real shape from a device: RevenueCat code 2, STORE_PROBLEM.
    const plugin = makePlugin({
      purchasePackage: vi.fn().mockRejectedValue({
        code: "2",
        errorMessage:
          "There was a problem with the App Store. Problem communicating with the Store when trying to validate the receipt.",
      }),
    });
    installMocks({ plugin, invoke: okInvoke() });

    const { result, announcements } = await mountPurchases();
    let outcome: any;
    await act(async () => {
      outcome = await result.current.purchase(GEMS_500);
    });

    expect(outcome.success).toBe(false);
    expect(announcements).toHaveLength(1);
    expect(announcements[0].failed).toBe(true);
    expect(
      announcements[0].reason,
      "the store's own message must be carried through — it is the difference " +
        "between 'something went wrong' and knowing Apple could not validate a receipt",
    ).toContain("problem with the App Store");
    expect(result.current.purchasing).toBe(false);
  });

  it("announces when verify-receipt fails, and says why", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: Object.assign(new Error("Edge Function returned a non-2xx status code"), {
        context: {
          json: async () => ({
            success: false,
            error: 'duplicate key value violates unique constraint "vip_subscriptions_apple_txn_unique"',
          }),
        },
      }),
    });
    installMocks({ plugin: makePlugin(), invoke });

    const { result, announcements } = await mountPurchases();
    await act(async () => {
      await result.current.purchase(GEMS_500);
    });

    const failure = announcements.find((a) => a.failed);
    expect(failure, "a failing verify-receipt announced nothing").toBeTruthy();
    expect(
      failure.reason,
      "the server's own message was thrown away in favour of supabase-js's " +
        "generic status line — which is what cost several builds to diagnose",
    ).toContain("vip_subscriptions_apple_txn_unique");
  });

  it("stays quiet when the player cancels", async () => {
    const plugin = makePlugin({
      purchasePackage: vi.fn().mockRejectedValue({ code: "1", message: "Purchase was cancelled" }),
    });
    installMocks({ plugin, invoke: okInvoke() });

    const { result, announcements } = await mountPurchases();
    let outcome: any;
    await act(async () => {
      outcome = await result.current.purchase(GEMS_500);
    });

    expect(outcome.error).toBe("cancelled");
    expect(announcements, "a cancel raised a modal; the player did it on purpose").toHaveLength(0);
    expect(result.current.purchasing).toBe(false);
  });

  it("refuses to charge when the account could not be identified to RevenueCat", async () => {
    // logIn failing is what attributed purchases to $RCAnonymousID, leaving a
    // real charge that verify-receipt could never find.
    const plugin = makePlugin({ logIn: vi.fn().mockRejectedValue(new Error("network")) });
    installMocks({ plugin, invoke: okInvoke() });

    const { result } = await mountPurchases();
    let outcome: any;
    await act(async () => {
      outcome = await result.current.purchase(GEMS_500);
    });

    expect(outcome.error).toBe("not_identified");
    expect(
      plugin.purchasePackage,
      "the store was charged for something that could not be credited",
    ).not.toHaveBeenCalled();
  });
});

describe("nothing can hang the buy button", () => {
  it("releases it even when verify-receipt never answers", async () => {
    vi.useFakeTimers();
    const invoke = vi.fn().mockImplementation(() => new Promise(() => {})); // never settles
    installMocks({ plugin: makePlugin(), invoke });

    const mod = await import("@/hooks/useInAppPurchases");
    const { result } = renderHook(() => mod.useInAppPurchases());

    let settled = false;
    await act(async () => {
      const p = result.current.purchase(GEMS_500).then(() => {
        settled = true;
      });
      // Past the 15s bound on the store calls.
      await vi.advanceTimersByTimeAsync(20_000);
      await p;
    });

    expect(settled, "purchase() never returned — the spinner is stuck forever").toBe(true);
    expect(result.current.purchasing).toBe(false);
    vi.useRealTimers();
  });
});

describe("restore", () => {
  it("reports 'none' when the check succeeded and found nothing", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValue({ data: { success: true, tier: null, gemsCredited: 0 }, error: null });
    installMocks({ plugin: makePlugin(), invoke });

    const { result } = await mountPurchases();
    let outcome: any;
    await act(async () => {
      outcome = await result.current.restorePurchases();
    });

    expect(outcome).toBe("none");
  });

  it("reports 'failed' when the check itself could not complete", async () => {
    const invoke = vi.fn().mockRejectedValue(new Error("offline"));
    installMocks({ plugin: makePlugin(), invoke });

    const { result } = await mountPurchases();
    let outcome: any;
    await act(async () => {
      outcome = await result.current.restorePurchases();
    });

    expect(
      outcome,
      "'we could not check' must not be reported as 'you own nothing'",
    ).toBe("failed");
  });

  it("reports 'signedOut' without claiming anything was restored", async () => {
    installMocks({ plugin: makePlugin(), invoke: okInvoke(), user: null });

    // Through mountPurchases, not a bare renderHook: restorePurchases loads
    // the plugin itself, and calling it before the store has settled races the
    // dynamic import — which surfaced as this test intermittently reporting
    // "failed" in a full run while passing in isolation.
    const { result } = await mountPurchases();

    let outcome: any;
    await act(async () => {
      outcome = await result.current.restorePurchases();
    });

    expect(outcome).toBe("signedOut");
  });

  it("does not raise the buy buttons' busy flag", async () => {
    installMocks({ plugin: makePlugin(), invoke: okInvoke() });
    const { result } = await mountPurchases();

    await act(async () => {
      const p = result.current.restorePurchases();
      expect(
        result.current.purchasing,
        "restore greyed out the Subscribe button beside it",
      ).toBe(false);
      await p;
    });
  });
});

describe("the launch reconcile", () => {
  /**
   * "I exited the app and launched it again and it still showed the Subscribe
   * button."
   *
   * syncEntitlements only ever ran from a purchase, a restore or the gem poll.
   * A subscription the database had failed to record — the transaction moved
   * to a new account, a dropped webhook, a row written while the app was shut
   * — therefore stayed unrecorded until the player thought to press Restore
   * Purchases. Nothing asked RevenueCat on the way in, and RevenueCat knew.
   */

  it("asks the server once on mount, with no purchase involved", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { success: true, tier: "pro_plus", gemsCredited: 0 },
      error: null,
    });
    const { refreshVip } = installMocks({ plugin: makePlugin(), invoke });

    const { announcements } = await mountPurchases();

    await waitFor(() => expect(invoke).toHaveBeenCalledWith("verify-receipt"));
    expect(
      refreshVip,
      "the sync found a subscription and the UI was never told to re-read it",
    ).toHaveBeenCalled();
    expect(
      announcements,
      "a launch produced a purchase announcement — that is the congratulations " +
        "modal appearing for a subscription bought days ago",
    ).toHaveLength(0);
  });

  it("does not repeat itself when the hook remounts", async () => {
    // The shop, the paywall and Settings each mount this hook. One reconcile
    // per session, not one per navigation.
    const invoke = vi.fn().mockResolvedValue({
      data: { success: true, tier: "pro", gemsCredited: 0 },
      error: null,
    });
    installMocks({ plugin: makePlugin(), invoke });

    await mountPurchases();
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

    await mountPurchases();
    await new Promise((r) => setTimeout(r, 50));

    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("tries again next mount when the sync could not complete", async () => {
    // A launch that started offline must not disable the check for the rest of
    // the session.
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: new Error("offline") })
      .mockResolvedValue({
        data: { success: true, tier: "pro", gemsCredited: 0 },
        error: null,
      });
    installMocks({ plugin: makePlugin(), invoke });

    await mountPurchases();
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

    await mountPurchases();
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
  });

  it("stays out of it when nobody is signed in", async () => {
    const invoke = okInvoke();
    installMocks({ plugin: makePlugin(), invoke, user: null });

    await mountPurchases();
    await new Promise((r) => setTimeout(r, 50));

    expect(invoke).not.toHaveBeenCalled();
  });
});

describe("signing out and signing back in", () => {
  /**
   * "it works until i sign out from device and sign in again, then it didn't
   * remember I am pro, i think there is literally no effective process of
   * understanding if user is pro or not on login or app launch"
   *
   * Correct. The reconcile kept a set of user ids that was never emptied and
   * RevenueCat was never told about the sign-out, so `identifiedAs` and the
   * guard both still named the departing user. Signing back in — even as the
   * same account — matched the guard and skipped every check. Nothing else in
   * the app asks the store, so there was no second chance.
   */

  const syncedInvoke = () =>
    vi.fn().mockResolvedValue({
      data: { success: true, tier: "pro_plus", gemsCredited: 0 },
      error: null,
    });

  it("asks the store again on the next sign-in", async () => {
    const invoke = syncedInvoke();
    installMocks({ plugin: makePlugin(), invoke });

    await mountPurchases();
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

    const mod = await import("@/hooks/useInAppPurchases");
    await act(async () => {
      await mod.resetPurchaseIdentity();
    });

    await mountPurchases();

    await waitFor(
      () => expect(invoke).toHaveBeenCalledTimes(2),
      { timeout: 3000 },
    );
  });

  it("tells RevenueCat the account has left", async () => {
    // Otherwise the next purchase on this phone is attributed to whoever was
    // signed in before, which is how one subscription came to be spread over
    // two app user ids.
    const plugin = makePlugin();
    installMocks({ plugin, invoke: syncedInvoke() });

    await mountPurchases();
    const mod = await import("@/hooks/useInAppPurchases");
    await act(async () => {
      await mod.resetPurchaseIdentity();
    });

    expect(plugin.logOut).toHaveBeenCalled();
  });

  it("re-identifies rather than trusting the previous session", async () => {
    const plugin = makePlugin();
    installMocks({ plugin, invoke: syncedInvoke() });

    await mountPurchases();
    await waitFor(() => expect(plugin.logIn).toHaveBeenCalledTimes(1));

    const mod = await import("@/hooks/useInAppPurchases");
    await act(async () => {
      await mod.resetPurchaseIdentity();
    });
    await mountPurchases();

    await waitFor(() => expect(plugin.logIn).toHaveBeenCalledTimes(2));
  });

  it("survives a sign-out that never reaches signOut()", async () => {
    // An expired or revoked session sets user to null through
    // onAuthStateChange and never calls AuthContext.signOut, so the effect's
    // own signed-out branch has to clear the marker.
    const invoke = syncedInvoke();
    const { authState } = installMocks({ plugin: makePlugin(), invoke });

    await mountPurchases();
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

    const mod = await import("@/hooks/useInAppPurchases");

    // The session goes away underneath the app.
    authState.user = null;
    await act(async () => {
      renderHook(() => mod.useInAppPurchases());
      await new Promise((r) => setTimeout(r, 20));
    });

    // And the same account signs back in.
    authState.user = { id: "user-1" };
    await act(async () => {
      renderHook(() => mod.useInAppPurchases());
    });

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2), { timeout: 3000 });
  });

  it("re-identifies after a revoked session too, without AuthContext", async () => {
    // The guarantee must not depend on the sign-out having gone through
    // AuthContext.signOut. Whatever route the session left by, the next
    // sign-in has to re-identify before it syncs — otherwise it would ask
    // RevenueCat about an id it is no longer holding.
    const plugin = makePlugin();
    const { authState } = installMocks({ plugin, invoke: syncedInvoke() });

    await mountPurchases();
    await waitFor(() => expect(plugin.logIn).toHaveBeenCalledTimes(1));

    const mod = await import("@/hooks/useInAppPurchases");
    authState.user = null;
    await act(async () => {
      renderHook(() => mod.useInAppPurchases());
      await new Promise((r) => setTimeout(r, 20));
    });

    authState.user = { id: "user-1" };
    await act(async () => {
      renderHook(() => mod.useInAppPurchases());
    });

    await waitFor(() => expect(plugin.logIn).toHaveBeenCalledTimes(2), { timeout: 3000 });
  });
});

describe("coming back from the background", () => {
  it("re-checks entitlements, because the Apple ID may have changed", async () => {
    // A tester switches sandbox accounts in Settings with the app suspended.
    // The app user id does not move, so nothing else in the app notices.
    const invoke = vi.fn().mockResolvedValue({
      data: { success: true, tier: "pro", gemsCredited: 0 },
      error: null,
    });
    installMocks({ plugin: makePlugin(), invoke });

    await mountPurchases();
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

    // Past the throttle. A Date.now spy rather than vi.setSystemTime, which
    // wants fake timers installed — and installing those here would also
    // freeze the awaits this test depends on.
    const realNow = Date.now;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => realNow() + 61_000);
    try {
      await act(async () => {
        resume();
        await new Promise((r) => setTimeout(r, 50));
      });
      await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("keeps working when one of several mounted hooks unmounts", async () => {
    // The shop renders this hook and so does every useStorePrice on the same
    // page. Navigating away unmounts one of them; an unconditional teardown
    // would take the surviving one's resume handler with it and the app would
    // silently stop re-checking for the rest of the session.
    const invoke = vi.fn().mockResolvedValue({
      data: { success: true, tier: "pro", gemsCredited: 0 },
      error: null,
    });
    installMocks({ plugin: makePlugin(), invoke });

    const mod = await import("@/hooks/useInAppPurchases");
    const first = renderHook(() => mod.useInAppPurchases());
    const second = renderHook(() => mod.useInAppPurchases());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

    // One screen goes away; the other is still on top.
    second.unmount();

    const realNow = Date.now;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => realNow() + 61_000);
    try {
      await act(async () => {
        resume();
        await new Promise((r) => setTimeout(r, 50));
      });
      await waitFor(
        () => expect(invoke).toHaveBeenCalledTimes(2),
        { timeout: 3000 },
      );
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("does not re-check on every resume", async () => {
    // Backgrounding and foregrounding is not rare, and each check is a round
    // trip to RevenueCat through our own edge function.
    const invoke = vi.fn().mockResolvedValue({
      data: { success: true, tier: "pro", gemsCredited: 0 },
      error: null,
    });
    installMocks({ plugin: makePlugin(), invoke });

    await mountPurchases();
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

    await act(async () => {
      resume();
      resume();
      resume();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
