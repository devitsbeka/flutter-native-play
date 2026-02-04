
# Plan: Fix Broken Preset Avatar Display

## Problem Identified
When users select preset avatars from the avatar library (10 cartoon-style avatars), the system stores paths like `/src/assets/avatars/bot-avatar-7.png` in the database. These are "canonical paths" that need to be converted to actual bundled asset URLs at runtime.

**The issue**: Many components throughout the app use `avatar_url` directly as an image source without calling `resolveAvatarUrl()` to convert these canonical paths. This causes the browser to try loading `/src/assets/...` paths directly, which fails, and users see the fallback "?" instead of their chosen avatar.

## Current Architecture
- **`avatarUtils.ts`**: Contains `resolveAvatarUrl()` function that converts canonical paths like `/src/assets/avatars/bot-avatar-X.png` to valid bundled URLs
- **Components that work correctly**: `SmartAvatar`, `SafeAvatar`, `Avatar` (from shared), `AvatarCircle` - all call `resolveAvatarUrl()`
- **Components that are broken**: 13+ files with 100+ instances using `AvatarImage src={avatar_url}` directly

## Solution

### Option A: Fix Each Component (Many Changes)
Update all 13+ files to wrap `avatar_url` with `resolveAvatarUrl()`. This is error-prone and requires changes across many files.

### Option B: Create a Centralized Solution (Recommended)
Create a new `ResolvedAvatarImage` component that automatically resolves avatar URLs, then replace `AvatarImage` usage with it. This provides:
- Single point of fix
- Prevents future bugs
- Cleaner API

### Implementation Plan

#### Step 1: Create `ResolvedAvatarImage` Component
Create a drop-in replacement for `AvatarImage` that automatically calls `resolveAvatarUrl()`:

```tsx
// src/components/ui/resolved-avatar-image.tsx
import { AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { ComponentProps } from "react";

export function ResolvedAvatarImage({ src, ...props }: ComponentProps<typeof AvatarImage>) {
  const resolvedSrc = resolveAvatarUrl(src as string | null | undefined) || src;
  return <AvatarImage src={resolvedSrc} {...props} />;
}
```

#### Step 2: Update Affected Files
Replace `AvatarImage` with `ResolvedAvatarImage` in all affected files:

| File | Instances |
|------|-----------|
| `src/components/team/MultiplayerGameScreenV2.tsx` | 3 |
| `src/components/team/MultiplayerObserverScreen.tsx` | 2 |
| `src/components/team/RoomChatsPanel.tsx` | 2 |
| `src/components/team/AddFriendModal.tsx` | 1 |
| `src/components/team/FriendsList.tsx` | 1 |
| `src/components/team/RecentRoomsSection.tsx` | 1 |
| `src/pages/admin/Reports.tsx` | 3 |
| `src/pages/admin/OnlineUsers.tsx` | 1 |
| `src/components/admin/PalantirAnalyticsWidget.tsx` | 3 |
| `src/components/category/CategoryLeaderboard.tsx` | 1 |
| `src/components/team/RoomLobbyV2.tsx` | 1 |
| `src/components/team/RoomLobby.tsx` | 1 |
| `src/components/team/GameHistoryTable.tsx` | 1 |

#### Step 3: Also Fix Direct `<img>` Usage
Some files use `<img src={avatar_url}>` directly. These need `resolveAvatarUrl()` calls added:
- `src/pages/admin/OnlineUsers.tsx`
- `src/components/category/CategoryLeaderboard.tsx`
- `src/components/team/RoomLobbyV2.tsx`
- `src/components/team/RoomLobby.tsx`
- `src/components/team/GameHistoryTable.tsx`

---

## Summary
1. **Create** new `ResolvedAvatarImage` component that auto-resolves avatar URLs
2. **Update** 13 files to use the new component instead of raw `AvatarImage`
3. **Fix** direct `<img>` usages to call `resolveAvatarUrl()`

This will ensure preset avatars display correctly everywhere in the app.
