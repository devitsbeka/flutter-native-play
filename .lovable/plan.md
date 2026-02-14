

## Add CTA Buttons to Onboarding Carousel Cards

### Problem
Users see the onboarding carousel explaining what Rooms and Trivias are, but there are no clear action buttons to create them. Users don't notice they should click the cards, resulting in low room/trivia creation rates.

### Changes

**File: `src/components/team/FeatureOnboardingCarousel.tsx`**

1. **Add new props** to `FeatureOnboardingCarouselProps`:
   - `onCreateRoom?: () => void`
   - `onCreateTrivia?: () => void`

2. **Add CTA button labels to FEATURE_TOOLTIPS data**:
   - Rooms card: button label "+ ოთახი" (+ Room)
   - My Trivia card: button label "+ ტრივია" (+ Trivia)
   - Explore card: button label "აღმოაჩინე" (Explore) -- no create action, just navigates

3. **Add a glowing CTA button inside `FeatureCard`**:
   - Place below the description text
   - Use a custom styled button with animated glow effect (pulsing box-shadow + gradient background matching the card's color scheme)
   - The button will call a dedicated `onAction` callback (mapped from props: rooms -> `onCreateRoom`, my-trivia -> `onCreateTrivia`, explore -> navigate to tab)
   - Clicking the button also marks onboarding as seen

4. **Glowing button style**:
   - Gradient background matching card theme (primary purple for rooms, primary for trivia)
   - Animated pulsing glow shadow using framer-motion's `animate` prop
   - White bold text, rounded-xl, proper padding
   - The glow animation: `boxShadow` alternating between subtle and bright glow

**File: `src/components/team/MyRoomsSection.tsx`**

5. **Pass `onCreateRoom` prop** to `FeatureOnboardingCarousel`:
   - Already has access to `onCreateRoom` from its own props

**File: `src/components/social/MyTriviaTab.tsx`**

6. **Pass `onCreateTrivia` callback** to `FeatureOnboardingCarousel`:
   - Wire it to the existing trivia creation flow (the `+` button handler that already exists in MyTriviaTab)

### Technical Details

The `FeatureCard` component will be updated to accept an optional `actionLabel` and `onAction` callback. The glowing button will use framer-motion's `animate` for a continuous pulsing glow effect:

```
animate={{ boxShadow: ["0 0 15px rgba(var(--primary-rgb), 0.4)", "0 0 30px rgba(var(--primary-rgb), 0.7)", "0 0 15px rgba(var(--primary-rgb), 0.4)"] }}
transition={{ duration: 2, repeat: Infinity }}
```

The button will be placed at the bottom of each card, clearly visible with the `+ ოთახი` / `+ ტრივია` label, making the CTA unmissable.
