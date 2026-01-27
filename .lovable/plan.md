

# Fix Game Screen Layout Issues

## Problems Identified

Comparing Screen 1 (preview) vs Screen 2 (actual mobile):

1. **Missing question count dots** - The progress dots are being rendered but appear to be getting hidden or cropped on some devices
2. **Cropped button bottom edges** - The answer buttons' 4px depth/shadow is being cut off because the container has `overflow-hidden`
3. **Insufficient gaps between elements** - Negative margins (`-mt-5`) pull elements too close together

---

## Technical Changes

### File: `src/components/game/QuizGameScreenProd.tsx`

#### 1. Fix Progress Dots Visibility (Lines 393-400)

The dots use white/semi-transparent colors which may be hard to see. Also need better spacing:

**Current:**
```tsx
<div className="flex justify-center py-3 [@media(max-height:700px)]:py-1 flex-shrink-0">
```

**Change to:**
```tsx
<div className="flex justify-center py-4 [@media(max-height:700px)]:py-2 flex-shrink-0">
```

#### 2. Fix Answer Buttons Container Overflow (Lines 431)

The `overflow-hidden` class is cropping the button shadows:

**Current:**
```tsx
<div className="flex-1 px-4 -mt-5 flex flex-col gap-2 [@media(max-height:700px)]:gap-1.5 overflow-hidden min-h-0">
```

**Change to:**
```tsx
<div className="flex-1 px-4 mt-0 flex flex-col gap-3 [@media(max-height:700px)]:gap-2 overflow-visible min-h-0 pb-2">
```

Changes:
- `-mt-5` → `mt-0` - Remove negative margin that overlaps elements
- `gap-2` → `gap-3` - Increase gap between answer buttons
- `overflow-hidden` → `overflow-visible` - Allow button shadows to display fully
- Add `pb-2` - Bottom padding to prevent last button shadow from cropping

#### 3. Fix True/False Button Container (Lines 404)

Same issue with true/false questions:

**Current:**
```tsx
<div className="w-full px-4 -mt-5 flex gap-2">
```

**Change to:**
```tsx
<div className="w-full px-4 mt-0 flex gap-3 pb-2">
```

#### 4. Adjust Question Card Spacing (Line 362)

Balance spacing after removing negative margins:

**Current:**
```tsx
<div className="px-4 flex-shrink-0 mt-5 mb-2 [@media(max-height:700px)]:mt-4 [@media(max-height:700px)]:mb-1 relative">
```

**Change to:**
```tsx
<div className="px-4 flex-shrink-0 mt-5 mb-0 [@media(max-height:700px)]:mt-4 [@media(max-height:700px)]:mb-0 relative">
```

---

### File: `src/components/ui/quiz-answer-button.tsx`

#### 5. Ensure Button Has Space for Shadow (Line 116)

The button needs to ensure its min-height accounts for the 4px depth:

**Current:**
```tsx
className="relative flex items-center h-full min-h-[68px] [@media(max-height:700px)]:min-h-[60px] py-2.5 [@media(max-height:700px)]:py-2 rounded-2xl transition-transform duration-100"
```

Keep as-is but the container fix above will allow it to display properly.

---

## Summary of Changes

| Issue | Before | After |
|-------|--------|-------|
| Answer buttons cropped | `overflow-hidden`, `-mt-5` | `overflow-visible`, `mt-0`, `pb-2` |
| Button gaps too tight | `gap-2` | `gap-3` |
| Progress dots cramped | `py-3` | `py-4` |
| Question card overlap | `mb-2` + answers `-mt-5` | `mb-0` + answers `mt-0` |

## Expected Result

- Progress dots clearly visible below question card
- Answer button shadows/depth fully visible (no cropping)
- Proper gaps between all elements
- Consistent appearance between preview and mobile device

