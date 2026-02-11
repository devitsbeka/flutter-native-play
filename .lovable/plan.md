

## Mix Mascot + AI-Generated Avatars in VS Screen Slot Animation

### Current Behavior
The VS screen opponent search animation cycles through only the 8 mascot emoji avatars (`mascot-avatar-1.png` through `mascot-avatar-8.png`). This makes the search look monotonous and doesn't reflect the variety of player avatars in the app.

### What Changes
During the "finding opponent" slot machine animation, the cycling avatars will be a shuffled mix of:
- 8 mascot avatars (local assets, already imported)
- AI-generated photo-based avatars (fetched from the database at mount)

This creates a more dynamic, realistic search animation showing both avatar types -- exactly like the reference screenshots.

### Technical Details

**File: `src/components/game/VSScreen.tsx`**

1. Add a `useEffect` that fetches AI-generated avatar URLs from the `profiles` table on mount:
   - Query profiles where `avatar_url` contains `avatar_ai` (the AI-generated pattern)
   - Limit to ~10 results, randomly ordered
   - Extract just the URLs

2. Create a combined `slotAvatars` array that merges:
   - The 8 existing mascot imports
   - The fetched AI avatar URLs (up to 8-10)
   - Shuffled together randomly

3. The slot cycling logic (lines 136-139) already picks random entries from `slotAvatars`, so it will naturally alternate between mascot and AI avatars once the array is mixed.

4. Handle the async nature: start with mascot-only avatars, then once the DB fetch completes, merge in the AI ones. Since the animation runs for ~12 cycles over a few seconds, the fetch will complete well before the animation ends.

### Files Changed

| File | Change |
|------|--------|
| `src/components/game/VSScreen.tsx` | Fetch AI avatar URLs from DB, merge with mascot avatars in slot array |

