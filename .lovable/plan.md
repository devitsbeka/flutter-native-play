

## Fix VS Screen Blob: Rounded Corners, Video, and Icon Centering

### Problems Identified

**1. No Rounded Corners (Square Blob)**
The SVG clip-path defs are defined inside an SVG element with `className="absolute w-0 h-0"`. On many mobile browsers, an SVG with zero dimensions fails to expose its `<clipPath>` definitions, so `clip-path: url(#mainBlobClip)` silently falls back to no clipping -- resulting in a plain square.

**2. No Video Showing When Category is Locked**
When the category locks in, the component receives `iconUrl={currentCategory?.image_url || undefined}`. Since `image_url` is NULL for every category in the database, the locked state has no icon to show AND the video may fail to render because:
- The `<video>` uses only MP4 src (no WebM source element for better mobile support)
- If the video file doesn't load, there's no fallback -- the blob shows nothing meaningful

**3. Wrong/Missing Icon When Locked**
The locked state tries to show `iconUrl` (which is null), instead of building a URL from the category's `icon_slug`. For example, "Georgian Culture" has `icon_slug: "grape"` but the code never uses it as a fallback.

**4. Icons Not Centered During Spin**
The `inset-[8px]` content container combined with the clip-path creates an uneven visual area. Icons during the slot spin appear slightly off-center within the clipped shape.

### Solution

#### File: `src/components/game/InteractiveBlobVideo.tsx`

1. **Replace SVG clip-path with CSS `clip-path: path()`** -- Instead of referencing SVG defs via `url(#id)`, apply the squircle path directly as an inline CSS `clip-path: path(...)`. This is universally supported and eliminates the zero-dimension SVG bug entirely. Remove the hidden SVG element.

2. **Accept `iconSlug` prop** -- Add an `iconSlug` prop so the component can build the icon URL from the slug when no video or image_url is available. When locked: show video first, fall back to icon_slug URL, then fall back to passed iconUrl.

3. **Add `<source>` element for WebM** -- Use both WebM and MP4 sources in the video element for better mobile compatibility and faster loading.

4. **Fix icon centering** -- Ensure the icon container uses proper centering within the clipped area by removing the `inset-[8px]` offset from the content container and applying it via padding instead.

#### File: `src/components/game/VSScreen.tsx`

5. **Pass `iconSlug` to InteractiveBlobVideo** -- Pass `currentCategory?.icon_slug` so the blob can build the correct icon URL when video isn't available. For mixed category, continue using mystery-box icon.

6. **Pass WebM video URL** -- Use `toWebmUrl()` to provide a WebM source alongside the MP4 for the selected category video.

### Technical Details

The CSS `clip-path: path()` approach converts the SVG path from `objectBoundingBox` units (0-1 range) to pixel units matching the 220x220 container:

```text
Before (SVG, broken on mobile):
  clipPath: "url(#mainBlobClip)"
  
After (CSS, reliable everywhere):
  clipPath: "path('M110,26.4 C171.6,26.4 ...')"
```

The path coordinates are computed by multiplying the 0-1 values by 220 (the container size).

For the icon fallback chain when locked:
```text
1. Show video (WebM with MP4 fallback)
2. If no video: show icon from icon_slug URL
3. If no icon_slug: show passed iconUrl  
4. If nothing: show empty container
```
