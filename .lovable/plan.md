

## Fix Onboarding Tooltips: Positioning, Stroke Gradient, Icons

### Problems
1. **Mobile**: Tooltips not visible — the overlay renders nothing because `targetRect` stays null or the `bottom` positioning pushes content off-screen
2. **Desktop/Tablet**: Tooltip is cropped at the top edge of the viewport
3. **Gradient style**: Currently a solid fill gradient on the card background. Should be a **spinning conic-gradient border stroke** (like the team page's `FeatureOnboardingCarousel` cards) with a dark/semi-transparent card interior
4. **Icons**: Already imported but should display inside the tooltip on all screen sizes

### Solution

**Rewrite `src/components/onboarding/WelcomeOnboardingOverlay.tsx`:**

**Positioning fix:**
- On mobile (bottom nav), use `bottom: window.innerHeight - targetRect.top + 12` to place tooltip above the nav item, and clamp `left` so the tooltip stays within screen bounds
- On desktop (left sidebar), position the tooltip to the **right** of the target element: `top: targetRect.top`, `left: targetRect.right + 12`, with the arrow pointing left
- Add a fallback: if `targetRect` is null after 300ms, retry the querySelector with a longer delay (the nav may not have mounted yet in the preview page)

**Spinning conic-gradient border (matching team page pattern):**
- Use the same technique from `FeatureOnboardingCarousel.tsx`:
  - Outer wrapper with `absolute -inset-[2px] rounded-2xl overflow-hidden`
  - Inner `div` with `animate-spin-slow` and `conic-gradient(from 0deg, hsl(var(--primary)), hsl(280, 80%, 60%), hsl(320, 80%, 60%), hsl(var(--primary)))`
  - Card content sits on top with `bg-card rounded-2xl` background
- Remove the current solid gradient fill (`gradientStyle`) and the `onboarding-gradient-shift` keyframes
- Add a subtle pulsing box-shadow glow (`animate-pulse-shadow`) around the card

**Icon rendering:**
- Keep the existing icon imports (rocket, shop, competition, group-of-people, trivia-buzzer)
- Render `step.icon` as a 40x40 image inside the tooltip, left-aligned next to title/description
- Works on mobile, tablet, and desktop

**Arrow direction:**
- Mobile: arrow points **down** toward the bottom nav item
- Desktop: arrow points **left** toward the sidebar nav item
- Detect layout using `window.innerWidth >= 1024` (lg breakpoint where desktop nav appears)

### Files to Edit
1. `src/components/onboarding/WelcomeOnboardingOverlay.tsx` — Full rework of positioning logic, replace solid gradient with conic-gradient spinning border, keep icons

### Technical Details

```text
Tooltip card structure (matching team page pattern):

<div className="relative">
  <!-- Spinning conic-gradient border -->
  <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
    <div className="absolute inset-0 animate-spin-slow"
         style={{ background: "conic-gradient(from 0deg, ...)" }} />
  </div>
  
  <!-- Card content -->
  <div className="relative bg-card rounded-2xl p-4">
    <!-- Pulse glow -->
    <div className="absolute inset-0 rounded-2xl opacity-50 animate-pulse-shadow" />
    
    <!-- Icon + text -->
    <div className="flex items-start gap-3">
      <img src={step.icon} className="w-10 h-10" />
      <div>
        <h3>title</h3>
        <p>description</p>
      </div>
    </div>
    <!-- dots + buttons -->
  </div>
</div>
```

Positioning logic:
```text
const isDesktop = window.innerWidth >= 1024;

if (isDesktop) {
  // Place tooltip to the right of the sidebar item
  top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
  left = targetRect.right + 12
  arrow: points left
} else {
  // Place tooltip above the bottom nav item
  bottom = window.innerHeight - targetRect.top + 12
  left = clamp(centerX - width/2, padding, maxRight)
  arrow: points down
}
```
