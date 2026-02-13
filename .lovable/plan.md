

## Stop Showing Pro Gift Modal to Existing PRO Users

### Problem
When a PRO user signs in, the gift modal keeps appearing because:
1. During VIP status loading, `isVip` is `false`, so `useProGiftEligibility` returns `eligible: true`
2. The `proGiftDismissed` state in `Index.tsx` is plain React state — it resets every time the page loads or the user navigates back

### Solution
Two small fixes:

**File: `src/components/home/ProGiftBanner.tsx`**
- Change the eligibility check from `(!isVip || loading)` to `!isVip && !loading`
- This means: only show the gift when we have **confirmed** the user is NOT a VIP (loading must be finished)
- This prevents the modal from appearing during the brief window while VIP status loads

**File: `src/pages/Index.tsx`**
- Add an extra guard in the `useEffect` that opens the modal: also check `isVip` is false before opening
- This provides a double safety net so even if eligibility briefly flickers, the modal won't open for existing PRO users

### Files to Edit
- `src/components/home/ProGiftBanner.tsx` — 1 line change in eligibility logic
- `src/pages/Index.tsx` — add `!isVip` guard to the auto-open effect

