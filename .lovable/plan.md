

## Fix: Jumpy Avatars on TV Question Screen

### Problem
When a new question appears, all player avatars reset to the center "waiting" zone with yellow indicators. As players answer, avatars animate to left (wrong) or right (correct). The jumping happens because:

1. **`layout` prop on every avatar** triggers Framer Motion's layout animation system, which measures and animates position changes every render -- causing small continuous shifts
2. **`AnimatePresence mode="popLayout"`** on the center zone removes elements from document flow instantly during exit, causing remaining avatars to jump sideways before the exit animation completes
3. **`flex-1` on the center zone** means its width dynamically shrinks/grows as the left/right zones gain players, shifting the center position of remaining avatars

### Fix

**File: `src/components/tv/TVQuestionScreenV4.tsx`**

1. **Remove `layout` prop** from all three zones' `motion.div` elements (lines 127, 153, 186). This stops Framer Motion from continuously measuring and animating position changes.

2. **Change center zone `AnimatePresence mode="popLayout"` to `mode="sync"`** (line 144). This prevents the instant-removal-from-flow behavior that causes the remaining avatars to jump left when one exits.

3. **Give the center waiting zone a stable width** by adding `min-w-0` and centering with `items-center` instead of relying on `flex-1` which causes width fluctuation. Use absolute positioning or fixed min-width for the left/right zones so the center doesn't reflow.

4. **Use simpler exit animations** for waiting players: fade out only (no scale) to reduce visual jitter during transitions.

These changes ensure avatars appear centered and stable when a new question loads, and smoothly fade out (rather than jump) when a player answers.
