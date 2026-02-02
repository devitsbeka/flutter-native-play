

# Fix Mascot Avatar - Show Face with Crown

## Problem
The current transform `translateY(28%)` is moving the video **downward**, which reveals the **bottom** of the video content (the mascot's feet). The mascot's face with the crown is at the **top** of the video, so we need to move the video in the opposite direction.

---

## Solution
Change `translateY(28%)` to a **negative** value like `translateY(-15%)` to pull the video content **upward** within the container. This will show the **top** portion of the video where the mascot's face and crown are located.

---

## Technical Change

### File: `src/components/home/GuestWelcomePanel.tsx`

**Line 133** - Change to negative translateY:

```tsx
// Current (WRONG - shows feet):
<div className="absolute inset-0" style={{ transform: 'scale(1.5) translateY(28%)' }}>

// Fixed (shows face with crown):
<div className="absolute inset-0" style={{ transform: 'scale(1.5) translateY(-15%)' }}>
```

---

## How Transform Works

```text
translateY(+28%):           translateY(-15%):
Pushes video DOWN           Pulls video UP
↓                           ↑

Video in frame:             Video in frame:
╭───────────╮               ╭───────────╮
│   🦵 FEET │               │   👑 FACE │
╰───────────╯               ╰───────────╯
```

A **negative** translateY value moves the element **upward**, which brings the **top** of the video (the face with crown) into the visible circular frame.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/home/GuestWelcomePanel.tsx` | Line 133: Change `translateY(28%)` → `translateY(-15%)` |

