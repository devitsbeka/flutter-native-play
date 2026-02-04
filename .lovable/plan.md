
# Plan: Fix Player Avatar Fallback to Mascot on VS Screen

## Problem Analysis

On the VS Screen, when a user hasn't set an avatar, they see a random bot avatar instead of the mascot (guest-avatar.png). 

### Root Cause
The current code at line 521 is:
```tsx
avatarUrl={profile?.avatar_url || defaultGuestAvatar}
```

This works for `null/undefined`, but fails when:
1. `profile?.avatar_url` is an empty string `""` 
2. `profile?.avatar_url` is a broken/invalid URL

The JavaScript `||` operator treats empty string as falsy, but the SmartAvatar component then receives an empty string and may try to render it instead of falling back.

Additionally, the SmartAvatar component's internal logic at line 156 uses `resolveAvatarUrl()` which may return `undefined` for invalid URLs, but the image still attempts to render.

### Expected Behavior
When a user has no avatar set (`avatar_url` is null, undefined, or empty), the VS Screen should display the mascot character (`guest-avatar.png`) just like the Index page does.

---

## Solution

### Option A: Fix at VSScreen Level (Recommended)
Add explicit empty string check in VSScreen.tsx:

```tsx
// Line 521 - Before:
avatarUrl={profile?.avatar_url || defaultGuestAvatar}

// After:
avatarUrl={profile?.avatar_url && profile.avatar_url.trim() !== '' ? profile.avatar_url : defaultGuestAvatar}
```

This ensures:
- `null` → mascot
- `undefined` → mascot  
- `""` (empty string) → mascot
- `"  "` (whitespace) → mascot
- Valid URL → user's avatar

### Changes Required

**File: `src/components/game/VSScreen.tsx`**

| Line | Current | Change |
|------|---------|--------|
| 521 | `avatarUrl={profile?.avatar_url \|\| defaultGuestAvatar}` | Add explicit check for empty/whitespace strings |
| 522 | `animatedAvatarUrl={profile?.animated_avatar_url \|\| defaultGuestAvatarAnimated}` | Same treatment for animated avatar |

---

## Technical Implementation

```tsx
// Create helper variables for cleaner code
const playerAvatarUrl = profile?.avatar_url?.trim() 
  ? profile.avatar_url 
  : undefined;
const playerAnimatedUrl = profile?.animated_avatar_url?.trim() 
  ? profile.animated_avatar_url 
  : undefined;

// Then in the SmartAvatar:
<SmartAvatar
  avatarUrl={playerAvatarUrl || defaultGuestAvatar}
  animatedAvatarUrl={playerAnimatedUrl || defaultGuestAvatarAnimated}
  fallback={profile?.nickname || "P"}
  size="2xl"
  autoPlay={true}
  showSparkle={false}
/>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/game/VSScreen.tsx` | Add proper fallback logic for player avatar to show mascot when no avatar is set |

---

## Expected Result

- Users without an avatar will see the friendly mascot character on the VS Screen
- Consistent experience with the Index page mascot display
- Animated mascot video plays when user has no animated avatar set
