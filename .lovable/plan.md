

## Beautify "დავიწყოთ" Button + Make Card Clickable

### Changes

**File: `src/components/home/GuestSignupPromptModal.tsx`**

1. **Button styling**: Replace `variant="success"` with `variant="primary"` and add custom gradient + glow classes:
   - Pink-to-purple gradient background: `bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500`
   - Animated glow effect using a pulsing box-shadow (via inline style or a wrapper with `animate-pulse` shadow)
   - Sparkle icon remains, text stays "დავიწყოთ!"

2. **Glow animation**: Add a subtle pulsing glow around the button using framer-motion's `animate` on the wrapper div, cycling box-shadow opacity for a breathing glow effect in pink/purple tones.

3. **Make entire card clickable**: Wrap the entire modal content (benefits list + button area) in a clickable container that triggers `handleStart` on click, so tapping anywhere on the card starts onboarding. The close (X) button will use `e.stopPropagation()` to remain independent.

### Technical Details

| Change | Detail |
|--------|--------|
| Button variant | Switch from `variant="success"` to custom styling via `className` overrides on the ChunkyButton |
| Gradient | `bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500` applied via className override |
| Glow | Framer-motion wrapper with animated `boxShadow` cycling between `0 0 20px rgba(168,85,247,0.4)` and `0 0 40px rgba(236,72,153,0.6)` |
| Card clickable | Add `onClick={handleStart}` and `cursor-pointer` to the parent content wrapper inside GameModal |

