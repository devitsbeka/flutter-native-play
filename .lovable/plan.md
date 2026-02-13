

## Fix Broken Avatars in Game Screens

### Problem
The `QuizPlayerAvatar` component renders avatar images using a raw `<img>` tag without resolving local asset paths. When `profile.avatar_url` contains a path like `/src/assets/avatars/mascot-avatar-3.png`, the browser cannot load it, resulting in a broken image icon (as seen in your screenshot on the game playing screen).

### Root Cause
The `QuizPlayerAvatar` component in `src/components/ui/quiz-player-avatar.tsx` (line 178) uses `avatarUrl` directly in an `<img src>` without calling `resolveAvatarUrl()` from the avatar utilities. Other components like `SafeAvatar`, `AvatarWithFrame`, and `ResolvedAvatarImage` already handle this correctly.

### Solution
Add `resolveAvatarUrl()` to the `QuizPlayerAvatar` component so it properly resolves local asset paths to bundled URLs.

### Technical Details

**File: `src/components/ui/quiz-player-avatar.tsx`**

1. Import `resolveAvatarUrl` from `@/utils/avatarUtils`
2. Resolve the `avatarUrl` prop before using it:
```typescript
const resolvedAvatarUrl = resolveAvatarUrl(avatarUrl);
```
3. Update `displayUrl` (line 116) to use `resolvedAvatarUrl` instead of `avatarUrl`
4. Add an `onError` handler to the `<img>` tag that falls back to a default avatar if the resolved URL also fails

### Affected Screens
This fix automatically repairs avatars on all screens using `QuizPlayerAvatar`:
- Solo game screen (`QuizGameScreenProd.tsx`) -- the screen in your screenshot
- Multiplayer game screen (`MultiplayerGameScreen.tsx`)
- Category quiz page (`CategoryQuizPage.tsx`)

### Files to Edit
- `src/components/ui/quiz-player-avatar.tsx` -- add URL resolution + error handling (single file fix)
