

## Fix Empty States: Card Wrapper + Onboarding Carousel for Trivias Tab

### What's Happening Now

- **Rooms tab**: Already works correctly -- new users see the feature onboarding carousel (animated gradient-border cards). After dismissing, they see the empty state wrapped in a card (`bg-card border border-border rounded-2xl`) with the dance-floor icon and "+ ოთახი" button.
- **Trivias tab ("ჩემი ტრივია")**: Missing both features. The empty state has no card wrapper (just floating text/icon) and no onboarding carousel for first-time users.

### What Will Change

1. **Wrap trivia empty state in a card** -- matching the rooms empty state style from image-308 (rounded card with border)
2. **Show the onboarding carousel first** for new users who haven't seen it yet and have no trivias, exactly like the rooms tab does

### Technical Changes

**File: `src/components/social/MyTriviaTab.tsx`**

1. Import `FeatureOnboardingCarousel` and `hasSeenFeatureOnboarding` from the existing carousel component
2. Add a `hasSeenOnboarding` state (same pattern as `MyRoomsSection`)
3. Add an `onNavigateToTab` prop so the carousel can navigate to other tabs
4. In the empty state block (lines ~1268-1290):
   - First check: if user hasn't seen onboarding and `sortFilter === "all"`, show `FeatureOnboardingCarousel`
   - After onboarding is dismissed: show the existing empty state BUT wrapped in a card container with `bg-card border border-border rounded-2xl` styling
   - Keep the existing trivia-buzzer icon, text, description, and "+ ტრივია" button inside the card

**File: `src/pages/TeamV2.tsx`**

- Pass the `onNavigateToTab` prop to `MyTriviaTab` so the onboarding carousel cards can navigate between tabs (just like `MyRoomsSection` already receives this prop)

### Visual Result

For a new user with no trivias:
1. First visit: They see the animated gradient-border onboarding carousel (Rooms, My Trivia, Explore cards)
2. After tapping any card: The carousel is dismissed, and they see the empty state as a rounded card with the trivia-buzzer icon, "ტრივიები ჯერ არ გაქვს" title, description, and the "+ ტრივია" button -- exactly matching the rooms empty state card style

### Files Changed
- `src/components/social/MyTriviaTab.tsx` -- add card wrapper + onboarding carousel logic
- `src/pages/TeamV2.tsx` -- pass `onNavigateToTab` to `MyTriviaTab`
