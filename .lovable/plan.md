
# Plan: Fix Inconsistent Avatar Display Across App

## Problem Identified

The same user's avatar shows correctly on some pages (MyTrivia, rooms) but broken (question mark fallback) on others (game results, leaderboard).

**Root Cause:** Multiple components use the raw `AvatarImage` component directly with `src={p.avatar_url || undefined}` **without** using the `resolveAvatarUrl()` utility function that:
- Handles expired/broken Supabase URLs
- Resolves local asset paths (`/src/assets/...`)
- Recovers broken Vite-hashed paths from old builds

The `SafeAvatar` and `SafeAvatarImage` components were created to solve this problem, but many older/other components still use the raw `Avatar/AvatarImage` pattern.

---

## Technical Solution

### Affected Files to Fix

Based on my analysis, these components use raw `AvatarImage` and need to switch to `SafeAvatar`:

| File | Current Pattern | Fix |
|------|----------------|-----|
| `GameResultsScreenV2.tsx` | `<AvatarImage src={p.avatar_url}/>` | Use `SafeAvatar` |
| `LeaguePlayerRow.tsx` | `<AvatarImage src={entry.avatar_url}/>` | Use `SafeAvatar` |
| `MultiplayerGameScreen.tsx` | Multiple `<AvatarImage>` usages | Use `SafeAvatar` |
| `MultiplayerGameScreenV2.tsx` | `<AvatarImage>` in player row | Use `SafeAvatar` |
| `MultiplayerObserverScreen.tsx` | `<AvatarImage>` in player list | Use `SafeAvatar` |
| `AsyncResultScreen.tsx` | `<AvatarImage>` in results | Use `SafeAvatar` |
| `AllRecentPlayersModal.tsx` | `<AvatarImage>` in player list | Use `SafeAvatar` |
| `AllRecentRoomsModal.tsx` | `<AvatarImage>` in room cards | Use `SafeAvatar` |
| `AddFriendModal.tsx` | `<AvatarImage>` in search results | Use `SafeAvatar` |
| `GameInvitationsSection.tsx` | `<AvatarImage>` in invitation cards | Use `SafeAvatar` |
| `PendingChallengesSection.tsx` | `<AvatarImage>` in challenge cards | Use `SafeAvatar` |
| `QuickProfileModal.tsx` | `<AvatarImage>` in profile | Use `SafeAvatar` |
| `CollectionLobby.tsx` | `<AvatarImage>` in creator avatar | Use `SafeAvatar` |
| `SpotlightSearch.tsx` | `<AvatarImage>` in search results | Use `SafeAvatar` |
| `RoomChatsPanel.tsx` | `<AvatarImage>` in chat list | Use `SafeAvatar` |

### Implementation Pattern

**Before (broken):**
```typescript
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

<Avatar className="w-12 h-12">
  <AvatarImage src={p.avatar_url || undefined} />
  <AvatarFallback>
    {p.nickname?.charAt(0)?.toUpperCase() || "?"}
  </AvatarFallback>
</Avatar>
```

**After (fixed):**
```typescript
import { SafeAvatar } from "@/components/shared/SafeAvatar";

<SafeAvatar 
  avatarUrl={p.avatar_url}
  fallback={p.nickname || "?"}
  className="w-12 h-12"
/>
```

### Key Fix: GameResultsScreenV2.tsx (Lines 346-352)

This is the component shown in your screenshot with the broken avatar:

```typescript
// Remove: import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Add: import { SafeAvatar } from "@/components/shared/SafeAvatar";

// In the render (line 346-352):
<div className="relative">
  <SafeAvatar 
    avatarUrl={p.avatar_url}
    fallback={p.nickname || "?"}
    className="w-12 h-12 border-2 border-white/30"
  />
  {idx === 0 && (
    <Crown className="absolute -top-3 -right-1 w-5 h-5 text-amber-400 fill-amber-400" />
  )}
</div>
```

---

## Summary

| Task | Files Changed |
|------|---------------|
| Replace raw `Avatar/AvatarImage` with `SafeAvatar` | ~15 files |
| Remove unused Avatar imports | Same files |
| Ensure consistent fallback styling | Applied via SafeAvatar props |

This will ensure all avatars across the app:
1. Use `resolveAvatarUrl()` for URL resolution
2. Handle broken/expired URLs gracefully  
3. Show proper fallback (gradient + initial) when images fail
4. Work consistently regardless of URL format (http, data:, local path, etc.)
