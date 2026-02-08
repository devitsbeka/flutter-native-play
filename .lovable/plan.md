

## Fix: Make Exhausted Play Button Clickable to Show PRO Modal

### Problem

On the home screen (desktop/tablet), when a user has exhausted their 5 lifetime free plays, the large "ითამაშე" button turns gray with an hourglass icon and becomes **disabled**. This means clicking it does nothing -- the user can't trigger the PRO upgrade modal.

The `handlePlayClick` function in `Index.tsx` already has the correct logic to show the PRO modal when plays are exhausted (line 242-246), but the button's `disabled` attribute prevents the click event from reaching that handler.

The mobile bottom nav play button does NOT have this issue -- it's always clickable.

### Solution

Remove the `disabled` attribute from the `DesktopPlayButtonLarge` button so the click handler fires even when plays are exhausted. The button will still appear gray (visual indication of exhaustion), but clicking it will now trigger `handlePlayClick`, which shows the PlayLimitModal with PRO upgrade options.

### Technical Details

**File: `src/components/home/DesktopPlayButtonLarge.tsx`**

1. Remove the `isDisabled` variable (line 23) or repurpose it for styling only
2. Remove `disabled={isDisabled}` from the `motion.button` (line 73)
3. Keep the visual styling -- the button still turns gray and shows hourglass when exhausted
4. Remove `cursor-not-allowed` from className since it's always clickable now

This way:
- Button always looks gray when exhausted (visual feedback preserved)
- Clicking the gray button calls `handlePlayClick`
- `handlePlayClick` checks `canPlay` is false, shows the PlayLimitModal with PRO upgrade and regen timer
- Users can see the "Become PRO" option and the free play regeneration countdown

### Files Changed
- `src/components/home/DesktopPlayButtonLarge.tsx` -- remove disabled state, keep visual exhausted styling
