
# Plan: Fix Game Screen Layout for Small Viewports

## Problem Analysis

From the screenshots, the 4th answer option is being cut off at the bottom:
- **Image 1**: The "დ" (D) answer option overlaps with power-up icons
- **Image 2**: After answering, the "შემდეგი კითხვა" button appears at the very bottom edge

The current layout issues:
1. Answer buttons area uses `flex-1` but has `overflow-visible` which doesn't constrain content
2. Power-up icons are 64px tall with additional 24px badge = ~88px total height
3. Combined with safe area and padding, the bottom section takes ~110-120px
4. No responsive height adjustments for small screens (under 700px height)

---

## Technical Solution

### File: `src/components/game/QuizGameScreenProd.tsx`

#### 1. Answer Buttons Area (lines 437-466)

Change from `flex-1 overflow-visible` to `flex-1 overflow-y-auto` with proper constraints:

```text
Current:
flex-1 px-4 mt-0 flex flex-col gap-4 [@media(max-height:700px)]:gap-2.5 overflow-visible min-h-0 pb-2

Change to:
flex-1 px-4 mt-0 flex flex-col gap-3 [@media(max-height:700px)]:gap-2 overflow-y-auto min-h-0 pb-2
```

This allows scrolling if answers don't fit, while reducing gaps.

#### 2. Reduce Question Card Spacing (line 362)

```text
Current: mt-5 mb-0 [@media(max-height:700px)]:mt-4
Change to: mt-4 mb-0 [@media(max-height:700px)]:mt-2
```

#### 3. Progress Dots Spacing (line 401)

```text
Current: py-4 [@media(max-height:700px)]:py-2
Change to: py-2 [@media(max-height:700px)]:py-1.5
```

---

### File: `src/components/ui/quiz-power-up-button.tsx`

#### 4. Reduce Power-Up Icon Size (lines 62-67)

Add responsive sizing for small viewports:

```text
Current: w-16 h-16 (64px)
Change to: w-14 h-14 [@media(max-height:700px)]:w-12 [@media(max-height:700px)]:h-12
```

This reduces icons from 64px to 56px, or 48px on very small screens.

---

### File: `src/components/ui/quiz-answer-button.tsx`

#### 5. Reduce Answer Button Min-Height (line 116)

```text
Current: min-h-[68px] [@media(max-height:700px)]:min-h-[60px]
Change to: min-h-[60px] [@media(max-height:700px)]:min-h-[52px]
```

---

## Space Savings Summary

| Element | Before | After (Small) | Saved |
|---------|--------|---------------|-------|
| Question card margin-top | 16px | 8px | 8px |
| Progress dots padding | 8px × 2 = 16px | 6px × 2 = 12px | 4px |
| Answer gaps (3 gaps) | 10px × 3 = 30px | 8px × 3 = 24px | 6px |
| Answer buttons (4 cards) | 60px × 4 = 240px | 52px × 4 = 208px | 32px |
| Power-up icons | 64px + 24px badge | 48px + 24px badge | 16px |
| **Total Saved** | | | **~66px** |

---

## Expected Result

After these changes:
- All 4 answer options will be fully visible on small mobile screens
- Power-up bar will not overlap with the last answer
- Content will scroll if needed on extremely small viewports (under 600px)
- Layout will feel less cramped while maintaining touch-friendly button sizes

---

## Files to Modify

1. **src/components/game/QuizGameScreenProd.tsx** - Reduce spacing, enable scroll
2. **src/components/ui/quiz-power-up-button.tsx** - Reduce icon size on small screens
3. **src/components/ui/quiz-answer-button.tsx** - Reduce minimum button height
