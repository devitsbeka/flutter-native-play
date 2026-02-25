

## Fix: PRO Status Showing as Active for Expired Users + Play Button in Burger Menu

### Issue 1: Non-PRO User Sees "PRO Active" on Profile

**Root Cause:** `Profile.tsx` passes `subscription?.vip_tier` as `currentTier` to `ProPlansSection` without checking if the subscription is actually active (`isVip`). When a subscription expires, the database row still exists with `vip_tier = 'standard'`, so the profile page incorrectly shows "PRO - Active".

**Fix in `src/pages/Profile.tsx`:**
- Change line 36 from:
  ```ts
  const currentTier = subscription?.vip_tier as ProTier | undefined;
  ```
  to:
  ```ts
  const currentTier = isVip ? (subscription?.vip_tier as ProTier | undefined) : undefined;
  ```
- Similarly fix `getProLabel()` (line 41) and `friendInvitesRemaining` (line 37) to also gate on `isVip`.

This ensures that when `isVip` is false (subscription expired), `currentTier` is `undefined`, and `ProPlansSection` correctly shows the "Not PRO" scenario with both tier purchase cards.

---

### Issue 2: Play Button in Burger Menu Doesn't Show Play Limit Modal

**Root Cause:** The `SideMenuDrawer` has `z-[60]` (line 138) and covers the entire screen. When `guardPlay()` returns false and opens the `PlayLimitModal`/`InviteFriendsModal` (rendered by `PlayGuardProvider`), those modals appear behind the drawer and are invisible to the user.

**Fix in `src/components/home/SideMenuDrawer.tsx`:**
- In `handlePlayClick` (lines 51-55), close the drawer before the guard modals appear:
  ```ts
  const handlePlayClick = () => {
    const allowed = guardPlay(() => {
      onClose();
      navigate('/game');
    });
    if (!allowed) {
      onClose(); // Close drawer so the play-limit modal is visible
      return;
    }
    onClose();
    navigate('/game');
  };
  ```

This ensures the drawer closes first, allowing the invite/play-limit modals from `PlayGuardProvider` to be visible on screen.

---

### Files to Edit
1. **`src/pages/Profile.tsx`** -- Gate `currentTier` on `isVip` so expired subscriptions show as non-PRO
2. **`src/components/home/SideMenuDrawer.tsx`** -- Close drawer when play is blocked so modals are visible
