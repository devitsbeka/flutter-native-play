// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

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

  vi.doMock("@/integrations/supabase/client", () => ({
    supabase: { functions: { invoke: opts.invoke } },
  }));

  vi.doMock("@/hooks/useAuth", () => ({
    useAuth: () => ({
      user: opts.user === undefined ? { id: "user-1" } : opts.user,
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

  return { applyEntitlement, refreshVip, setProfileLocal, fetchProfile };
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

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  // Unconditionally, not just on the happy path. The hang test switches to
  // fake timers and restored them only at its own end, so a failure there left
  // every later test running on a frozen clock — which showed up once as the
  // restore-failure case flaking in a full run and passing in isolation.
  vi.useRealTimers();
  vi.doUnmock("@capacitor/core");
  vi.doUnmock("@revenuecat/purchases-capacitor");
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
    installMocks({ plugin: makePlugin(), invoke: okInvoke(), isVip: true });

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

    const mod = await import("@/hooks/useInAppPurchases");
    const { result } = renderHook(() => mod.useInAppPurchases());

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
