

## Fix: Smooth Icon Rendering Without Glitches

### Problem

Icons across the app (icon picker, category picker modal, category cards, quiz screens) exhibit visual glitches -- they "pop in" with a scale/opacity animation every time the component mounts or the icon URL resolves. This is jarring and looks broken.

### Root Causes

1. **`DynamicIcon` uses `motion.img` with entrance animation** (`initial: opacity 0, scale 0.9` -> `animate: opacity 1, scale 1`) that fires on every mount and every URL change
2. **Double animation stacking**: `QuizCategoryIcon` wraps `DynamicIcon` in yet another `motion.div` with its own entrance animation -- so icons get two overlapping pop-in effects
3. **URL resolution flicker**: When `DynamicIcon` resolves an icon, it can go through up to 3 visual states in quick succession: skeleton -> wrong fallback URL -> correct async URL. Each URL change forces a new `motion.img` element (due to the `key` prop), replaying the entrance animation
4. **Aggressive skeleton display**: The `isResolvingIcon` state shows a pulsing skeleton placeholder even when the previous icon could remain visible, creating a flash

### Technical Changes

**File: `src/components/shared/DynamicIcon.tsx`**

- Replace `motion.img` with a plain `img` element. Instead of a spring animation on mount, use a simple CSS opacity transition that only applies when the image first loads (via an `onLoad` handler), making icons appear smoothly without the "pop" effect
- Remove the `key` prop that forces React to destroy and recreate the `img` element on every URL change. Instead, update `src` in place so the browser handles the transition naturally
- Keep the `onError` retry logic intact
- Remove `framer-motion` import (no longer needed in this file)

```
Before: motion.img with key={url-retryCount}, initial scale 0.9
After:  plain img with CSS fade-in on load, no scale animation
```

**File: `src/components/ui/quiz-category-icon.tsx`**

- Remove the outer `motion.div` wrapper's entrance animation (`initial: opacity 0, scale 0.9`). Replace with a plain `div` -- since `DynamicIcon` itself will now handle smooth rendering, the extra wrapper animation is unnecessary and was causing the double-pop
- Keep the loading state glow animations (those are intentional visual effects during question generation)

### What This Fixes

- Icon picker grid: Icons appear instantly without individual pop-in animations
- Category picker modal: Category icons in the 2-column grid render cleanly
- Category cards on discover page: `DynamicIcon` inside cards won't flash/scale on each render
- Quiz screens: `QuizCategoryIcon` renders smoothly without double animations
- No more skeleton flashes when icons are already cached or quickly resolved

### Files Changed
- `src/components/shared/DynamicIcon.tsx` (replace motion.img with smooth CSS fade)
- `src/components/ui/quiz-category-icon.tsx` (remove redundant entrance animation)
