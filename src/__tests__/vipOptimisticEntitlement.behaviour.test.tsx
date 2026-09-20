// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * A purchase must outrank a database that has not caught up.
 *
 * `applyEntitlement` turns PRO on from a StoreKit-verified purchase and then
 * asks the server to confirm it. Those two raced, and the server won: the
 * re-read landed a few hundred milliseconds later, found the row that was there
 * *before* the purchase — absent, or present and expired — and set `isVip` back
 * to false. verify-receipt takes ~3.5s on a device, so it had not written
 * anything yet.
 *
 * The optimistic update reverted itself. A completed PRO purchase showed its
 * success modal over a UI that still said non-PRO, which then sent the player
 * back to the paywall to buy it again.
 *
 * The 13 purchase tests did not catch this: they assert that
 * `applyEntitlement` is CALLED, which it always was. What was broken is what
 * happened inside VipContext afterwards, so that is what this exercises.
 */

const EXPIRED = new Date(Date.now() - 86_400_000).toISOString();
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

/** Rows the vip_subscriptions read returns, one per successive call. */
function installSupabase(rows: Array<Record<string, unknown> | null>) {
  let call = 0;
  const maybeSingle = vi.fn(async () => ({ data: rows[Math.min(call++, rows.length - 1)], error: null }));

  vi.doMock("@/integrations/supabase/client", () => ({
    supabase: {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle }) }),
        update: () => ({ eq: async () => ({ data: null, error: null }) }),
      }),
      // ensureAdminLifetimePro runs on mount and calls this; without it the
      // provider throws into an unhandled rejection and muddies the output.
      rpc: async () => ({ data: null, error: null }),
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: () => {},
    },
  }));

  vi.doMock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
  vi.doMock("@/lib/toast", () => ({
    toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn(), message: vi.fn() }),
  }));
  vi.doMock("@/utils/standaloneTranslation", () => ({ t: (k: string) => k }));

  return { maybeSingle };
}

async function mountVip() {
  const mod = await import("@/contexts/VipContext");
  const wrapper = ({ children }: { children: ReactNode }) =>
    mod.VipProvider({ children }) as any;
  const { result } = renderHook(() => mod.useVipStatus(), { wrapper });
  return result;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  try { localStorage.clear(); } catch { /* jsdom */ }
});

describe("an entitlement applied from a purchase is not revoked by a stale row", () => {
  it("survives a reconcile that still shows the OLD expired row", async () => {
    // The exact shape of the bug: an admin/old row that has already expired.
    installSupabase([{ user_id: "user-1", vip_tier: "pro", expires_at: EXPIRED }]);
    const result = await mountVip();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isVip).toBe(false);

    await act(async () => {
      result.current.applyEntitlement("pro_plus", FUTURE);
    });

    // The reconcile fires immediately from inside applyEntitlement.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(
      result.current.isVip,
      "the optimistic entitlement was clobbered by its own reconciling fetch — " +
        "this is the bug that made a completed PRO purchase show non-PRO",
    ).toBe(true);
  });

  it("survives a reconcile that finds no row at all", async () => {
    installSupabase([null]);
    const result = await mountVip();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.applyEntitlement("pro", FUTURE);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isVip).toBe(true);
  });

  it("adopts the server's row once it confirms the purchase", async () => {
    // First read: the stale row. Second: what verify-receipt wrote.
    installSupabase([
      { user_id: "user-1", vip_tier: "pro", expires_at: EXPIRED },
      { user_id: "user-1", vip_tier: "pro_plus", expires_at: FUTURE },
    ]);
    const result = await mountVip();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.applyEntitlement("pro_plus", FUTURE);
    });

    await waitFor(
      () => expect(result.current.subscription?.vip_tier).toBe("pro_plus"),
      { timeout: 4000 },
    );
    expect(result.current.isVip).toBe(true);
  });

  it("does not revoke a live subscription when the row briefly goes unreadable", async () => {
    // RLS hides the row around a token refresh, on resume, and on a cold
    // launch — the read returns null with no error. Revoking on that is what
    // made PRO blink off on a live subscriber, turn the shop card back into a
    // Buy button, and produce Apple's "already subscribed" sheet followed by
    // our own congratulations.
    installSupabase([
      { user_id: "user-1", vip_tier: "pro", expires_at: FUTURE }, // confirmed live
      null,                                                       // then unreadable
      null,
      null,
    ]);
    const result = await mountVip();
    await waitFor(() => expect(result.current.isVip).toBe(true));

    await act(async () => {
      result.current.refresh();
      await new Promise((r) => setTimeout(r, 3200)); // past both 1200ms retries
    });

    expect(
      result.current.isVip,
      "a transient empty read revoked a confirmed subscription",
    ).toBe(true);
  });

  it("still revokes normally when no purchase is in flight", async () => {
    // The grace window must not become a way to never lose PRO. A cancellation
    // or expiry with no purchase behind it has to take effect.
    installSupabase([{ user_id: "user-1", vip_tier: "pro", expires_at: EXPIRED }]);
    const result = await mountVip();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(
      result.current.isVip,
      "an expired subscription still reads as PRO — the grace window is " +
        "suppressing a genuine downgrade",
    ).toBe(false);
  });
});

describe("what is left behind on sign-out", () => {
  it("does not leave a cached PRO flag for the next account", async () => {
    // `isVip` is seeded from localStorage so the first paint does not flicker.
    // It is a hint that belongs to ONE account, and it was never cleared — so
    // after a PRO user signed out, the next person to sign in on that phone
    // started the session believing they were PRO, and a signed-out device
    // kept rendering PRO surfaces.
    installSupabase([{ user_id: "user-1", vip_tier: "pro", expires_at: FUTURE }]);
    const result = await mountVip();
    await waitFor(() => expect(result.current.isVip).toBe(true));
    expect(localStorage.getItem("cached_vip_status")).toBe("true");

    // Sign out: same provider, no user.
    vi.resetModules();
    vi.doMock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        from: () => ({
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          update: () => ({ eq: async () => ({ data: null, error: null }) }),
        }),
        rpc: async () => ({ data: null, error: null }),
        auth: { getUser: async () => ({ data: { user: null }, error: null }) },
        channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
        removeChannel: () => {},
      },
    }));
    vi.doMock("@/lib/toast", () => ({
      toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn(), message: vi.fn() }),
    }));
    vi.doMock("@/utils/standaloneTranslation", () => ({ t: (k: string) => k }));

    const signedOut = await mountVip();
    await waitFor(() => expect(signedOut.current.isVip).toBe(false));

    expect(
      localStorage.getItem("cached_vip_status"),
      "the next account to sign in on this phone inherits a PRO flag",
    ).toBeNull();
  });
});
