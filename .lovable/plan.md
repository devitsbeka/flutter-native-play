

## Fix: "გააცოცხლე ავატარი" Button Not Showing

### Root Cause
The current condition checks if the avatar URL contains `avatar_ai`:
```
profile.avatar_url.includes('avatar_ai')
```

But Nana's avatar URL is a raw uploaded photo: `avatars/.../avatar_1771149209631.png` -- it doesn't contain `avatar_ai`. That prefix only appears **after** the AI avatar generation step. So the button never shows.

### Fix
Change the condition to show the button for **any photo uploaded to storage** (real user photo), excluding mascot/bot avatars and Google profile pics. The logic:

- Has `avatar_url` (not null)
- URL contains `supabase.co/storage` (uploaded photo, not a local mascot asset)
- Does NOT have `animated_avatar_url`

### File: `src/pages/Index.tsx`

**Change the `showAnimatePrompt` condition from:**
```typescript
const showAnimatePrompt = !!profile?.avatar_url && 
  profile.avatar_url.includes('avatar_ai') && 
  !profile?.animated_avatar_url;
```

**To:**
```typescript
const showAnimatePrompt = !!profile?.avatar_url && 
  profile.avatar_url.includes('supabase.co/storage') && 
  !profile?.animated_avatar_url;
```

This covers both raw uploads (`avatar_XXXX.png`) and AI-generated avatars (`avatar_ai_XXXX.png`) stored in the avatars bucket, while excluding mascot paths (`/src/assets/avatars/mascot-...`) and Google profile pictures (`lh3.googleusercontent.com`).

Only one line changes in one file.

