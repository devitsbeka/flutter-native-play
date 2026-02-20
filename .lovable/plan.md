

## Fix: Instant PRO Status After Referral Acceptance

### Root Cause

`VipContext.tsx` fetches VIP status only once when `user` changes (line 124). There is **no realtime subscription** on the `vip_subscriptions` table. So when `process_referral_reward` RPC inserts/updates the subscription row in the database, the friend's app still shows the old cached state (5/5 free games) until a manual refresh or re-mount.

Additionally, on `Auth.tsx` line 129-132, the `process_referral_reward` RPC runs **after** the signup completes and the navigation happens. The VipContext effect fires on `user` change, but there's a race condition -- it may fetch before the RPC finishes writing the VIP row.

### Fix

**File: `src/contexts/VipContext.tsx`**

Add a Supabase realtime subscription on `vip_subscriptions` so VIP status updates instantly when the DB row is inserted or updated:

1. Inside the existing `useEffect` (line 87-125), after `fetchVipStatus()`, subscribe to realtime changes on `vip_subscriptions` filtered by `user_id`
2. On any `INSERT` or `UPDATE` event, re-run `fetchVipStatus()` to refresh the local state
3. Clean up the channel on unmount

This is the same pattern already used in `useCategoryPlayLimit.ts` (which subscribes to `user_level_progress` changes).

### Technical Details

```text
// Add to the existing useEffect in VipContext.tsx after fetchVipStatus():

const channel = supabase
  .channel("vip-status-realtime")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "vip_subscriptions",
      filter: `user_id=eq.${user.id}`,
    },
    () => { fetchVipStatus(); }
  )
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

This single change ensures:
- When `process_referral_reward` inserts a VIP row for the friend, the realtime event fires and the friend's VipContext immediately updates `isVip = true`
- The `usePlayLimit` hook (which depends on `useVipStatus`) will instantly reflect `canPlay = true`
- No race condition -- even if the initial fetch misses the row, the realtime event catches it within seconds

No new files or dependencies needed.
