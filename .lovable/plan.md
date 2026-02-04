
# Plan: Fix UI Jumping/Flashing Issues

## Problem Summary

Two separate layout instability issues:

1. **Category Picker Icon Flashing**: On the library view, category icons flash/jump as they load (skeleton → icon transition with scale animation)
2. **Game Screen Content Shifting**: When opponents answer, the "answered indicator" appears and pushes all content down, causing visible layout shift

---

## Issue 1: Category Picker Icon Flash

### Root Cause

In `CategoryPickerModal.tsx` (line 348), `DynamicIcon` components:
- Start with a pulsing skeleton placeholder
- Animate in with `opacity: 0 → 1` and `scale: 0.9 → 1`
- This creates a visual "pop" effect multiplied across all category cards

### Solution

Set a **fixed container size** for the icon area in the category cards, so the skeleton and the loaded icon occupy the same space without layout shift. The icons already have a fixed container (`w-10 h-10`), but the `DynamicIcon` animation is causing the flash.

**Change**: Remove or reduce the scale animation on `DynamicIcon` when used in lists, or ensure the icon container clips overflow to prevent visual expansion.

**Files to modify:**
- `src/components/team/CategoryPickerModal.tsx` - Add `overflow-hidden` to icon container

---

## Issue 2: Game Screen Layout Shift

### Root Cause

In `MultiplayerGameScreenV2.tsx` (lines 278-291), the answered indicator appears/disappears dynamically:

```jsx
{answeredCount > 0 && !answerRevealed && (
  <motion.div className="px-4 mb-2">
    ...
  </motion.div>
)}
```

When this element appears/disappears:
- Question card shifts down/up by ~30px
- Answer buttons follow, causing a jump

### Solution

**Reserve fixed space** for the answered indicator so it doesn't shift content. Use opacity/visibility instead of conditionally rendering, OR place it in a position that doesn't affect the main layout flow (e.g., absolutely positioned).

**Option A (Recommended)**: Keep the indicator in the flow but always reserve its height. When hidden, show a transparent placeholder of the same size.

**Option B**: Absolutely position the indicator overlay so it doesn't affect layout.

**Files to modify:**
- `src/components/team/MultiplayerGameScreenV2.tsx` - Change answered indicator to use fixed height container

---

## Technical Changes

### File 1: `src/components/team/CategoryPickerModal.tsx`

**Location: Line 344** - Add `overflow-hidden` to prevent scale animation spillover

```diff
  <div 
-   className="w-10 h-10 rounded-lg flex items-center justify-center"
+   className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
    style={{ backgroundColor: `${cat.color}40` }}
  >
```

### File 2: `src/components/team/MultiplayerGameScreenV2.tsx`

**Location: Lines 278-291** - Change from conditional rendering to always-present container with visibility toggle

```diff
- {/* Answered indicator */}
- {answeredCount > 0 && !answerRevealed && (
-   <motion.div
-     initial={{ opacity: 0, y: -10 }}
-     animate={{ opacity: 1, y: 0 }}
-     className="px-4 mb-2"
-   >
-     <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-white/10 mx-auto w-fit">
-       <span className="text-white/80 text-xs">
-         {answeredCount}/{opponents.length} {t("game.answered")}
-       </span>
-     </div>
-   </motion.div>
- )}
+ {/* Answered indicator - fixed height container to prevent layout shift */}
+ <div className="px-4 h-8 flex items-center justify-center">
+   <motion.div
+     initial={false}
+     animate={{ 
+       opacity: answeredCount > 0 && !answerRevealed ? 1 : 0,
+       scale: answeredCount > 0 && !answerRevealed ? 1 : 0.9
+     }}
+     transition={{ duration: 0.15 }}
+     className="py-1.5 px-3 rounded-full bg-white/10"
+   >
+     <span className="text-white/80 text-xs">
+       {answeredCount}/{opponents.length} {t("game.answered")}
+     </span>
+   </motion.div>
+ </div>
```

This change:
1. Always renders a fixed-height container (`h-8`)
2. Uses opacity/scale animation instead of conditional rendering
3. Prevents any layout shift when opponents answer

---

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Category picker icons load | Flash/pop as each loads | Smooth fade-in without size changes |
| Opponent answers during game | Question card jumps down | No movement, indicator fades in smoothly |
| All opponents answered | Indicator disappears, card jumps up | Indicator fades out, no movement |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/CategoryPickerModal.tsx` | Add `overflow-hidden` to icon container |
| `src/components/team/MultiplayerGameScreenV2.tsx` | Replace conditional rendering with fixed-height opacity animation |
