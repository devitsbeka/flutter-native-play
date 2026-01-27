
# Fix Avatar Display Issue on Main Page

## Problem Identified

The `AvatarCircle` component on the main page (Index.tsx) is missing **error handling** for avatar images. When an avatar image fails to load:

1. The `Avatar.tsx` component has `onError` handling that shows a fallback emoji
2. But `AvatarCircle.tsx` does NOT have this - it just shows a broken image/question mark

Looking at the code:
- `AvatarCircle.tsx` line 211-224: The `<img>` tag has NO `onError` handler
- When image loading fails, there's no fallback - hence the user sees a question mark (browser's broken image icon)

## Solution

Add error handling to `AvatarCircle.tsx` so that when avatar images fail to load, it shows the fallback (🎮 emoji or a default avatar).

---

## Technical Changes

### File: `src/components/home/AvatarCircle.tsx`

#### 1. Add error state
```typescript
const [hasImageError, setHasImageError] = useState(false);
```

#### 2. Reset error state when avatarUrl changes
```typescript
useEffect(() => {
  setHasImageError(false);
}, [avatarUrl]);
```

#### 3. Add onError handler to the img tag and show fallback on error
```typescript
{avatarUrl && !hasImageError ? (
  <>
    <motion.img 
      src={resolveAvatarUrl(avatarUrl) || avatarUrl} 
      alt="Avatar" 
      className="rounded-full object-cover"
      onError={() => setHasImageError(true)}
      // ... rest of props
    />
    // ... video overlay
  </>
) : (
  // Fallback div with 🎮 emoji (already exists at line 253-265)
)}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/home/AvatarCircle.tsx` | Add `hasImageError` state + `onError` handler + condition to show fallback |

---

## Summary

The fix adds proper error handling to `AvatarCircle` so that if the avatar image fails to load for any reason (network issues, invalid URL, etc.), it will show the fallback 🎮 emoji instead of a broken image/question mark icon.
