

# Plan: Replace Category Round Loading Emoji with Puzzle-Sphere Icon

## Summary

Replace the emoji shown during the "კითხვების გენერირება..." (question generation) loading screen with the uploaded puzzle-sphere icon.

---

## Current Behavior

| Screen | Current |
|--------|---------|
| Quiz loading ("კითხვების გენერირება...") | Category emoji (e.g., 🤯 exploding head) or fallback 🎯 |

## New Behavior

| Screen | New |
|--------|-----|
| Quiz loading ("კითხვების გენერირება...") | Puzzle-sphere 3D icon (rotating animation) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/assets/icons/` | Add `puzzle-sphere.png` (loading icon) |
| `src/pages/CategoryQuizPage.tsx` | Replace emoji with puzzle-sphere image |

---

## Technical Implementation

### 1. Copy Puzzle-Sphere Icon

Copy the uploaded puzzle-sphere icon to `src/assets/icons/puzzle-sphere.png` for use in the loading screen.

### 2. Update CategoryQuizPage.tsx

**Lines 771-778** - Replace emoji with image:

```typescript
import puzzleSphereIcon from "@/assets/icons/puzzle-sphere.png";

// In the loading return block:
<div className="text-center">
  <motion.img
    src={puzzleSphereIcon}
    alt="Loading"
    className="w-16 h-16 mx-auto mb-4"
    animate={{ rotate: 360 }}
    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
  />
  <p className="text-muted-foreground">კითხვების გენერირება...</p>
</div>
```

---

## Visual Result

**Before:**
```text
┌─────────────────────────┐
│                         │
│          🤯             │  ← Category emoji (inconsistent)
│                         │
│  კითხვების გენერირება... │
└─────────────────────────┘
```

**After:**
```text
┌─────────────────────────┐
│                         │
│    [Puzzle Sphere]      │  ← Consistent 3D icon (rotating)
│                         │
│  კითხვების გენერირება... │
└─────────────────────────┘
```

---

## Summary of Changes

1. Copy `puzzle-sphere.png` to `src/assets/icons/`
2. Update `CategoryQuizPage.tsx` to import and use the puzzle-sphere image instead of emoji
3. Keep the rotating animation but apply it to the image element

