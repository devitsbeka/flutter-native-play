

# Plan: Fix Broken Image Display in Category Cards

## Problem
When categories are displayed on the Discover page, a broken image icon appears in the top-left corner of some cards while videos are loading. This happens because:

1. The `PingPongVideo` component uses poster images to show instantly while videos load
2. These poster images are configured in `CATEGORY_IMAGES` (e.g., `/images/categories/world-history.jpg`)
3. The `public/images/categories/` directory is empty - these image files don't exist
4. When the browser fails to load the image, it shows the default broken image icon instead of hiding it

## Solution
Add error handling to the `PingPongVideo` component's poster image, similar to how `SafeAvatar` handles broken images:

- Track whether the poster image failed to load
- Hide the poster image immediately on error (never show broken icon)
- Continue relying on the pastel background color until video loads

## Files to Modify

| File | Change |
|------|--------|
| `src/components/shared/PingPongVideo.tsx` | Add `onError` handler to poster `<img>` to hide on failure |

## Technical Details

### Current Poster Image Code
```tsx
{posterUrl && (
  <img 
    src={posterUrl}
    alt=""
    className={`... ${isReady && isInView ? 'opacity-0' : 'opacity-100'}`}
    loading="lazy"
  />
)}
```

### Updated Code with Error Handling
```tsx
const [posterError, setPosterError] = useState(false);

// Only show poster if URL exists AND it hasn't errored
{posterUrl && !posterError && (
  <img 
    src={posterUrl}
    alt=""
    className={`... ${isReady && isInView ? 'opacity-0' : 'opacity-100'}`}
    loading="lazy"
    onError={() => setPosterError(true)}
  />
)}
```

## Why This Works

- When the poster image 404s (doesn't exist), the `onError` callback fires
- This sets `posterError` to `true`, which removes the `<img>` from the DOM
- The pastel background of the card shows through instead of a broken icon
- Once the video loads and `isReady` becomes true, the video fades in normally

## Additional Considerations

**Long-term fix**: The poster images should be added to `public/images/categories/`. These are first-frame screenshots of each video that provide instant visual feedback.

**Avatar handling**: The avatar components (`SafeAvatar`, `AvatarWithFrame`) already use similar error handling patterns - this brings consistency across the codebase.

