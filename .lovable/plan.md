

## Fix: Tooltip position for Play step on desktop

The tooltip for the "Play" step on desktop/tablet floats too far above the actual play button because the positioning logic overestimates the tooltip height (hardcoded at 200px), creating a large visual gap between the modal and the highlighted button.

### Changes

**File: `src/components/onboarding/WelcomeOnboardingOverlay.tsx`**

1. Reduce the estimated tooltip height used for "above target" positioning from 200px to a more accurate value (~170px), and reduce the gap from 16px to 10px. This will bring the tooltip card much closer to the play button spotlight.

2. For the desktop play step specifically, ensure the tooltip positions snugly above the spotlight area (accounting for spotlight padding) so the arrow visually connects to the highlighted button.

3. The arrow already points downward correctly in this case -- no arrow changes needed, just tighter vertical spacing.

### What this fixes
- The tooltip card will sit directly above the play button spotlight with a small, consistent gap
- The arrow will visually connect the tooltip to the highlighted button
- No impact on mobile or side-nav positioning (those branches are unchanged)

