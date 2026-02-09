

## Fix Category Blob Shape on VS Screen

### Problem
The blob container on the VS screen renders category videos/images inside a shape that looks too square -- almost like a picture frame with barely-rounded corners. The user's screenshot of "საქართველოს ისტორია" (Georgian History) shows the video appearing in a rectangle with near-90-degree corners instead of a soft, organic blob shape.

### Root Cause
The SVG clip path in `InteractiveBlobVideo.tsx` defines a "squircle" (rounded rectangle) that is too close to a regular square:

```text
Current path control points:
  Corner radius ~6% inset --> very subtle rounding
  Result: nearly square shape
```

The path `M0.5,0.06 C0.82,0.06 0.94,0.18 0.94,0.5 ...` has control points at 0.06/0.94 which means only 6% rounding on each corner -- visually almost a square.

### Solution
Make the blob path significantly more rounded/organic by increasing the corner radius. Change from ~6% to ~15-18% inset so the shape reads as a soft, pillowy blob rather than a framed picture.

### Changes

**File: `src/components/game/InteractiveBlobVideo.tsx`**

1. Update `roundedRectPath` with more aggressive corner rounding (control points moved from 0.06/0.94 to ~0.12/0.88), creating a visibly softer squircle
2. Update `borderRectPath` to match (slightly larger for the border outline)
3. These are the ONLY two lines that need changing -- the clip paths are referenced everywhere else by ID

### Visual Effect

```text
Before:  Nearly square with barely-visible corner rounding (6%)
After:   Soft, pillow-like rounded squircle (15-18% radius)
```

All 45 categories already have video mappings in `CATEGORY_VIDEOS`, and all have `icon_slug` values for the slot-machine spin phase. The `image_url` field in the database is NULL for all categories, but this is expected -- the system uses videos from `videoConfig.ts` and 3D icons from the icon library instead.

No database changes needed. Only the two SVG path strings in `InteractiveBlobVideo.tsx` need updating.

