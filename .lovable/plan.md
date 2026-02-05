
# Plan: Fix Inconsistent Gaps in Mobile Action Buttons Arc

## Problem

The mobile home screen shows action buttons in a curved arc above the avatar. When the user is **not PRO**, there are 6 buttons (including "no-ads"), but when they **are PRO**, there are only 5 buttons. The current `marginBottom` values that create the arc were designed for 5 buttons, so when 6 are displayed, the spacing looks uneven.

**Current layout (mobile, lines 903-1055):**
| Button | marginBottom | Position |
|--------|-------------|----------|
| Gift | 0 | Left edge |
| Mission | 32 | Second |
| Chest | 48 | Peak (center) |
| No-ads (if !isVip) | 32 | Fourth |
| Powers | 0 | Right edge |

This creates an **asymmetric arc** because:
- With 5 buttons: the arc is 0→32→48→32→0 ✓ (symmetric)
- With 6 buttons: the arc should be different to remain symmetric, but currently it's still using values meant for 5

---

## Solution

Create **dynamic arc values** based on whether the no-ads button is shown:

### 5 Buttons (VIP users) - Current values work:
```
Gift(0) → Mission(28) → Chest(48) → Mission-Mirror(28) → Powers(0)
```

### 6 Buttons (Non-VIP users) - New symmetric arc:
```
Gift(0) → Mission(24) → Chest(40) → No-ads(40) → Powers-setup(24) → Powers(0)
```

---

## Technical Changes

### File: `src/pages/Index.tsx`

**Lines 904-1055** - Add conditional marginBottom values based on `isVip`:

```tsx
<div 
  className="absolute left-1/2 -translate-x-1/2 flex items-end justify-center pointer-events-auto z-20"
  style={{ 
    top: -75, 
    width: 340,
    gap: isVip ? 8 : 4  // Smaller gap when 6 buttons
  }}
  data-walkthrough="powerups"
>
  {/* Gift - always marginBottom: 0 */}
  <motion.div style={{ marginBottom: 0 }}>
    <ActionButtonWithParticles ... />
  </motion.div>

  {/* Mission - marginBottom: 28 (5 buttons) or 20 (6 buttons) */}
  <motion.div style={{ marginBottom: isVip ? 28 : 20 }}>
    <ActionButtonWithParticles ... />
  </motion.div>

  {/* Chest - marginBottom: 48 (5 buttons) or 36 (6 buttons) */}
  <motion.div style={{ marginBottom: isVip ? 48 : 36 }}>
    <ActionButtonWithParticles ... />
  </motion.div>

  {/* No-ads - only if !isVip, marginBottom: 36 */}
  {!isVip && (
    <motion.div style={{ marginBottom: 36 }}>
      <ActionButtonWithParticles ... />
    </motion.div>
  )}

  {/* Powers - marginBottom: 28 (5 buttons) or 20 (6 buttons) */}
  <motion.div style={{ marginBottom: isVip ? 28 : 20 }}>
    <ActionButtonWithParticles ... />
  </motion.div>
</div>
```

Wait - I see the Powers button currently has `marginBottom: 0`, which means it's also at the edge. Let me re-analyze the proper symmetric arc:

### Corrected Arc Values:

**5 buttons (VIP):**
- Gift: 0
- Mission: 28
- Chest (center): 48
- Powers-left-mirror: 28
- Powers: 0

**6 buttons (non-VIP):**
- Gift: 0
- Mission: 20
- Chest: 36
- No-ads: 36
- Powers-setup: 20
- Powers: 0

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/pages/Index.tsx` | 904-1055 | Update marginBottom values to be conditional based on `isVip`, reduce gap from `gap-2` to dynamic value |

---

## Result

- **VIP users (5 buttons)**: Clean symmetric arc with proper spacing
- **Non-VIP users (6 buttons)**: Slightly tighter arc with same visual symmetry
- No visual "jumping" when VIP status changes
- Consistent professional appearance regardless of button count
