

## Replace Old Leaderboard AI Users with Mascot Accounts

### Problem
The league leaderboard filler users (AI bots) use outdated English usernames like "TechWiz", "StarPlayer_1", "GameMaster" across all tiers, and have no avatars (`avatar_url: null`), causing them to render as plain colored circles with letters. This looks unprofessional for public beta.

### Solution
Update `src/hooks/useLeaderboardPrefetch.ts` to:

1. **Replace all AI_NAMES** with proper Georgian-style names using the same "FirstName L." convention used in the opponents system (e.g., "Giorgi K.", "Mariami G.", "Nika T.").
2. **Assign mascot avatars** to each AI user instead of `null` -- import and cycle through the 8 mascot avatar images already available in `src/assets/avatars/`.
3. Keep tier-appropriate name sets but all in Georgian style to match the app's target audience.

### Changes

**File: `src/hooks/useLeaderboardPrefetch.ts`**

- Import all 8 mascot avatar images at the top (same pattern used in `opponents.ts`)
- Replace `AI_NAMES` with Georgian "FirstName L." formatted names for all tiers:
  - Tier 1 (Bronze): 15 unique Georgian names like "Giorgi K.", "Mariami G.", "Nika T."
  - Tier 2 (Silver): 15 unique Georgian names like "Daviti M.", "Elene S.", "Luka B."
  - Tier 3 (Gold): 15 unique Georgian names like "Irakli Ch.", "Gvantsa P.", "Sandro Z."
  - (Tiers 4-5 similarly updated, no duplicate names across tiers)
- In `generateFakeUsers()`, assign `avatar_url` using the mascot avatar images (cycling through 8 avatars deterministically based on index)

### Result
- All AI filler users in every league tier will show proper Georgian names with mascot avatars
- Consistent with the rest of the app's visual identity (opponents, game screens, etc.)
- No more "TechWiz", "StarPlayer_1" type names appearing in the leaderboard
