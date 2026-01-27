
# Fix TV Poll Screen Layout and Add to Showcase

## Overview
Three changes to improve the TV Poll Screen experience:
1. Display categories in 4 columns instead of 3 to fit 6 categories in viewport
2. Update QR code text from "დასკანერეთ შესერთებლად" to "დაასკანერეთ სათამაშოდ"  
3. Add Poll screen to TV Showcase for preview in admin

---

## Changes

### 1. Fix Grid Columns (TVPollScreen.tsx)

**Current logic (line 53-57):**
```typescript
const getGridCols = (count: number) => {
  if (count <= 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2 md:grid-cols-4';
  return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';  // ← 3 cols on medium screens
};
```

**Updated logic:**
```typescript
const getGridCols = (count: number) => {
  if (count <= 2) return 'grid-cols-2';
  return 'grid-cols-2 md:grid-cols-4';  // Always 4 columns on TV
};
```

This ensures categories display in 4 columns on TV screens (which are typically 1080p+), allowing 6 categories to fit in 2 rows without cropping.

---

### 2. Update QR Code Text (TVPollScreen.tsx)

**Line 165 - Change from:**
```typescript
დასკანერეთ შესერთებლად
```

**To:**
```typescript
დაასკანერეთ სათამაშოდ
```

---

### 3. Add Poll Screen to TV Showcase (TVScreensShowcase.tsx)

**Add import:**
```typescript
import { TVPollScreen } from '@/components/tv/TVPollScreen';
```

**Add to SCREENS array:**
```typescript
const SCREENS = [
  { id: 'pairing', name: 'Pairing', phase: 'pairing' as const },
  { id: 'lobby', name: 'Lobby', phase: 'lobby' as const },
  { id: 'poll', name: 'Poll', phase: 'poll-suggest' as const },  // ← NEW
  { id: 'round-intro', name: 'Round Intro', phase: 'round_intro' as const },
  // ...rest
];
```

**Add to ScreenRenderer:**
```typescript
case 'poll':
  return <TVPollScreen />;
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/tv/TVPollScreen.tsx` | Simplify `getGridCols()` to always use 4 columns |
| `src/components/tv/TVPollScreen.tsx` | Update text on line 165 |
| `src/pages/TVScreensShowcase.tsx` | Import TVPollScreen, add to SCREENS array and ScreenRenderer |

---

## Result

After these changes:
- TV Poll screen will show 4 columns of categories, fitting 6+ without vertical scrolling
- QR code section will display the corrected Georgian text
- Admin can preview the Poll screen at `/tv-showcase` by selecting the "Poll" tab
