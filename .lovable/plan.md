
# Fix Broken Avatar Display in Trivia Cards

## Problem
In the "My Trivia" section, avatar images show as broken when the URL is expired or invalid. The cards display a broken image icon with alt text "Avat" instead of a proper fallback.

## Root Cause
The `PersonalTriviaCard` and `StandaloneQuizCard` components in `MyTriviaTab.tsx` use raw `<img>` tags with only a null check (`profile?.avatar_url`), but don't handle cases where the URL exists but the image fails to load.

Current code pattern:
```tsx
{profile?.avatar_url ? (
  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
) : (
  <span className="text-lg">👤</span>
)}
```

## Solution
Replace the raw `<img>` usage with the `SafeAvatarImage` component, which:
- Uses `resolveAvatarUrl()` to handle various URL formats
- Has an `onError` handler to show fallback when images fail to load
- Provides a gradient background with initials as fallback

---

## File to Modify

### `src/components/social/MyTriviaTab.tsx`

**Change 1**: Add import for `SafeAvatarImage`
```tsx
import { SafeAvatarImage } from '@/components/shared/SafeAvatar';
```

**Change 2**: Update `PersonalTriviaCard` avatar (lines 497-502)

Replace:
```tsx
<div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex items-center justify-center border-2 border-border flex-shrink-0">
  {profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
  ) : (
    <span className="text-lg">👤</span>
  )}
</div>
```

With:
```tsx
<div className="w-10 h-10 rounded-full overflow-hidden bg-secondary border-2 border-border flex-shrink-0">
  <SafeAvatarImage 
    avatarUrl={profile?.avatar_url}
    fallback={profile?.nickname || 'U'}
    containerClassName="w-full h-full"
  />
</div>
```

**Change 3**: Update `StandaloneQuizCard` avatar (lines 610-617)

Same replacement pattern as above.

---

## Visual Result

| Before | After |
|--------|-------|
| Broken image icon with "Avat" text | Gradient background with user's initial |
| Poor user experience | Clean fallback matching app design |

---

## Technical Details

The `SafeAvatarImage` component:
1. Resolves avatar URLs using `resolveAvatarUrl()` (handles Vite hashes, local paths)
2. Tracks `hasError` state via `onError` callback
3. Shows gradient fallback with initials when URL is null or fails to load
