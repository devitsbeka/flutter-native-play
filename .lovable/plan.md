

## Fix: Show Relevant Onboarding Cards Per Tab

### Problem
The onboarding carousel always shows all 3 cards (Rooms, Trivia, Explore) regardless of which tab the user is on. So when you're on the "My Trivia" tab, you see the Rooms card with "+ ოთახი" button, and vice versa. This is confusing -- each tab should prioritize its own relevant card.

### Fix

**File: `src/components/team/FeatureOnboardingCarousel.tsx`**

Add a new optional prop `contextTab` to the component that tells the carousel which tab it's being shown in. Then filter and reorder the cards so the relevant card comes first:

- When `contextTab === "rooms"` -- show Rooms card first, then Trivia, then Explore
- When `contextTab === "my-content"` -- show Trivia card first, then Rooms, then Explore
- Default (no context) -- keep current order

**File: `src/components/team/MyRoomsSection.tsx`**

Pass `contextTab="rooms"` to the `FeatureOnboardingCarousel`.

**File: `src/components/social/MyTriviaTab.tsx`**

Pass `contextTab="my-content"` to the `FeatureOnboardingCarousel`.

### Technical Details

In `FeatureOnboardingCarousel.tsx`:

1. Add `contextTab?: string` to `FeatureOnboardingCarouselProps`
2. Inside the component, compute a filtered/reordered tooltip list:
   - If `contextTab === "rooms"`: put the rooms card first
   - If `contextTab === "my-content"`: put the trivia card first
   - Otherwise: keep original order
3. Use this reordered list instead of `FEATURE_TOOLTIPS` for rendering

This way each tab opens with its most relevant card visible and the CTA button matches what the user would expect.

