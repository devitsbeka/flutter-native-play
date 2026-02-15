

## Fix: Auto-Detect Face for Existing Avatars

### Problem
The "გააცოცხლე ავატარი" button requires `has_face_photo = true`, but Nana's photo was uploaded **before** the detect-face feature was added. The database still shows `has_face_photo = false`. The detect-face function exists and works, but was never called for this photo.

### Solution
Add a one-time auto-detection effect on the main page: when a user has a storage-based avatar, no animated avatar, and `has_face_photo` is not yet `true`, automatically call the `detect-face` function to backfill the value. Then refresh the profile so the button appears immediately.

### File: `src/pages/Index.tsx`

Add a `useEffect` that runs when the profile loads:

```typescript
// Auto-detect face for existing avatars that haven't been checked yet
useEffect(() => {
  if (
    user &&
    profile?.avatar_url &&
    profile.avatar_url.includes('supabase.co/storage') &&
    profile.has_face_photo !== true &&
    !profile.animated_avatar_url
  ) {
    supabase.functions.invoke("detect-face", {
      body: { imageUrl: profile.avatar_url, userId: user.id },
    }).then(() => {
      // Refresh profile to pick up the updated has_face_photo value
      refreshProfile();
    }).catch(err => console.warn("Auto face detection failed:", err));
  }
}, [user?.id, profile?.avatar_url]);
```

This ensures:
- Runs once when the profile loads
- Only triggers for storage-based avatars that haven't been checked
- Refreshes the profile after detection so the button appears without page reload
- Silently catches errors (non-blocking)
- Won't re-trigger once `has_face_photo` is set to `true` or `false` (we guard with `!== true` so it runs once for `false`/`null`, then after the update it won't run again on next render if result is `true`)

**Note:** To prevent repeated calls if the face detection returns `false` (e.g., a flower photo), we'll track it with a ref so it only runs once per session.

### Technical Detail
We need access to `refreshProfile` -- need to verify it exists in the auth context. If not, we'll use a local state trigger or call `supabase.from('profiles').select()` directly to update local state.

One file changed, one `useEffect` added.

