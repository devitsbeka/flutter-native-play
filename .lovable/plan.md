
# Plan: Vertical Centering in GameModal & Fix Stretched Elements on Desktop/Tablet

## Problem Analysis

From the screenshot, there are two distinct issues:

### Issue 1: Content Not Vertically Centered in Full-Screen Modal
The `PowerUpTutorialModal` (and all modals using `fullScreen` mode) show content at the top of the screen with large empty space at the bottom. Users expect content to be vertically centered with equal padding from top and bottom.

**Current behavior:**
```text
┌─────────────────────────┐
│ Header                  │
├─────────────────────────┤
│ 💡 Subtitle             │  ← Content stuck at top
│ 🎯 Icon                 │
│ Title                   │
│ Description             │
│ Tip box                 │
│ ● ○ ○ ○                 │
│                         │
│                         │  ← Large empty space
│                         │
├─────────────────────────┤
│ Footer                  │
└─────────────────────────┘
```

**Target behavior:**
```text
┌─────────────────────────┐
│ Header                  │
├─────────────────────────┤
│                         │  ← Equal padding top
│ 💡 Subtitle             │
│ 🎯 Icon                 │
│ Title                   │  ← Content vertically centered
│ Description             │
│ Tip box                 │
│ ● ○ ○ ○                 │
│                         │  ← Equal padding bottom
├─────────────────────────┤
│ Footer                  │
└─────────────────────────┘
```

### Issue 2: Elements Stretched Too Wide on Desktop/Tablet
The full-screen modal content area and footer stretch to full width, which looks poor on large screens. Need to constrain content to max-width while keeping it centered.

---

## Solution

| File | Change |
|------|--------|
| `src/components/ui/game-modal.tsx` | Add vertical centering wrapper for content in fullScreen mode + add max-width constraints for desktop/tablet |

---

## Technical Changes

### 1. Update fullScreen content area to vertically center content

The scrollable content area currently uses `flex-1 overflow-y-auto` but doesn't center its content. We need to:
- Add `flex flex-col items-center justify-center` to the scrollable area for vertical centering
- Wrap content in a max-width container for desktop/tablet

**Before (lines 198-267):**
```tsx
<motion.div 
  className={cn("flex-1 overflow-y-auto", className)}
  ...
>
  {/* Subtitle */}
  {subtitle && <div className="px-5 pt-4 pb-2 text-center">...</div>}
  {/* Icon */}
  {(icon || iconEmoji) && <div className="flex justify-center pt-4 pb-2">...</div>}
  {/* Main content */}
  <div className="px-6 pb-5">
    {children}
  </div>
</motion.div>
```

**After:**
```tsx
<motion.div 
  className={cn("flex-1 overflow-y-auto flex flex-col", className)}
  ...
>
  {/* Centered content wrapper with max-width for tablet/desktop */}
  <div className="flex-1 flex flex-col justify-center w-full max-w-xl mx-auto py-6">
    {/* Sparkles */}
    {showSparkles && ...}
    {/* Stars */}
    {showStars && ...}
    {/* Subtitle */}
    {subtitle && <div className="px-5 pb-2 text-center">...</div>}
    {/* Icon */}
    {(icon || iconEmoji) && <div className="flex justify-center pb-2">...</div>}
    {/* Main content */}
    <div className="px-6 pb-5">
      {children}
    </div>
  </div>
</motion.div>
```

### 2. Constrain footer max-width on large screens

**Before (line 272):**
```tsx
<motion.div className="sticky bottom-0 px-5 py-4 border-t ...">
  {effectiveFooter}
</motion.div>
```

**After:**
```tsx
<motion.div className="sticky bottom-0 px-5 py-4 border-t ...">
  <div className="w-full max-w-xl mx-auto">
    {effectiveFooter}
  </div>
</motion.div>
```

---

## Visual Result

**On Desktop/Tablet:**
```text
┌────────────────────────────────────────────────┐
│              Header (full width)               │
├────────────────────────────────────────────────┤
│                                                │
│              ┌──────────────────┐              │
│              │   💡 Subtitle    │              │
│              │      🎯 Icon     │              │
│              │      Title       │              │ ← Centered, max-w-xl
│              │   Description    │              │
│              │     Tip box      │              │
│              │    ● ○ ○ ○       │              │
│              └──────────────────┘              │
│                                                │
├────────────────────────────────────────────────┤
│              ┌──────────────────┐              │
│              │   Footer button  │              │ ← Centered, max-w-xl
│              └──────────────────┘              │
└────────────────────────────────────────────────┘
```

**On Mobile (unchanged):**
```text
┌─────────────────────────┐
│ Header                  │
├─────────────────────────┤
│                         │
│ 💡 Subtitle             │
│ 🎯 Icon                 │
│ Title                   │ ← Content centered
│ Description             │
│ Tip box                 │
│ ● ○ ○ ○                 │
│                         │
├─────────────────────────┤
│ Footer button           │
└─────────────────────────┘
```

---

## Summary

1. **Add vertical centering** to fullScreen modal content area using `flex flex-col justify-center`
2. **Constrain max-width** of content and footer to `max-w-xl` (576px) for desktop/tablet
3. **Center horizontally** with `mx-auto` on large screens
4. **Equal padding** top and bottom using `py-6` and flex centering
