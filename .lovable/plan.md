

## Fix: Rotation Overlay Appearing During Sign-Up/Sign-In

### Root Cause
The CSS media query for landscape detection is:
```css
@media screen and (orientation: landscape) and (max-height: 500px)
```

When a user taps an input field (username, password), the **virtual keyboard** opens and reduces the visible viewport height. Once the height drops below the width, the browser reports `orientation: landscape` even though the phone is physically in portrait mode. This triggers the "please rotate" overlay, blocking the form.

### Fix

**File: `src/index.css` (line 354)**

Update the media query to also require a minimum width that would only be true for an actually rotated phone (not a portrait phone with keyboard open). A portrait phone typically has a width of 320-430px, while a landscape phone has 600px+.

Change:
```css
@media screen and (orientation: landscape) and (max-height: 500px)
```
To:
```css
@media screen and (orientation: landscape) and (max-height: 500px) and (min-width: 600px)
```

This ensures the overlay only shows when the device is genuinely in landscape mode (width >= 600px) and not when a keyboard simply shrinks the viewport height.

### Why This Works
- Portrait phone with keyboard open: width ~375px, height ~300px -- `min-width: 600px` fails, overlay hidden
- Landscape phone: width ~800px, height ~375px -- all conditions pass, overlay shown

### Files Changed
| File | Change |
|------|--------|
| `src/index.css` | Add `and (min-width: 600px)` to the landscape media query on line 354 |
