
# Plan: Fix Action Button Arc Gaps

## Problem Analysis

Looking at your screenshots, the gaps between the action buttons (Gift, Mission, Chest, Powers) appear uneven visually. The current implementation uses:

**VIP (5 buttons):**
- marginBottom values: `0 → 28 → 48 → 28 → 0`
- gap: 8px

**Non-VIP (6 buttons):**
- marginBottom values: `0 → 20 → 36 → 36 → 20 → 0`
- gap: 4px

The mathematical arc is correct, but the **perceived visual gap** differs because:
1. When buttons have different vertical positions (marginBottom), the diagonal distance between them varies
2. The horizontal gap stays constant while vertical offsets create unequal visual spacing

## Solution

Adjust the arc values to create **equal visual diagonal gaps** between buttons. The key insight is that a true arc should have marginBottom values that follow a smooth curve, not abrupt jumps.

### Corrected Arc Values

**VIP (5 buttons) - smoother parabolic curve:**
```text
Current:  0 → 28 → 48 → 28 → 0
Proposed: 0 → 24 → 40 → 24 → 0
```
- Reduces the steepness between positions
- Creates more gradual visual transitions

**Non-VIP (6 buttons) - symmetric with lower peaks:**
```text
Current:  0 → 20 → 36 → 36 → 20 → 0
Proposed: 0 → 16 → 28 → 28 → 16 → 0
```
- Smoother transitions between each button
- Middle two buttons at same height creates symmetry

### Gap Adjustments

Increase the gap slightly to compensate for reduced arc height:
- VIP: gap from 8px to 10px
- Non-VIP: gap from 4px to 6px

## Technical Changes

### File: `src/pages/Index.tsx`

**Line 906** - Update gap for mobile:
```tsx
style={{ top: -75, width: 340, gap: isVip ? 10 : 6 }}
```

**Line 955** - Mission button (VIP: 28→24, non-VIP: 20→16):
```tsx
style={{ marginBottom: isVip ? 24 : 16 }}
```

**Line 987** - Chest button (VIP: 48→40, non-VIP: 36→28):
```tsx
style={{ marginBottom: isVip ? 40 : 28 }}
```

**Line 1016** - No-ads button (36→28):
```tsx
style={{ marginBottom: 28 }}
```

**Line 1033-1038** - Powers button arc position (VIP: 28→24, non-VIP: 20→16):
Currently at marginBottom: 0, but for proper arc symmetry with 6 buttons, it should also follow the descent. However, since Powers is the last button, it remains at 0.

Wait - I see the issue now. For 6 buttons, the arc should be:
`0 → 16 → 28 → 28 → 16 → 0`

But currently Powers (position 5 of 6) has marginBottom: 0, when it should have marginBottom: 16 for symmetry.

Let me re-check the button order for non-VIP:
1. Gift (0)
2. Mission (20 → should be 16)
3. Chest (36 → should be 28)
4. No-ads (36 → should be 28)
5. Powers (0 → should be 16)

Wait, I see now - Powers is always at 0 for both VIP and non-VIP based on the code. But for non-VIP with 6 buttons, if the arc is 0→20→36→36→20→0, then we need:
- Position 1 (Gift): 0 ✓
- Position 2 (Mission): 20
- Position 3 (Chest): 36
- Position 4 (No-ads): 36
- Position 5 (Powers): 20 ← Currently 0, should be 20!
- Position 6: 0 ← There is no 6th button

Actually looking again at the non-VIP layout, there are only 5 buttons when VIP is true (Gift, Mission, Chest, Powers) and 6 buttons when not VIP (adds No-ads). But the code shows Powers at marginBottom: 0 regardless.

For 5 buttons (VIP): 0→28→48→28→0
- Gift: 0, Mission: 28, Chest: 48 (peak), Powers: 28, (end): 0

But wait, there are only 4 buttons for VIP (Gift, Mission, Chest, Powers). Let me re-read the code...

Actually I see now:
- VIP has 4 buttons: Gift, Mission, Chest, Powers
- Non-VIP has 5 buttons: Gift, Mission, Chest, No-ads, Powers

So the arc values need to be:

**VIP (4 buttons):**
```text
Gift(0) → Mission(~32) → Chest(32) → Powers(0)
```
Wait that doesn't match either. Let me trace through the marginBottom values in the code:

VIP = true (4 buttons):
1. Gift: marginBottom: 0 (line 585, 914)
2. Mission: marginBottom: isVip ? 28 : 20 → 28 (line 625, 955)
3. Chest: marginBottom: isVip ? 48 : 36 → 48 (line 656, 987)
4. Powers: marginBottom: 0 (line 677, 1038)

So VIP arc is: 0 → 28 → 48 → 0 (4 points, asymmetric!)

For 4 buttons with a peak in the middle, the arc should be: 0 → height → height → 0 (symmetric with peak at positions 2 and 3).

But current is 0 → 28 → 48 → 0 which means Chest is higher than Mission. Looking at the screenshot, this makes Mission appear further from Gift than Chest is from Mission.

**Correct symmetric arc for 4 buttons:**
- Position 1 (Gift): 0
- Position 2 (Mission): X
- Position 3 (Chest): X (same as Mission for symmetry)
- Position 4 (Powers): 0

Proposed values: 0 → 32 → 32 → 0

**For non-VIP (5 buttons):**
Current: 0 → 20 → 36 → 36 → 0
This is almost correct but Mission (position 2) and No-ads (position 4) should have equal heights.

Let me recalculate:
1. Gift: 0
2. Mission: 20
3. Chest: 36 (peak)
4. No-ads: 20 (should match Mission for symmetry)
5. Powers: 0

But current code has No-ads at 36, same as Chest! This is wrong.

## Corrected Analysis

**VIP (4 buttons) - Current vs Proposed:**
```text
Current:  Gift(0) → Mission(28) → Chest(48) → Powers(0)
Proposed: Gift(0) → Mission(32) → Chest(32) → Powers(0)
```

**Non-VIP (5 buttons) - Current vs Proposed:**
```text
Current:  Gift(0) → Mission(20) → Chest(36) → No-ads(36) → Powers(0)
Proposed: Gift(0) → Mission(24) → Chest(40) → No-ads(24) → Powers(0)
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Update marginBottom values for symmetric arc |

## Line Changes

### Mobile section (lines 900-1060):

1. **Line 955** - Mission: `isVip ? 28 : 20` → `isVip ? 32 : 24`
2. **Line 987** - Chest: `isVip ? 48 : 36` → `isVip ? 32 : 40`
3. **Line 1016** - No-ads: `36` → `24`

### Tablet section (lines 575-700):

1. **Line 625** - Mission: `32` → `32`
2. **Line 656** - Chest: `32` → `32`

## Summary

The core fix is making the arc **symmetric** - buttons at equal distances from center should have equal marginBottom values. This will create visually consistent gaps between all buttons.
