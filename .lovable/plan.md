

# Fix Guest Welcome Panel Layout

## Overview
Three specific layout adjustments to the guest welcome screen:
1. **Move everything up by 35px** - Add negative margin-top to shift content upward
2. **Increase input field height by 10px** - Change from `py-2.5` to `py-[17px]` (about +10px total height)
3. **Show mascot's face instead of legs** - The video needs different positioning to center on the face

---

## Issue Analysis

### Mascot Face Not Visible
Looking at the current code (line 125):
```tsx
<div className="absolute inset-0 scale-[1.4]" style={{ top: '-12%' }}>
```

The problem: `scale-[1.4]` enlarges the video but `top: '-12%'` moves it UP, which shows the BOTTOM (legs) of the video. To show the FACE (top portion of mascot), we need to move the video DOWN (positive offset or adjust the positioning differently).

The video appears to have the mascot with face at the top and legs at the bottom. Currently showing legs means we need to pull the video content UP within the visible circle (so the top/face portion becomes visible), which means using a **negative** translateY on the inner video or adjusting object-position.

---

## Technical Changes

### File: `src/components/home/GuestWelcomePanel.tsx`

#### 1. Move Everything Up by 35px

Add a negative top margin to the main container:

```tsx
// Line 87 - Add margin-top: -35px
<div 
  className="flex flex-col items-center w-full max-w-sm mx-auto px-4 py-2 overflow-y-auto"
  style={{ marginTop: "-35px" }}
>
```

#### 2. Increase Input Field Height by 10px

Change input padding from `py-2.5` (10px) to `py-[15px]` (15px each = +10px total height):

```tsx
// Line 159 (username) and Line 183 (password) - Change py-2.5 to py-[15px]
className="w-full pl-10 pr-3 py-[15px] rounded-xl bg-background border-2 border-border ..."
```

#### 3. Fix Mascot Face Centering

The video needs to show the TOP portion (face) not the BOTTOM (legs). Change the positioning:

```tsx
// Lines 124-130 - Adjust video positioning
{/* Video with scale and offset to center mascot face */}
<div 
  className="absolute inset-0 scale-[1.5]" 
  style={{ transform: 'scale(1.5) translateY(-18%)' }}
>
  <PingPongVideo 
    src={guestWelcomeVideo}
    className="rounded-full w-full h-full object-cover"
  />
</div>
```

Using `translateY(-18%)` with `scale(1.5)` will:
- Scale up the video to fill more of the circle
- Move the video UP (negative Y) so the TOP (face) shows in the visible area instead of the bottom (legs)

---

## Summary of Changes

| Change | Current | New |
|--------|---------|-----|
| Container margin-top | 0 | -35px |
| Input padding | py-2.5 (10px) | py-[15px] (15px) = +10px total |
| Video positioning | `scale-[1.4]` + `top: '-12%'` | `scale(1.5) translateY(-18%)` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home/GuestWelcomePanel.tsx` | 1. Add `marginTop: -35px` to container<br>2. Change input `py-2.5` → `py-[15px]`<br>3. Fix video transform to show face |

