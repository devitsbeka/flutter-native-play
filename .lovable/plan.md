
# Plan: Fix Default Avatar Storage and Display

## Problem Summary

Default avatars are broken because when users select one of the 10 default bot avatars from the picker, the **Vite-bundled URL** (e.g., `/assets/bot-avatar-1-BvXs2Ih1.png`) gets saved to the database. These hashed URLs are only valid for a single build and break after the app is redeployed.

**Evidence from database:**
- "Test" user has: `/assets/bot-avatar-1-BvXs2Ih1.png` ← Broken Vite hash
- "TriviaMaste" user has: proper Supabase storage URL ← Works fine

## Root Cause

In `AvatarModal.tsx`, when a user clicks on a default avatar:

```typescript
const DEFAULT_AVATARS = [
  botAvatar1, botAvatar2, ... // These are Vite-bundled URLs after import
];

// Line 660
onClick={() => selectDefaultAvatar(avatar)}
// ^^ avatar = "/assets/bot-avatar-1-BvXs2Ih1.png" (bundled URL)
```

The bundled URL is stored directly in the database, but it becomes invalid after any app rebuild.

## Solution

Modify `AvatarModal.tsx` to store **canonical paths** (e.g., `/src/assets/avatars/bot-avatar-1.png`) instead of bundled URLs. The existing `resolveAvatarUrl()` utility already correctly converts canonical paths to valid bundled URLs at runtime.

### File: `src/components/home/AvatarModal.tsx`

#### Change 1: Create a reverse mapping from bundled URLs to canonical paths

Add after the `DEFAULT_AVATARS` array definition:

```typescript
// Canonical paths that are stable across builds
// resolveAvatarUrl() converts these to valid bundled URLs at runtime
const DEFAULT_AVATAR_PATHS = [
  '/src/assets/avatars/bot-avatar-1.png',
  '/src/assets/avatars/bot-avatar-2.png',
  '/src/assets/avatars/bot-avatar-3.png',
  '/src/assets/avatars/bot-avatar-4.png',
  '/src/assets/avatars/bot-avatar-5.png',
  '/src/assets/avatars/bot-avatar-6.png',
  '/src/assets/avatars/bot-avatar-7.png',
  '/src/assets/avatars/bot-avatar-8.png',
  '/src/assets/avatars/bot-avatar-9.png',
  '/src/assets/avatars/bot-avatar-10.png',
];

// Map from bundled URL → canonical path for storage
const BUNDLED_TO_CANONICAL: Record<string, string> = {};
DEFAULT_AVATARS.forEach((bundledUrl, index) => {
  BUNDLED_TO_CANONICAL[bundledUrl] = DEFAULT_AVATAR_PATHS[index];
});
```

#### Change 2: Update `selectDefaultAvatar` to use canonical paths

```typescript
const selectDefaultAvatar = async (avatarBundledUrl: string) => {
  if (!user) return;
  
  setIsLoading(true);
  try {
    // Convert bundled URL to canonical path for stable storage
    const canonicalPath = BUNDLED_TO_CANONICAL[avatarBundledUrl] || avatarBundledUrl;
    
    // Update profile with canonical path
    const result = await updateProfile({ 
      avatar_url: canonicalPath,
      animated_avatar_url: null 
    });
    // ... rest unchanged
  }
};
```

#### Change 3: Fix the selection check for default avatars

The current check `profile?.avatar_url === avatar` won't work correctly because the profile stores canonical paths but `avatar` is a bundled URL. Update the grid to handle this:

```typescript
{DEFAULT_AVATARS.map((avatar, index) => {
  // Check against both bundled URL and canonical path for selection indicator
  const canonicalPath = DEFAULT_AVATAR_PATHS[index];
  const isSelected = profile?.avatar_url === avatar || profile?.avatar_url === canonicalPath;
  // ... rest unchanged
})}
```

### File: `src/utils/avatarUtils.ts`

No changes needed - it already correctly handles canonical paths like `/src/assets/avatars/bot-avatar-1.png`.

---

## Technical Details

### Why Canonical Paths Work

1. **Storage**: Database stores `/src/assets/avatars/bot-avatar-1.png`
2. **Display**: `resolveAvatarUrl()` matches the filename (`bot-avatar-1.png`) in `BOT_AVATAR_MAP`
3. **Result**: Returns the current build's valid bundled URL

This pattern survives app rebuilds because the canonical path is constant, while `resolveAvatarUrl()` dynamically resolves it to whatever the current bundled URL is.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/home/AvatarModal.tsx` | Add `DEFAULT_AVATAR_PATHS` and `BUNDLED_TO_CANONICAL` mapping |
| `src/components/home/AvatarModal.tsx` | Update `selectDefaultAvatar` to store canonical path |
| `src/components/home/AvatarModal.tsx` | Fix `isSelected` check in default avatar grid |

---

## Testing Checklist

1. Open avatar picker modal
2. Select a default avatar (e.g., the girl with brown hair)
3. Verify the avatar displays correctly in the modal
4. Close modal and verify avatar displays in home screen header
5. Join a TV game and verify avatar displays correctly on TV lobby screen
6. Refresh the page and verify avatar still displays correctly
7. Check database - confirm stored value is canonical path like `/src/assets/avatars/bot-avatar-1.png`
