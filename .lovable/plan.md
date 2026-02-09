

## One-Time 24hr PRO Gift with Interactive Feature Clues

### Changes

**1. Make the gift one-time per user (BetaGiftModal.tsx)**
- Add a `returnee_gift_claimed_{userId}` localStorage key that is set after claiming
- In `useReturnGiftEligibility`, skip eligibility if this key exists
- This ensures the gift is given only once, ever

**2. Replace success phase benefits with interactive feature clues (BetaGiftModal.tsx)**
- Replace the current `UNLOCKED_FEATURES` list in the success phase with 3 interactive action cards:

| Icon | Text | Action on tap |
|------|------|---------------|
| `trivia-icon.png` | შექმენი ტრივია | Navigate to trivia creation |
| `rooms-icon.png` | ითამაშე მეგობრებთან | Navigate to room creation |
| `retro-tv-colored.png` | ითამაშე TV-ზე | Navigate to TV mode |

- Each card will be a tappable row with the icon, a short label, and a chevron arrow
- Tapping a card closes the modal and navigates to the relevant feature
- Keep the "დავიწყოთ!" button at the bottom for users who just want to dismiss

**3. Add 24hr timer badge in success phase**
- Show a small badge like "24 საათი" with a clock/hourglass icon to reinforce the time limit

### Files to Change

| File | Change |
|------|--------|
| `src/components/shared/BetaGiftModal.tsx` | Add one-time claim key; replace success UNLOCKED_FEATURES with 3 interactive action cards that navigate to features; add 24hr timer badge |

### Technical Details

- Import `useNavigate` from react-router-dom
- Import `retro-tv-colored.png` for TV icon (already used elsewhere)
- The 3 action cards navigate to: `/social?tab=my-trivia`, `/social?tab=rooms`, and the TV mode entry point
- `handleClose` on success will call `onClaimed` which already handles cleanup
- One-time key: `localStorage.setItem(\`returnee_gift_claimed_\${userId}\`, "true")` set in `handleClaim` after success
- In `useReturnGiftEligibility`: check `localStorage.getItem(\`returnee_gift_claimed_\${userId}\`)` and skip if truthy
