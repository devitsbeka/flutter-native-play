
# Plan: Fix TV Lobby Screen Issues

## Issues to Address

Based on the screenshots:

### Issue 1: Avatar Strokes - Should be Inside (Inset Border)
**File:** `src/components/tv/TVLobbyScreenV2.tsx`

**Current (line 573-579):**
```tsx
className={`... border-2 border-purple-400/50 ...`}
```

Border is currently default `border-box` which places stroke on the outside.

**Fix:** Use CSS `box-shadow: inset` to create an inner border effect instead of regular border, or add `outline` with negative offset.

Best approach: Use `ring-inset` or shadow inset:
```tsx
className="... ring-2 ring-inset ring-purple-400/50 ..."
```

---

### Issue 2: Host Crown z-index Issue
**File:** `src/components/tv/TVLobbyScreenV2.tsx`

**Current (line 584-592):**
```tsx
<motion.div className="absolute -top-1 -right-1 w-5 h-5 ...">
  <Crown className="w-3 h-3 text-yellow-900" />
</motion.div>
```

The crown appears behind content because parent has no `z-index` control.

**Fix:** Add `z-10` to ensure crown stays in front:
```tsx
<motion.div className="absolute -top-1 -right-1 w-5 h-5 z-10 ...">
```

---

### Issue 3: Category Pills Full Width + No Cropping
**File:** `src/components/tv/TVLobbyScreenV2.tsx`

**Current (lines 409-434):**
- Container has `pr-[240px]` which leaves space for QR but limits width
- Pills container has `overflow-x-auto` but still can crop

The second screenshot shows categories being cropped on wide screens.

**Fix:**
1. Remove or reduce the `pr-[240px]` padding restriction
2. Use `flex-wrap` instead of `overflow-x-auto` so categories wrap to next line
3. Ensure pills span full width of available space (excluding QR code area)

```tsx
<div className="mb-4"> {/* Remove pr-[240px] */}
  <div className="flex flex-wrap gap-2 py-3 pr-60">
    {/* Pills will wrap, QR code positioned absolutely */}
  </div>
</div>
```

---

### Issue 4: MyTriviaLive Logo - Centered, QR in Bottom-Right
**File:** `src/components/tv/TVLobbyScreenV2.tsx`

**Current (lines 748-766):**
- Logo is positioned `absolute bottom-4 right-4` (bottom-right)
- User wants: Logo centered at bottom, QR/code stays bottom-right

**Fix:** 
1. Move the MyTriviaLiveLogo to be **centered** at the bottom
2. Keep QR code section in the right area (it's already there in the main layout)
3. Move the code display below the QR in the right panel

New layout:
```
+------------------------------------------+
|  [QR Code]    <- right side panel        |
|  mytrivia.io/join                        |
|  [CODE: 1234]                            |
+------------------------------------------+
|        [MyTrivia LIVE] <- centered       |
+------------------------------------------+
```

---

## Implementation Details

### Changes to `src/components/tv/TVLobbyScreenV2.tsx`

**1. Fix avatar strokes (inset border)**
```tsx
// Line ~573-579: Change from border-2 to ring-inset
className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 ${
  isActivePlayer 
    ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 ring-2 ring-inset ring-purple-400/50' 
    : isInvited
      ? 'bg-white/5 border-2 border-dashed border-purple-400/30'
      : 'bg-white/5 border-2 border-dashed border-purple-500/30'
}`}
```

**2. Fix host crown z-index**
```tsx
// Line ~585-591: Add z-10
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg z-10"
>
```

**3. Fix category pills full width**
```tsx
// Line ~409: Remove pr-[240px] restriction, allow wrapping
<div className="mb-4">
  {hasMultiRound ? (
    <div
      className="flex flex-wrap gap-2 py-3"
      // Remove overflow-x-auto, allow natural wrapping
    >
```

**4. Center MyTriviaLive logo**
```tsx
// Lines 748-766: Replace with centered logo
<div className="absolute bottom-4 left-1/2 -translate-x-1/2">
  <MyTriviaLiveLogo size="md" textColor="light" />
</div>
```

Also need to import `MyTriviaLiveLogo`:
```tsx
import { MyTriviaLiveLogo } from '@/components/shared/MyTriviaLiveLogo';
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tv/TVLobbyScreenV2.tsx` | Import MyTriviaLiveLogo, fix inset borders, z-index for crown, full-width categories, centered logo |

---

## Summary

| Issue | Current | Fix |
|-------|---------|-----|
| Avatar strokes | `border-2` (outside) | `ring-2 ring-inset` (inside) |
| Host crown | No z-index | Add `z-10` |
| Category pills | `pr-[240px]`, `overflow-x-auto` | `flex-wrap`, no truncation |
| Logo position | Bottom-right | Bottom-center, use `MyTriviaLiveLogo` component |
