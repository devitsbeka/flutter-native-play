
# Fix Mascot Avatar to Show Face Instead of Feet

## Problem
The current CSS transform `translateY(-18%)` moves the video **upward**, which causes the **bottom portion (feet)** of the mascot to appear in the circular frame instead of the **top portion (face)**.

## Solution
Change `translateY(-18%)` to a **positive** value like `translateY(15%)` to shift the video **downward** within the container, bringing the face into view.

---

## Technical Change

### File: `src/components/home/GuestWelcomePanel.tsx`

**Line 133** - Update the transform:

```tsx
// Current (WRONG - shows feet):
<div className="absolute inset-0" style={{ transform: 'scale(1.5) translateY(-18%)' }}>

// Fixed (shows face):
<div className="absolute inset-0" style={{ transform: 'scale(1.5) translateY(15%)' }}>
```

The positive `translateY(15%)` pushes the video content **down** within the clipping circle, so the **top** of the video (where the mascot's face is) becomes visible instead of the bottom.

---

## Visual Explanation

```text
Video Content:          Circular Frame (what's visible):
┌─────────────┐         
│   😊 FACE   │  ←─────  With translateY(15%), the TOP shows
│             │         
│             │         ╭───────────╮
│   🦵 FEET   │         │   😊      │
└─────────────┘         ╰───────────╯
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/home/GuestWelcomePanel.tsx` | Line 133: Change `translateY(-18%)` → `translateY(15%)` |
