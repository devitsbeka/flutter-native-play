

## Fix: Avatar Preview Shows Black Striped Image

### Problem
After AI avatar generation, the preview step shows a black diagonal striped pattern instead of the actual avatar. This happens because the generated avatar is a transparent PNG (background was removed by the AI), and the preview `<img>` container has no background color -- so the browser's default "no content" pattern shows through the transparent areas.

### Solution

**File: `src/components/home/AvatarModal.tsx`** (preview step, lines ~1100-1182)

1. **Add a solid background color to the preview circle** so transparent avatars render correctly. Use the standard lavender background (`#E9CCFF`) that matches the AI avatar style.

2. **Add image load error handling** -- if the generated avatar fails to load entirely (not just transparency), fall back to the uploaded photo and show a warning toast suggesting to try again.

3. **Show the original uploaded photo alongside** the generated result (small thumbnail) so the user can compare before deciding to use or regenerate.

### Technical Details

Changes in the `step === "preview"` block (~line 1100):

- Add `bg-[#E9CCFF]` class to the `motion.div` wrapper that contains the avatar image (the `w-36 h-36 rounded-full overflow-hidden` element)
- Add a small comparison view: show the original `uploadedImage` as a small thumbnail (e.g., `w-12 h-12`) next to or below the generated avatar so the user can see the transformation
- Improve the `onError` handler: show a toast message suggesting regeneration when the image fails to load entirely

