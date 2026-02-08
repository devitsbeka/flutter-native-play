
## Fix Broken Avatar in QuizPlayModal and Related Components

### Problem

The broken avatar (question mark) appears because the user's avatar URL is stored in the database as a local asset path like `/src/assets/avatars/mascot-avatar-3.png`. This path only works when processed through `resolveAvatarUrl()`, which maps it to the actual bundled asset. Several components use raw `<img>` tags without this resolution, causing the image to fail to load.

### Affected Components

| Component | Line | Issue |
|-----------|------|-------|
| `QuizPlayModal.tsx` | 352-353 | Raw `<img src={post.avatarUrl}>` without resolution |
| `AvatarWithFrame.tsx` | 86-87 | Raw `<img src={imageUrl}>` without resolution |
| `FeedPost.tsx` | 214-215 | Raw `<img src={post.avatarUrl}>` without resolution |
| `CollectionCarouselPost.tsx` | 164-165 | Raw `<img src={currentPost.avatarUrl}>` without resolution |

### Fix

Wrap all avatar URL sources through `resolveAvatarUrl()` before passing them to `<img>` tags:

**1. `src/components/shared/AvatarWithFrame.tsx`**
- Import `resolveAvatarUrl` from `@/utils/avatarUtils`
- Resolve `imageUrl` before rendering: `const resolvedUrl = resolveAvatarUrl(imageUrl);`
- Use `resolvedUrl` in the `<img>` tag and condition check
- This fixes the avatar everywhere `AvatarWithFrame` is used (feed posts, preview modals, etc.)

**2. `src/components/social/QuizPlayModal.tsx`**
- Import `resolveAvatarUrl` from `@/utils/avatarUtils`
- Resolve the avatar URL before rendering: `const resolvedAvatarUrl = resolveAvatarUrl(currentRoundPost?.avatarUrl || post.avatarUrl);`
- Use the resolved URL in the `<img>` tag, with a fallback to show the first letter of the username if resolution fails

**3. `src/components/social/FeedPost.tsx`**
- For non-user posts that use raw `<img>` tags (line 214-215), wrap `post.avatarUrl` through `resolveAvatarUrl()`

**4. `src/components/social/CollectionCarouselPost.tsx`**
- Same fix for the raw `<img>` at line 164-165

### Why This Fixes It

The `resolveAvatarUrl()` function maps paths like `/src/assets/avatars/mascot-avatar-3.png` to the actual Vite-bundled asset URL (e.g., `/assets/mascot-avatar-3-abc123.png`). Without this mapping, the browser tries to load the raw source path which doesn't exist in the built app.
