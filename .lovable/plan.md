

## Increase Carousel Display Duration by 2 Seconds

### What Changes
The onboarding feature carousel on the team page currently auto-rotates every **4 seconds**, which is too fast for first-time users to read the descriptions. This will increase it to **6 seconds** per card.

### Change

**File: `src/components/team/FeatureOnboardingCarousel.tsx`**
- Change the auto-rotation interval from `4000ms` to `6000ms` (line 63)

This is a one-line change that gives users an extra 2 seconds to read each feature card before it transitions to the next one.

