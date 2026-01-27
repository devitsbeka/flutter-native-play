
# Fix Poll Screen Rank Badges

## Overview
Two fixes are needed for the rank badges on poll screens:

1. **Controller Poll Screen (Mobile)**: All rank badges (1, 2, 3) should have a white background container like badge #2 currently has
2. **TV Poll Screen**: Rank badges are being cropped because they're positioned outside the card bounds

---

## Changes

### 1. Controller Poll Screen - White Badges (ControllerPollScreen.tsx)

**Current code (lines 722-729):**
```typescript
<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
  index === 0 ? 'bg-yellow-500 text-yellow-900' :
  index === 1 ? 'bg-gray-300 text-gray-700' :
  index === 2 ? 'bg-orange-400 text-orange-900' :
  'bg-purple-500/30 text-purple-200'
}`}>
```

**Updated code - All 1, 2, 3 use white background:**
```typescript
<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
  index < 3 
    ? 'bg-white text-purple-900'  // White background for 1, 2, 3
    : 'bg-purple-500/30 text-purple-200'
}`}>
```

This makes badges 1, 2, and 3 all have a consistent white background with dark purple text, matching the design intent from the screenshot.

---

### 2. TV Poll Screen - Fix Badge Cropping (TVPollScreen.tsx)

**Problem:** The rank badge uses `absolute -top-3 -left-3` which places it outside the card's bounds. The parent grid or card clips this.

**Solution:** 
- Add `overflow-visible` to the card container
- Add padding to the grid to accommodate the badges
- Ensure proper z-index on badges

**Current card (lines 245-259):**
```typescript
<motion.div
  layout
  className={`relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 transition-all ${
    isLeader 
      ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
      : 'border-white/20'
  }`}
>
```

**Updated card:**
```typescript
<motion.div
  layout
  className={`relative overflow-visible bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 transition-all ${
    isLeader 
      ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
      : 'border-white/20'
  }`}
>
```

**Current rank badge (lines 272-282):**
```typescript
{showVotes && (
  <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
    rank === 1 ? 'bg-yellow-500 text-yellow-900' :
    rank === 2 ? 'bg-gray-300 text-gray-700' :
    rank === 3 ? 'bg-orange-400 text-orange-900' :
    'bg-purple-500/50 text-white'
  }`}>
```

**Updated rank badge - white background and z-index:**
```typescript
{showVotes && (
  <div className={`absolute -top-3 -left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
    rank <= 3 
      ? 'bg-white text-purple-900'  // White background for 1, 2, 3
      : 'bg-purple-500/50 text-white'
  }`}>
```

**Current grid container (line 138):**
```typescript
<div className={`grid ${getGridCols(...)} gap-4 pb-8 overflow-y-auto max-h-[calc(100vh-220px)]`}>
```

**Updated grid - add top padding for badges:**
```typescript
<div className={`grid ${getGridCols(...)} gap-4 pt-4 pb-8 overflow-y-auto max-h-[calc(100vh-220px)]`}>
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/controller/ControllerPollScreen.tsx` | Lines 722-729: Change all 1,2,3 badges to use white background |
| `src/components/tv/TVPollScreen.tsx` | Line 138: Add `pt-4` to grid for badge space |
| `src/components/tv/TVPollScreen.tsx` | Line 255: Add `overflow-visible` to card |
| `src/components/tv/TVPollScreen.tsx` | Lines 274-279: Add `z-10` and change to white background |

---

## Result

After these changes:
- All rank badges (1, 2, 3) on both mobile and TV will have a clean white background with dark text
- TV screen badges will not be cropped - they'll be fully visible overlapping the card corners
- Consistent visual style across both screens
