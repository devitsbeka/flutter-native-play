
# Fix: Referral Users Should Instantly Get PRO Status

## Problem
When a user registers via an invitation link, the `process_referral_reward` RPC creates a VIP subscription in the database, but when they land on the home page there's a race condition: `VipContext` may fetch VIP status before the subscription row is fully committed, or before the auth session is ready. This causes the play button to show as non-PRO (with play limit) instead of the yellow PRO state with unlimited plays.

## Root Cause
1. In `Auth.tsx`, after `signUp()`, the referral reward RPC runs and then immediately navigates to `/`
2. On Index, `VipContext` fetches `vip_subscriptions` but may not find the new row yet (race condition)
3. The localStorage VIP cache is still `"false"` from before signup
4. The realtime subscription also may not fire fast enough

## Solution
Use the existing `referral_welcome` sessionStorage flag (already set in Auth.tsx after referral signup) to **optimistically set VIP status** in VipContext before the DB fetch completes. This ensures instant PRO UI on the home page.

## Changes

### 1. `src/contexts/VipContext.tsx` -- Optimistic VIP for referral signups
- In the initial `isVip` state initializer, also check `sessionStorage.getItem("referral_welcome")` -- if present, start as `true`
- In the `useEffect` that fetches VIP status, if `referral_welcome` flag exists in sessionStorage, set `isVip = true` and `localStorage(VIP_CACHE_KEY, "true")` immediately, then still fetch from DB (the DB fetch will confirm and set the subscription object)
- Add a retry mechanism: if the first fetch returns no subscription but `referral_welcome` was set, retry after 1.5s (the RPC may still be committing)

### 2. `src/pages/Index.tsx` -- Ensure FriendJoinedModal doesn't block play
- When the FriendJoinedModal closes (for "invited" variant), don't show any additional blocking modals -- the user should be able to play immediately with their new PRO status

## Technical Details

**VipContext.tsx changes:**
```typescript
// In the useState initializer for isVip, add referral check:
const [isVip, setIsVip] = useState(() => {
  try {
    // Referral signup: optimistically set PRO
    if (sessionStorage.getItem("referral_welcome")) {
      localStorage.setItem(VIP_CACHE_KEY, "true");
      return true;
    }
    const cached = localStorage.getItem(VIP_CACHE_KEY);
    return cached === "true";
  } catch {
    return false;
  }
});

// In fetchVipStatus, add retry for referral users:
const fetchVipStatus = async (retryCount = 0) => {
  try {
    const { data, error } = await supabase
      .from("vip_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setSubscription(data as VipSubscription);
      const isActive = isAfter(new Date(data.expires_at), new Date());
      setIsVip(isActive);
      try { localStorage.setItem(VIP_CACHE_KEY, String(isActive)); } catch {}
    } else if (sessionStorage.getItem("referral_welcome") && retryCount < 2) {
      // Referral reward RPC may still be processing -- retry
      setTimeout(() => fetchVipStatus(retryCount + 1), 1500);
      // Keep optimistic VIP status while retrying
      return;
    } else {
      setSubscription(null);
      setIsVip(false);
      try { localStorage.setItem(VIP_CACHE_KEY, "false"); } catch {}
    }
  } catch (error) {
    console.error("[VipContext] Error fetching VIP status:", error);
  } finally {
    if (retryCount === 0) setLoading(false);
  }
};
```

## Files to edit
1. `src/contexts/VipContext.tsx` -- Optimistic VIP status for referral signups with retry
