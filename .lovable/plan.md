
# Plan: Fix Broken Avatar Images Across the App

## Root Cause Analysis

The broken avatar images are caused by **inconsistent avatar URL handling** across the codebase. There are three main patterns being used:

### Pattern 1: Canonical Path Storage (Working in AvatarModal)
When users select a preset avatar, the system stores a canonical path like `/src/assets/avatars/bot-avatar-3.png` in the database. The `resolveAvatarUrl()` utility correctly maps these paths to bundled assets.

**From database query:**
```
/src/assets/avatars/bot-avatar-3.png
/src/assets/avatars/bot-avatar-1.png
/src/assets/avatars/bot-avatar-9.png
... etc
```

### Pattern 2: Components Using `ResolvedAvatarImage` (Working)
Some components correctly use `ResolvedAvatarImage` which wraps `AvatarImage` and calls `resolveAvatarUrl()`:
- `RecentRoomsSection.tsx`
- `RoomChatsPanel.tsx`
- `MultiplayerGameScreenV2.tsx`
- `FriendsList.tsx` (partially)
- `AddFriendModal.tsx`

### Pattern 3: Components Using Raw `AvatarImage` or `<img>` (BROKEN)
These components receive canonical paths from the database but don't resolve them:

| File | Line | Issue |
|------|------|-------|
| `SpotlightSearch.tsx` | 493 | `<AvatarImage src={friend.avatarUrl}>` - no resolution |
| `SearchMiniCards.tsx` | 23 | `<AvatarImage src={friend.avatarUrl}>` - no resolution |
| `CompactNotificationCard.tsx` | 302 | `<AvatarImage src={avatarUrl}>` - no resolution |
| `AsyncResultScreen.tsx` | 261 | `<AvatarImage src={challengerInfo?.avatar}>` - no resolution |
| `RevenueAnalyticsTab.tsx` | 268 | `<AvatarImage src={tx.profile?.avatar_url}>` - no resolution |
| `ControllerCodeEntry.tsx` | 148 | `<img src={profile.avatar_url}>` - no resolution |
| `QuestionScreen.tsx` | 404 | `<img src={opponent.avatarUrl}>` - no resolution |
| `MatchResultScreen.tsx` | 145 | `<img src={avatarUrl}>` - no resolution |

### Why It's Intermittent
- Works when: Avatar is a full URL (Supabase storage, Google profile)
- Breaks when: Avatar is a canonical path (`/src/assets/avatars/...`)
- The canonical paths look like valid URLs but they point to source files that don't exist after Vite builds

---

## Solution: Consistent Avatar Resolution

### Strategy 1: Replace All `<AvatarImage>` with `<ResolvedAvatarImage>`
Update all imports and usages to use the resolved variant.

### Strategy 2: Replace All Raw `<img>` with Proper Resolution
Wrap all `src` attributes with `resolveAvatarUrl()`.

---

## Technical Changes

### Files to Update

| File | Change Type | Description |
|------|-------------|-------------|
| `SpotlightSearch.tsx` | Import swap | Use `ResolvedAvatarImage` instead of `AvatarImage` |
| `SearchMiniCards.tsx` | Import swap | Use `ResolvedAvatarImage` instead of `AvatarImage` |
| `CompactNotificationCard.tsx` | Import swap | Use `ResolvedAvatarImage` instead of `AvatarImage` |
| `AsyncResultScreen.tsx` | Import swap | Use `ResolvedAvatarImage` instead of `AvatarImage` |
| `RevenueAnalyticsTab.tsx` | Import swap | Use `ResolvedAvatarImage` instead of `AvatarImage` |
| `ControllerCodeEntry.tsx` | Add resolution | Wrap `src` with `resolveAvatarUrl()` |
| `QuestionScreen.tsx` | Add resolution | Wrap `src` with `resolveAvatarUrl()` |
| `MatchResultScreen.tsx` | Add resolution | Wrap `src` with `resolveAvatarUrl()` |

### Example Changes

**SpotlightSearch.tsx (before):**
```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
...
<AvatarImage src={friend.avatarUrl || undefined} />
```

**SpotlightSearch.tsx (after):**
```tsx
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
...
<ResolvedAvatarImage src={friend.avatarUrl || undefined} />
```

**QuestionScreen.tsx (before):**
```tsx
<img src={opponent.avatarUrl} alt="" className="w-full h-full object-cover" />
```

**QuestionScreen.tsx (after):**
```tsx
import { resolveAvatarUrl } from "@/utils/avatarUtils";
...
<img src={resolveAvatarUrl(opponent.avatarUrl) || opponent.avatarUrl} alt="" className="w-full h-full object-cover" />
```

---

## Files Modified Summary

1. **src/components/search/SpotlightSearch.tsx** - Use ResolvedAvatarImage
2. **src/components/search/SearchMiniCards.tsx** - Use ResolvedAvatarImage
3. **src/components/notifications/CompactNotificationCard.tsx** - Use ResolvedAvatarImage
4. **src/components/team/AsyncResultScreen.tsx** - Use ResolvedAvatarImage
5. **src/components/admin/economy/RevenueAnalyticsTab.tsx** - Use ResolvedAvatarImage
6. **src/components/controller/ControllerCodeEntry.tsx** - Add resolveAvatarUrl()
7. **src/components/game/QuestionScreen.tsx** - Add resolveAvatarUrl()
8. **src/components/game/MatchResultScreen.tsx** - Add resolveAvatarUrl()

---

## Result

After these changes:
- All avatars will properly resolve canonical paths (`/src/assets/avatars/...`) to bundled assets
- External URLs (Supabase storage, Google profiles) continue to work as-is
- Broken image icons will be replaced with working avatars or proper fallbacks
- Consistent behavior across preview, published URL, and all devices
