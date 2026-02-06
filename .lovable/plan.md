
# Fix: "გახდი PRO" Button Leads to 404

## Problem

The "გახდი PRO" button in `PlayLimitModal` navigates to `/pro` which doesn't exist, causing a 404 error.

| Component | Current Navigation | Expected |
|-----------|-------------------|----------|
| `PlayLimitModal.tsx` | `/pro` ❌ (404) | `/profile?tab=PRO` |
| `ProRequiredModal.tsx` | `/profile?tab=PRO` ✅ | `/profile?tab=PRO` |

---

## Solution

Update `PlayLimitModal.tsx` to navigate to `/profile?tab=PRO` (the PRO tab on the profile page) instead of the non-existent `/pro` route.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/home/PlayLimitModal.tsx` | Change navigation from `/pro` to `/profile?tab=PRO` |

---

## Technical Change

**Line 34** in `PlayLimitModal.tsx`:

```typescript
// Before
navigate("/pro");

// After
navigate("/profile?tab=PRO");
```

---

## Result

| Before | After |
|--------|-------|
| Click "გახდი PRO" → 404 page | Click "გახდი PRO" → Profile page PRO tab |
