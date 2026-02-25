

## Post-Signup Welcome Onboarding Modal

### Overview
Create a multi-step welcome modal that shows to users immediately after they complete signup. It walks them through the 4 core features using a swipeable/clickable carousel inside a full-screen modal, with PostHog tracking for each step.

### Trigger Logic
- New localStorage key: `mytrivia_welcome_onboarding_seen`
- Show the modal on the home page (`Index.tsx`) when:
  1. User is authenticated (`user` exists)
  2. `hasCompletedOnboarding` is true (signup just finished)
  3. `localStorage` key is NOT set
- Set the key after the user completes/dismisses the modal
- This ensures it only shows once per account, right after signup

### New Component: `src/components/onboarding/WelcomeOnboardingModal.tsx`

A full-screen animated modal with 4 steps, each featuring:

**Step 1 - Discover:** icon (`explore-icon.png`), title "Thousands of Questions", description about browsing categories in /discover

**Step 2 - TV Mode:** icon (`rooms-icon.png` or `trivia-buzzer.png`), title "Play on TV", description about interactive TV mode with friends

**Step 3 - Game Rooms:** icon (`group-of-people.png`), title "Game Rooms", description about creating rooms, choosing categories, sharing URL

**Step 4 - Create Trivia:** icon (`trivia-icon.png` or `icon-ai-sparkle.png`), title "Create Your Trivia", description about AI-powered custom quiz creation from a prompt

**UI Details:**
- Reuses the `NotificationModal` visual style (glass container, backdrop blur, rounded-3xl, spring animations)
- Step indicator dots at bottom (like `FeatureOnboardingCarousel`)
- "Next" button advances steps, final step shows "Let's Go!" button
- "Skip" secondary button to dismiss early
- Each step animates in with `framer-motion` slide transition
- Works on desktop, tablet, and mobile (max-w-sm centered, responsive padding)

### Translation Keys
Add to both `en.ts` and `ka.ts` in the `extra` section:
- `welcomeOnboardingStep1Title` / `welcomeOnboardingStep1Desc`
- `welcomeOnboardingStep2Title` / `welcomeOnboardingStep2Desc`
- `welcomeOnboardingStep3Title` / `welcomeOnboardingStep3Desc`
- `welcomeOnboardingStep4Title` / `welcomeOnboardingStep4Desc`
- `welcomeOnboardingNext` / `welcomeOnboardingSkip` / `welcomeOnboardingDone`

### PostHog Tracking
Add to `src/lib/analytics.ts`:
- `trackWelcomeOnboardingStarted()` -- fired when modal opens
- `trackWelcomeOnboardingStepViewed(step: number, stepName: string)` -- fired on each step transition
- `trackWelcomeOnboardingCompleted(stepsViewed: number)` -- fired when user clicks "Let's Go!" on the last step
- `trackWelcomeOnboardingSkipped(stepSkippedAt: number)` -- fired when user clicks "Skip"

### Integration in `src/pages/Index.tsx`
- Import the new `WelcomeOnboardingModal`
- Add state: `const [showWelcomeOnboarding, setShowWelcomeOnboarding] = useState(false)`
- Add effect: after auth loads, if user exists + `hasCompletedOnboarding` + localStorage key not set, show modal with a small delay (500ms to let the page render)
- Render `<WelcomeOnboardingModal isOpen={showWelcomeOnboarding} onClose={() => setShowWelcomeOnboarding(false)} />`

### Files to Create/Modify
1. **Create** `src/components/onboarding/WelcomeOnboardingModal.tsx` -- the multi-step modal component
2. **Edit** `src/lib/analytics.ts` -- add 4 tracking functions
3. **Edit** `src/locales/en.ts` -- add English translation keys
4. **Edit** `src/locales/ka.ts` -- add Georgian translation keys
5. **Edit** `src/pages/Index.tsx` -- integrate the modal trigger

