

# Plan: Fix Invite Button Visibility and Avatar Jump Issues

## Issues Identified from Screenshots

1. **"მოიწვიე" button barely visible** - Current styling uses `bg-primary/20` which is too transparent against the background
2. **Avatar jumps/decreases on button click** - The `whileTap={{ scale: 0.95 }}` animation affects the layout, causing avatar to appear smaller
3. **Delete (X) button on avatar should be removed** - User explicitly requested to remove delete buttons from invited player avatars

---

## Technical Changes

### File: `src/components/team/RoomScoreboard.tsx`

**1. Make "მოიწვიე" button more visible**

Replace the faint transparent button with a solid, clearly visible green button:

```typescript
// Before (barely visible)
className="mt-2 px-3 py-1 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center gap-1.5 text-xs text-primary"

// After (clearly visible green button)  
className="mt-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium text-xs shadow-md flex items-center gap-1.5"
```

**2. Fix avatar jump on button click**

Remove `whileTap={{ scale: 0.95 }}` from the invite button or change it to only affect the button itself, not the parent container. Also wrap the button in a fixed-height container to prevent layout shift:

```typescript
// Wrap button in stable container with fixed min-height
<div className="min-h-[40px] flex flex-col items-center justify-center">
  <motion.button
    onClick={...}
    className="..."
    whileTap={{ scale: 0.95 }}  // Keep but ensure it doesn't affect parent
  >
    ...
  </motion.button>
</div>
```

**3. Remove delete (X) button from avatar**

Remove the entire delete button block that appears on invited player avatars:

```typescript
// REMOVE this block (lines 115-127 and 219-231):
{isHost && isInvited && (
  <motion.button
    onClick={(e) => {...}}
    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500..."
  >
    <X className="w-3 h-3 text-white" />
  </motion.button>
)}
```

Also remove delete button from the multi-player list view (lines 370-379).

---

## Changes Summary

| Issue | Location | Fix |
|-------|----------|-----|
| Button barely visible | Lines 160, 264 | Change to solid green gradient button with shadow |
| Avatar jumps on click | Lines 155-165, 259-269 | Add stable container wrapper with min-height |
| Delete X on avatar | Lines 115-127, 219-231, 370-379 | Remove the delete button blocks entirely |

## Visual Result

**Before:**
```
┌─────────────────────┐
│  👤 (with X button) │
│  "მოწვეული..."      │
│  [faint button]     │  ← Hard to see
└─────────────────────┘
```

**After:**
```
┌─────────────────────┐
│  👤 (no X button)   │
│  "მოწვეული..."      │
│  [🟢 მოიწვიე]       │  ← Clear green button
└─────────────────────┘
```

