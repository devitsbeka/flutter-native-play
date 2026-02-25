

## Fix Welcome Onboarding Tooltips + Add Icons and Gradient

### Problems (from screenshot)
1. On mobile, the tooltip floats to the top-left corner of the screen instead of appearing directly above the corresponding bottom nav item
2. No 3D icons in the tooltip cards
3. Plain white card background -- should use a gradient animation

### Root Cause of Positioning
The `tooltipAbove` logic uses `targetRect.top > window.innerHeight / 2` to decide placement. Since the bottom nav items are at the very bottom of the screen, `tooltipAbove` is always `true`, and the tooltip is placed using `bottom: window.innerHeight - targetRect.top + 16`. This works conceptually, but the tooltip width (260px) combined with `getTooltipLeft()` centering logic causes it to anchor near the top-left when the target element is near an edge. The real issue is that on mobile the tooltip should ALWAYS appear above the nav bar, anchored to the target nav item's horizontal center.

### Changes

**1. Copy uploaded icons to `src/assets/onboarding/`**
- `rocket-2.png` (explore)
- `magical-shop.png` (shop)  
- `competition.png` (rank)
- `group-of-people-2.png` (team)
- `trivia-buzzer-2.png` (play)

**2. Rewrite `WelcomeOnboardingOverlay.tsx`**
- Add an `icon` field to each step in the `STEPS` array, importing the 5 uploaded images
- Fix tooltip positioning: on mobile, always place the tooltip above the bottom nav with a fixed `bottom` value (e.g., `bottom: navBarHeight + 16px`) and horizontally centered on the target element
- Add a gradient background to the tooltip card using an animated purple/blue gradient (similar to the app's `gradient-purple` utility but with a subtle animation via CSS or framer-motion)
- Render each step's icon (40x40px) next to the title inside the tooltip card
- Keep the arrow pointing down toward the highlighted nav item
- Increase tooltip width slightly (280px) to accommodate the icon

**3. Tooltip card design**
- Background: animated gradient (purple-to-blue shimmer via CSS `@keyframes` or a `background-size` animation)
- Layout: icon (left) + title/description (right) stacked, then step dots + buttons below
- Text color: white (since the background is dark gradient)
- Arrow color: matches the gradient start color
- Button: white background with dark text (inverted from current)

### Files to Create/Edit
1. **Copy 5 icon images** to `src/assets/onboarding/`
2. **`src/components/onboarding/WelcomeOnboardingOverlay.tsx`** -- Full rework: icon imports, gradient card, fixed mobile positioning
3. **`src/locales/ka.ts`** -- No changes needed (already has translations)

### Technical Details

Tooltip positioning fix (pseudocode):
```text
// Always place tooltip above nav on mobile
const tooltipBottom = window.innerHeight - targetRect.top + 16;
const tooltipLeft = clamp(
  targetCenterX - tooltipWidth/2,
  padding,
  windowWidth - padding - tooltipWidth
);
```

Gradient animation CSS (inline style):
```text
background: linear-gradient(135deg, #7C3AED, #6366F1, #8B5CF6);
background-size: 200% 200%;
animation: gradient-shift 3s ease infinite;
```

Icon rendering inside tooltip:
```text
<div className="flex items-start gap-3">
  <img src={step.icon} className="w-10 h-10 flex-shrink-0" />
  <div>
    <h3>title</h3>
    <p>description</p>
  </div>
</div>
```
