

# Plan: Fix TV Lobby Layout Issues

## Issues Identified

Based on the screenshots:

1. **Missing code below URL**: The game code (e.g., "1234") should appear below "mytrivia.io/join" so users know what to enter after opening the URL
2. **Crown cropped**: The host crown is positioned at `-top-1 -right-1` with `overflow-hidden` on the parent, causing it to be clipped
3. **Border/stroke overlap**: Player cards use `border-2 border-dashed` for empty slots while active players use `boxShadow: 'inset 0 0 0 2px'` - these can visually overlap on the rounded corners

---

## Solution

### File: `src/components/tv/TVLobbyScreenV2.tsx`

### Change 1: Add Game Code Below URL (lines 668-671)

Update the QR section to include the code:

**Current:**
```tsx
<div className="mt-3 text-center">
  <p className="text-purple-300 text-sm mb-1">ან გახსენით</p>
  <p className="text-sm font-bold text-white">mytrivia.io/join</p>
</div>
```

**Updated:**
```tsx
<div className="mt-3 text-center">
  <p className="text-purple-300 text-sm mb-1">ან გახსენით</p>
  <p className="text-sm font-bold text-white">mytrivia.io/join</p>
  {/* Code to enter */}
  <div className="mt-2 px-3 py-1 bg-white/10 rounded-lg inline-block">
    <span className="text-purple-300 text-xs">კოდი: </span>
    <span className="text-white font-bold text-lg tracking-wider">{code}</span>
  </div>
</div>
```

### Change 2: Fix Crown Cropping (lines 582 and 598)

The issue is `overflow-hidden` on the parent card, which clips the crown positioned at `-top-1 -right-1`.

**Solution A - Remove overflow-hidden and adjust crown position:**

Change line 582 from:
```tsx
className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 overflow-hidden ${...}`}
```

To:
```tsx
className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 ${...}`}
```

And update the crown positioning (line 598) to sit inside the card:
```tsx
className="absolute top-1 right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg z-10"
```

This moves the crown from `-top-1 -right-1` (partially outside) to `top-1 right-1` (inside the card), so it won't be clipped.

### Change 3: Fix Border Overlap on Empty Slots (lines 586-589)

The dashed borders on empty slots can overlap at corners. Use consistent inset styling:

**Current (empty slots):**
```tsx
: 'bg-white/5 border-2 border-dashed border-purple-500/30'
```

**Updated:**
Remove the `border-*` classes and use `ring-inset` for consistent rendering:
```tsx
: 'bg-white/5 ring-2 ring-inset ring-dashed ring-purple-500/30'
```

Actually, Tailwind doesn't support `ring-dashed`. Alternative approach - keep the border but ensure consistent styling:

**Better solution**: Use box-shadow for the dashed effect on empty slots too, matching the active player style:
```tsx
// For empty slots, use a pattern that doesn't overlap:
style={{ 
  backgroundImage: 'repeating-linear-gradient(90deg, rgba(139, 92, 246, 0.3) 0, rgba(139, 92, 246, 0.3) 8px, transparent 8px, transparent 12px)',
  backgroundSize: '100% 2px, 100% 2px, 2px 100%, 2px 100%',
  backgroundPosition: '0 0, 0 100%, 0 0, 100% 0',
  backgroundRepeat: 'no-repeat'
}}
```

**Simpler solution**: Reduce the border thickness and use `ring-inset` to keep borders inside:
```tsx
// Empty slots
className="bg-white/5 ring-1 ring-inset ring-purple-500/40"
```

This uses an inset ring which stays inside the rounded corners and doesn't overlap with adjacent cells.

---

## Summary of Changes

| Location | Change | Purpose |
|----------|--------|---------|
| Lines 668-671 | Add game code display below URL | Users know what code to enter |
| Line 582 | Remove `overflow-hidden` | Prevent crown clipping |
| Line 598 | Change `-top-1 -right-1` to `top-1 right-1` | Position crown inside card boundaries |
| Lines 586-587 | Replace `border-2 border-dashed` with `ring-1 ring-inset ring-purple-500/40` | Prevent border overlap between adjacent cards |

---

## Visual Result

```text
┌─────────────────────────────────────────────────────┐
│                                    │                │
│   [Player Cards - no cropped       │   [QR Code]    │
│    crowns, clean borders]          │                │
│                                    │   ან გახსენით  │
│   ┌──────┐  ┌──────┐               │ mytrivia.io/join│
│   │ 👑 A │  │  B   │               │                │
│   └──────┘  └──────┘               │   კოდი: 1234   │  ← NEW
│                                    │                │
│                                    │ [MyTrivia LIVE]│
└─────────────────────────────────────────────────────┘
```

The crown will now appear fully visible, empty slots will have clean non-overlapping borders, and the game code will appear below the URL for easy reference.

