

# Fix Camera Badge - Move Outside Circular Container

## Problem
The camera badge icon is placed **inside** the circular button that has `overflow-hidden`. This causes the badge to be cropped by the circular boundary, making it partially invisible.

## Solution
Move the camera badge **outside** the button element but keep it visually positioned at the bottom-right corner of the avatar. This requires wrapping both the button and the badge in a parent container.

---

## Technical Changes

### File: `src/components/home/GuestWelcomePanel.tsx`

**Current structure (badge inside button, gets clipped):**
```text
<PopoverTrigger>
  <button class="overflow-hidden rounded-full">
    <video ... />
    <div class="camera-badge" />  ← CLIPPED!
  </button>
</PopoverTrigger>
```

**New structure (badge outside button, visible):**
```text
<PopoverTrigger>
  <div class="relative">  ← New wrapper
    <button class="overflow-hidden rounded-full">
      <video ... />
    </button>
    <div class="camera-badge" />  ← NOT CLIPPED!
  </div>
</PopoverTrigger>
```

### Changes:
1. Add a wrapper `<div className="relative">` around the button
2. Move the camera badge div **outside** the button, but still inside the wrapper
3. Position the badge at `bottom-0 right-0` of the wrapper
4. Remove hover effects tied to the button group (or use CSS sibling selectors)

```tsx
<PopoverTrigger asChild>
  <div className="relative group cursor-pointer">
    {/* Circular avatar container */}
    <button 
      type="button"
      className="relative rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      style={{...}}
    >
      {/* Video/Photo content */}
    </button>
    
    {/* Camera badge - OUTSIDE button, not clipped */}
    <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 shadow-md group-hover:scale-110 transition-transform z-20">
      <Camera className="w-3.5 h-3.5 text-primary-foreground" />
    </div>
  </div>
</PopoverTrigger>
```

---

## Visual Result

```text
Before (clipped):          After (visible):
╭───────────╮              ╭───────────╮
│           │              │           │
│  AVATAR   │              │  AVATAR   │
│        [─ │ ← cut off    │           │📷 ← fully visible
╰───────────╯              ╰───────────╯
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/home/GuestWelcomePanel.tsx` | Wrap button in relative div, move camera badge outside button |

