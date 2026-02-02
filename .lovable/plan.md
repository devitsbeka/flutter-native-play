

# Fix Mascot Avatar - Show Face Completely

## Problem
The current `translateY(15%)` still shows the mascot's feet/legs instead of the face. We need a larger offset to properly center the face in the circular frame.

---

## Solution
Increase the `translateY` value from `15%` to approximately `25-30%` to push the video content further down, revealing the mascot's face at the top.

---

## Technical Change

### File: `src/components/home/GuestWelcomePanel.tsx`

**Line 133** - Increase the translateY value:

```tsx
// Current (still shows feet):
<div className="absolute inset-0" style={{ transform: 'scale(1.5) translateY(15%)' }}>

// Fixed (shows face):
<div className="absolute inset-0" style={{ transform: 'scale(1.5) translateY(28%)' }}>
```

The higher `translateY(28%)` pushes the video content further down within the clipping circle, ensuring the mascot's face (at the top of the video) is properly centered and visible.

---

## Visual Explanation

```text
Before (15%):           After (28%):
╭───────────╮           ╭───────────╮
│   🦵 LEGS │           │   😊 FACE │
╰───────────╯           ╰───────────╯
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/home/GuestWelcomePanel.tsx` | Line 133: Change `translateY(15%)` → `translateY(28%)` |

