
# Plan: Fix Mascot Avatar Display and Camera Badge Position

## Issues Identified

1. **Mascot Head Cropped**: The video uses `object-cover` centered alignment, cropping the mascot's head at the top
2. **Camera Badge Clipped**: The camera icon is positioned inside the `overflow-hidden` container, causing it to be cut off

## Solution

### Fix 1: Move Video Down to Show Full Head

Use `object-position: center 30%` to shift the video content down, keeping the mascot's head fully visible while cropping more from the bottom.

### Fix 2: Move Camera Badge Outside the Overflow Container

Restructure the button to have a wrapper div where the camera badge can be positioned outside the clipped area.

---

## Code Changes

**File: `src/components/shared/AuthRequiredModal.tsx`**

**Current Code (lines 191-214):**
```tsx
<Popover open={showUploadOptions} onOpenChange={setShowUploadOptions}>
  <PopoverTrigger asChild>
    <button 
      type="button"
      className="w-[90px] h-[90px] rounded-full overflow-hidden relative border-4 border-primary/20 shadow-lg"
    >
      {selectedPhoto ? (
        <img ... />
      ) : (
        <SinglePlayVideo ... />
      )}
      {/* Camera badge - INSIDE the overflow-hidden button */}
      <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 shadow-md">
        <Camera className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
    </button>
  </PopoverTrigger>
</Popover>
```

**New Code:**
```tsx
<Popover open={showUploadOptions} onOpenChange={setShowUploadOptions}>
  <PopoverTrigger asChild>
    {/* Outer wrapper for camera badge positioning */}
    <button type="button" className="relative">
      {/* Circle container with overflow-hidden */}
      <div className="w-[90px] h-[90px] rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
        {selectedPhoto ? (
          <img 
            src={selectedPhoto} 
            alt="Selected avatar" 
            className="w-full h-full object-cover"
          />
        ) : (
          <SinglePlayVideo 
            src={guestWelcomeVideo} 
            className="w-full h-full"
            style={{ objectPosition: 'center 30%' }}
          />
        )}
      </div>
      {/* Camera badge - OUTSIDE the overflow-hidden div */}
      <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-2 shadow-md border-2 border-background">
        <Camera className="w-4 h-4 text-primary-foreground" />
      </div>
    </button>
  </PopoverTrigger>
</Popover>
```

---

## Key Changes Summary

| Issue | Fix |
|-------|-----|
| Mascot head cropped | Add `style={{ objectPosition: 'center 30%' }}` to shift video content down |
| Camera badge clipped | Move badge div outside the `overflow-hidden` container, use `-bottom-1 -right-1` positioning |
| Badge too small | Increase padding to `p-2` and icon size to `w-4 h-4` for better visibility |
| Badge blends in | Add `border-2 border-background` for contrast against the avatar |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/shared/AuthRequiredModal.tsx` | Restructure avatar button layout, fix video positioning, move camera badge outside overflow area |

---

## Expected Result

- Mascot's full head visible in the circle (cropping only at the bottom)
- Camera badge fully visible and floating outside the circle border
- Matches the reference image provided by user
