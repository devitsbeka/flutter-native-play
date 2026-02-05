
# Plan: Fix TV Lobby Layout and Logo Position

## Problem Summary

Based on the screenshots provided:
1. **Logo overlapping**: The "MyTrivia LIVE" logo is positioned at the absolute bottom-center of the screen, which overlaps with player placeholders and text
2. **Player placeholders cropped**: The bottom row of player slots may get cut off due to spacing issues
3. **Logo placement**: User wants the logo to be below the QR code section, centered within that right column

---

## Current Layout Structure

```
┌────────────────────────────────────────────────────────┐
│ [TV Icon] Room Name            Players: 5/8 [TV Icon] │
├────────────────────────────────────────────────────────┤
│ Code: 1234                                             │
├────────────────────────────────────────────────────────┤
│ [Category Pills]                                       │
├────────────────────────────────────────────────────────┤
│                                        │               │
│   [Player Grid - 4x2]                  │   [QR Code]   │
│                                        │   ან გახსენით │
│                                        │   mytrivia.io │
├────────────────────────────────────────────────────────┤
│              [Start Game Button]                       │
├────────────────────────────────────────────────────────┤
│              [MyTrivia LIVE Logo] ← OVERLAPS!          │
└────────────────────────────────────────────────────────┘
```

---

## Target Layout

```
┌────────────────────────────────────────────────────────┐
│ [TV Icon] Room Name            Players: 5/8 [TV Icon] │
├────────────────────────────────────────────────────────┤
│ Code: 1234                                             │
├────────────────────────────────────────────────────────┤
│ [Category Pills]                                       │
├────────────────────────────────────────────────────────┤
│                                    │                   │
│   [Player Grid - 4x2]              │     [QR Code]     │
│                                    │     ან გახსენით   │
│                                    │     mytrivia.io   │
│                                    │                   │
│                                    │ [MyTrivia LIVE]   │  ← MOVED HERE
├────────────────────────────────────────────────────────┤
│              [Start Game Button]                       │
└────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### File: `src/components/tv/TVLobbyScreenV2.tsx`

**Change 1: Remove absolute positioned bottom logo (lines 755-758)**

Remove:
```tsx
{/* Bottom Logo - Centered */}
<div className="absolute bottom-4 left-1/2 -translate-x-1/2">
  <MyTriviaLiveLogo size="md" textColor="light" />
</div>
```

**Change 2: Add logo to QR section (right side column)**

Update the right side QR section (lines 651-671) to include the logo at the bottom:

```tsx
{/* Right Side - QR Code + Logo */}
<div className="w-56 flex-shrink-0 flex flex-col items-center justify-between pt-5 mt-[15px]">
  {/* Top: QR Code */}
  <div className="flex flex-col items-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-3 rounded-2xl bg-white shadow-2xl"
    >
      <QRCodeSVG
        value={joinUrl}
        size={140}
        level="M"
        includeMargin={false}
      />
    </motion.div>

    <div className="mt-3 text-center">
      <p className="text-purple-300 text-sm mb-1">ან გახსენით</p>
      <p className="text-sm font-bold text-white">mytrivia.io/join</p>
    </div>
  </div>
  
  {/* Bottom: Logo */}
  <div className="pb-4">
    <MyTriviaLiveLogo size="sm" textColor="light" />
  </div>
</div>
```

Key changes:
- Changed `justify-start` to `justify-between` to spread content vertically
- Wrapped QR code and text in a container div
- Added logo at the bottom of this column with padding

**Change 3: Improve player grid spacing to prevent cropping**

The player grid container (lines 540-649) needs adjustment to prevent bottom cropping:

Update the container:
```tsx
{/* Left Side - Players Grid */}
<div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-2">
```

Add `pb-2` (padding-bottom) to ensure the last row isn't cropped.

---

## Summary of Changes

| Location | Change | Purpose |
|----------|--------|---------|
| Lines 755-758 | Remove absolute bottom logo | Prevent overlap with content |
| Lines 651-671 | Add logo to QR column bottom | Position logo as user requested |
| Line 652 | Change `justify-start` → `justify-between` | Spread content vertically |
| Line 540 | Add `pb-2` to players container | Prevent bottom row cropping |

---

## Visual Result

The logo will now appear:
- Below the "mytrivia.io/join" text
- Centered within the right column
- No longer overlapping with player cards or start button
- Players grid will have proper spacing at the bottom

This matches the expected layout from the reference where the logo sits naturally in the QR code column without interfering with other UI elements.
