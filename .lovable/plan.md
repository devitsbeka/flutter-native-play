

## Limit Avatar Generations to 5 Per User

### What Changes

Currently there is no limit on how many AI avatars a user can generate. We will add a **maximum of 5 generations** per user.

### Implementation

**File: `src/components/home/AvatarModal.tsx`**

1. **Add a constant** `MAX_AVATAR_GENERATIONS = 5` at the top of the file.

2. **Track generation count**: After `loadGenerations()` fetches the user's `avatar_generations` rows, derive the count from `generations.length`. This count is already available since the modal loads all generations on open.

3. **Block generation when limit reached**: In `generateAvatar()` (line ~276), before proceeding with the AI call, check if `generations.length >= 5`. If so, show a toast error (e.g., "მაქსიმუმ 5 ავატარის გენერაცია შეგიძლიათ") and return early.

4. **Disable the generate button in UI**: In the upload step where the "Generate" / selfie / upload buttons are rendered, disable them and show remaining count (e.g., "დარჩა 3/5") when the user has fewer generations left. When at 5/5, disable the selfie and upload options entirely with a message indicating the limit is reached.

5. **Also guard `animateAvatar()`**: The animate flow (line ~559) can also trigger `generate-avatar` if no AI version exists. Add the same limit check there before generating a new avatar.

6. **Also guard `BackgroundGenerationContext.startAvatarGeneration()`** (`src/contexts/BackgroundGenerationContext.tsx`): This is another path that can trigger avatar generation. Add the same count check at the start -- query `avatar_generations` count for the user and block if >= 5.

### UI Changes

- Show remaining generations count near the selfie/upload buttons: "დარჩა X/5 გენერაცია"
- When limit is reached (0 remaining), gray out the generation options and show: "მაქსიმუმ 5 ავატარის გენერაცია შეგიძლიათ"
- Users can still select from their existing generated avatars or use the default avatar options

