

## Auto-Generate AI Avatar Before Animating

### Problem
When a user has a raw photo (not AI-generated), clicking "Animate" sends the raw photo directly to `animate-avatar`. This animates the original unprocessed image instead of first generating our styled AI avatar (semi-realistic 3D with lavender background) and then animating that.

### Solution
Modify the `animateAvatar` function in `AvatarModal.tsx` to detect whether the current avatar is already AI-generated. If not, first run it through `generate-avatar` to create our styled version, save it as the profile avatar, and then animate the resulting AI image.

### Detection Logic
Check the `avatar_generations` table for a record matching the current `profile.avatar_url` with `is_current = true`. If no such record exists, or if the current avatar URL doesn't match any AI-generated entry, the photo is a raw upload that needs AI generation first.

### Changes

**File: `src/components/home/AvatarModal.tsx`**

Update the `animateAvatar` function (lines 530-622):

1. Before calling `animate-avatar`, check if current avatar is in the `avatar_generations` table
2. If NOT found (raw photo):
   - Show toast: "AI ავატარი გენერირდება..."
   - Call `generate-avatar` with the current `profile.avatar_url`
   - Save the result to storage and `avatar_generations` table (reuse existing `saveAvatar` logic)
   - Update the profile's `avatar_url` to the new AI-generated image
   - Then proceed to animate the AI-generated image
3. If found (already AI-generated):
   - Proceed directly to animate as before

### Flow

```text
User clicks "Animate"
       |
       v
Is current avatar in avatar_generations?
       |
  NO --+-- YES
  |         |
  v         v
generate-avatar    animate-avatar
  |                (existing flow)
  v
Save AI avatar
  |
  v
animate-avatar
(with AI image)
```

### Technical Details

| File | Change |
|------|--------|
| `src/components/home/AvatarModal.tsx` | Modify `animateAvatar` to first generate AI avatar if current photo is raw |

The `animateAvatar` function will:
1. Query `avatar_generations` for a record where `avatar_url = profile.avatar_url` and `is_current = true`
2. If no record found, call `generate-avatar`, save result (upload to storage, insert into `avatar_generations`, update profile), then continue
3. Use the AI-generated URL (whether newly created or existing) as input to `animate-avatar`
4. Update toast messages to reflect the two-step process when needed (e.g., "Generating AI avatar first..." then "Now animating...")
