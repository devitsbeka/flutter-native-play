
# Remove No-Ads Icon and Center Logo in Header

## Problem
The header currently shows a no-ads (ad-free) icon button next to the bell notification icon on the right side. The user wants to remove this icon and ensure the logo stays centered.

---

## Current Header Layout

```text
┌─────────────────────────────────────────────┐
│  [☰]        MyTrivia LIVE        [AD] [🔔]  │
│  menu           logo              icons     │
└─────────────────────────────────────────────┘
```

## New Header Layout

```text
┌─────────────────────────────────────────────┐
│  [☰]        MyTrivia LIVE            [🔔]   │
│  menu           logo                 icon   │
└─────────────────────────────────────────────┘
```

---

## Technical Changes

### File: `src/pages/Index.tsx`

| Change | Lines | Description |
|--------|-------|-------------|
| Remove ad-free icon import | Line 40 | Remove `adFreeIcon` import (no longer needed) |
| Remove Ad-Free button | Lines 444-452 | Delete the entire Ad-Free button block from the header |

**Code to remove (lines 444-452):**
```tsx
{/* Ad-Free button */}
<motion.button
  className="relative p-2 rounded-full hover:bg-white/30 transition-colors"
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/profile?tab=PRO")}
>
  <img src={adFreeIcon} alt="Ad-Free" className="w-6 h-6 object-contain" />
</motion.button>
```

---

## Visual Result

The logo will remain centered because the current CSS structure already handles this:
- Logo container has `flex-1` and `justify-center`
- The bell icon on the right will balance against the burger menu on the left
- The layout naturally keeps the logo in the center

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove ad-free icon import and remove the Ad-Free button from header |
