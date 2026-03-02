

## Add Tournament Banner and User Info Section to Home Screen

### What We're Building
Based on your screenshot, we'll add two new visual sections to the home screen (for logged-in users):

1. **Tournament Banner** -- placed between the header and the weekly streak row
   - Left side: Trophy icon (Champions League style) with a countdown timer (12:08:58)
   - Right side: Large green "Play with Friends" button
   - Rounded container with subtle background

2. **User Info Section** -- placed between the weekly streak row and the walking character
   - Country flag (from user's profile)
   - Bold username ("Beka")
   - Coin balance with icon (e.g. "69K")
   - Gem balance with icon (e.g. "1")
   - Centered layout

### Technical Plan

**1. Create `src/components/home/TournamentBanner.tsx`**
- A new component that renders:
  - A rounded container with a light/white background and subtle shadow
  - Left: trophy emoji/icon + countdown timer (hardcoded initially, can be connected to a real timer later)
  - Right: green gradient button labeled with the Georgian translation key for "Play with Friends" (using `useLanguage`)
  - The green button navigates to `/team` with `{ openCreateRoom: true }` state (same as the existing "+ NEW" button behavior)
- Uses `framer-motion` for entrance animation
- Countdown timer uses `useState` + `useEffect` with `setInterval` to tick down from a configurable end time

**2. Create `src/components/home/UserInfoBar.tsx`**
- Displays centered below the streak row:
  - Country flag using `getCountryFlag()` or flag emoji from profile's `country_code`
  - Bold nickname text
  - Coin icon + formatted coin count
  - Gem icon + formatted gem count
- Uses existing `coinIcon`/`gemIcon` assets and `formatCompactNumber` utility
- Clickable name opens the change-name modal
- Clickable coins/gems navigate to power-ups shop

**3. Update `src/pages/Index.tsx`**
- Import `TournamentBanner` and `UserInfoBar`
- Insert `TournamentBanner` between the header (`</header>`) and the `WeeklyStreakRow` (around line 752)
- Insert `UserInfoBar` after the `WeeklyStreakRow` (around line 755), before the walking man section
- Pass required props: profile, coins, gems, navigation callbacks
- Both sections only render for logged-in users (`user &&`)

### Visual Match to Screenshot
- Tournament banner: white/light card, trophy on left, green button on right, same proportions as screenshot
- User info: centered flag + name + currency row matching the screenshot layout
- The walking man Lottie already exists at the bottom and stays as-is
- The castle/landscape in the screenshot is the existing background image -- no changes needed there

### Files Changed
| File | Action |
|------|--------|
| `src/components/home/TournamentBanner.tsx` | Create new |
| `src/components/home/UserInfoBar.tsx` | Create new |
| `src/pages/Index.tsx` | Add imports and render both components |

