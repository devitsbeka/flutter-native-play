
# Plan: Fix PRO Card Layout in MobileProCarousel

## Issues to Fix

1. **Button not at bottom**: The CTA button should be positioned at the absolute bottom of the card
2. **Benefits need more spacing**: Move benefits down by 40px from the header
3. **Mascot crown cropped**: The video mascot has a crown on its head that gets cut off - need to reposition video to show the full mascot

---

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

#### Change 1: Make left content use flex column with space-between

Update the left content container to use flexbox with justify-between so the button stays at the bottom:

**Lines 106-184** - Restructure the content layout:

```typescript
{/* Left: Content */}
<div className="w-[65%] p-5 z-10 flex flex-col">
  {/* Top Content */}
  <div>
    {/* Header - Icon + Title (+ Price on md+) */}
    <div className="flex flex-wrap items-center gap-3 mb-2">
      {/* ... existing header content ... */}
    </div>
    {/* Price - mobile only */}
    <div className="flex md:hidden items-baseline gap-1 mb-2">
      {/* ... existing price ... */}
    </div>
  </div>

  {/* Benefits - add mt-10 (40px) for spacing */}
  <ul className="flex flex-col gap-1.5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-2 mt-10 mb-auto">
    {/* ... existing benefits ... */}
  </ul>

  {/* CTA Button - mt-auto pushes it to bottom */}
  <button
    className="w-full py-3 md:py-4 px-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-4"
    {/* ... rest of button ... */}
  >
    {/* ... button content ... */}
  </button>
</div>
```

#### Change 2: Adjust video positioning to show full mascot with crown

The mascot has a crown on its head that gets cropped. Update the video element to position from the top-right corner and adjust object-position:

**Lines 187-197** - Update video styling:

```typescript
{/* Right: Video Background */}
<div className="w-[35%] flex-shrink-0 relative overflow-hidden">
  <video
    autoPlay
    loop
    muted
    playsInline
    className="absolute inset-0 w-full h-full object-cover"
    style={{ 
      objectPosition: "70% 20%"  // Shift focus to show crown (move up and slightly left)
    }}
  >
    <source src={shopBgVideo} type="video/mp4" />
  </video>
</div>
```

---

## Summary of Changes

| Element | Before | After |
|---------|--------|-------|
| Left content div | Regular div | `flex flex-col` |
| Benefits section | `mb-4` | `mt-10 mb-auto` (40px down, flex grow) |
| CTA Button | After benefits | Fixed at bottom with `mt-4` |
| Video | `object-center` | `objectPosition: "70% 20%"` to show crown |

---

## Expected Result

- The CTA button ("გააქტიურება") stays at the bottom of the card
- Benefits section has 40px gap from header
- Video mascot shows the full figure including the crown on its head
- Layout maintains proper structure on both mobile and tablet
