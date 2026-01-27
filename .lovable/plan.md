

# Fix Broken Avatar in Room Cards

## Problem Identified

The room card for "თავგადასავლის მორბენალი" shows a broken avatar because:

1. **Database contains an invalid URL**: The `tv_players` table has an entry with `avatar_url: /assets/bot-avatar-4-uiIFWm1y.png` - this is a Vite build-time asset hash that only works locally and breaks when accessed elsewhere.

2. **No error handling in avatar rendering**: The `MyRoomsSection.tsx` component uses raw `<img>` tags without any `onError` handling, so when the URL fails to load, it shows the browser's broken image icon.

| Player | Avatar URL | Status |
|--------|-----------|--------|
| TriviaMaste | Valid Supabase URL | Works |
| Test | `/assets/bot-avatar-4-uiIFWm1y.png` | **Broken** (Vite hash path) |

---

## Solution

### 1. Fix Avatar Rendering in MyRoomsSection.tsx (Primary Fix)

Replace raw `<img>` tags with proper error handling that falls back to initials when images fail to load.

**Locations to fix:**
- Lines 366-382 (horizontal card avatars)
- Lines 708-731 (grid card avatars)

**Before:**
```tsx
{p.avatar_url ? (
  <img 
    src={p.avatar_url} 
    alt={p.nickname}
    className="w-full h-full object-cover"
  />
) : (
  <div>...</div>
)}
```

**After - add error state and fallback:**
```tsx
// Use SafeAvatarImage component or add onError handler
<SafeAvatarImage
  avatarUrl={p.avatar_url}
  fallback={p.nickname}
  className="w-full h-full object-cover"
  containerClassName="w-full h-full"
/>
```

Or inline with `onError`:
```tsx
<img 
  src={resolveAvatarUrl(p.avatar_url) || undefined}
  alt={p.nickname}
  className="w-full h-full object-cover"
  onError={(e) => {
    e.currentTarget.style.display = 'none';
    e.currentTarget.nextElementSibling?.classList.remove('hidden');
  }}
/>
<div className="hidden w-full h-full bg-gradient-to-br from-white/40 to-white/20 flex items-center justify-center text-white text-xs font-bold">
  {p.nickname?.charAt(0).toUpperCase() || "?"}
</div>
```

### 2. Enhance resolveAvatarUrl to Handle Vite Hashed Paths (Secondary Fix)

Update `src/utils/avatarUtils.ts` to detect and reject Vite-hashed asset paths like `/assets/xxx-hash.png` that can't be resolved.

**Add detection for invalid paths:**
```tsx
// Detect Vite build-time hashed asset paths (e.g., /assets/bot-avatar-4-uiIFWm1y.png)
// These paths are only valid during the build that created them
const VITE_HASHED_ASSET_PATTERN = /^\/assets\/.*-[a-zA-Z0-9]{8}\.(png|jpg|jpeg|webp|gif|svg)$/;

export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | undefined {
  if (!avatarUrl) return undefined;
  
  // Reject Vite-hashed asset paths - they won't work
  if (VITE_HASHED_ASSET_PATTERN.test(avatarUrl)) {
    console.warn('Invalid Vite-hashed avatar path:', avatarUrl);
    return undefined;
  }
  
  // ... rest of existing logic
}
```

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/team/MyRoomsSection.tsx` | Replace raw `<img>` tags with `SafeAvatarImage` or add `onError` fallback (2 locations) |
| `src/utils/avatarUtils.ts` | Add detection for Vite-hashed asset paths to return undefined |

---

## Outcome

After these changes:
- Broken avatar images will display the user's initial instead of the broken image icon
- Invalid Vite-hashed paths will be detected and fallback to initials immediately
- Both horizontal and grid card layouts will have consistent error handling

