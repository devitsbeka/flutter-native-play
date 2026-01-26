

# Fix Plan: Broken Avatars & Android Room Creation

## Issue Analysis

### Issue 1: Broken Avatars Throughout the App

**Root Cause:** Many components still use raw `img` tags or the legacy `Avatar` component (`src/components/shared/Avatar.tsx`) which does NOT call `resolveAvatarUrl()`. This causes local bot avatar paths like `/src/assets/avatars/bot-avatar-10.png` to fail in production since Vite transforms these paths during build.

**Affected Components (21 total):**

| Category | Component | Current Issue |
|----------|-----------|---------------|
| **Legacy Avatar.tsx** | `src/components/shared/Avatar.tsx:47-51` | Uses raw `img` tag without resolution |
| **TV Screens** | `TVPairingScreen.tsx:80-84` | Uses legacy Avatar |
| | `TVRevealScreen.tsx:131-135` | Uses legacy Avatar |
| | `TVQuestionScreen.tsx:183-187` | Uses legacy Avatar |
| | `TVScoreboardPanel.tsx:68-72` | Uses legacy Avatar |
| **Game Lobbies** | `TriviaLobby.tsx:167-173` | Raw `AvatarImage` |
| | `TriviaLobby.tsx:276-281` | Raw `AvatarImage` |
| **Admin Panels** | `LastActiveUsersPanel.tsx:170-175` | Raw `img` tag |
| | `PushNotifications.tsx:317-322` | Raw `AvatarImage` |
| **Home/Profile** | `AvatarCircle.tsx:210-223` | Raw `motion.img` |
| | `AvatarModal.tsx:485-489` | Raw `img` tag |

### Issue 2: Android Room Creation Failure

**Likely Causes:**
1. **Camera constraints too restrictive** in `AvatarModal.tsx:93-96`: Using `ideal: 720` for width/height can fail on Android devices that don't support exact specifications
2. **Network latency on mobile**: Sequential Supabase operations in `handleCreate` can timeout on slower mobile networks
3. **Missing error boundaries**: No graceful degradation when operations fail

---

## Implementation Plan

### Phase 1: Fix Legacy Avatar Component (Core Fix)

**File: `src/components/shared/Avatar.tsx`**

Update the legacy Avatar component to use `resolveAvatarUrl` internally. This will automatically fix all TV screens and other components that use it.

```tsx
// Add import at top
import { resolveAvatarUrl } from '@/utils/avatarUtils';

// Update the img tag section (line 46-51)
{imageUrl ? (
  <img
    src={resolveAvatarUrl(imageUrl) || imageUrl}
    alt="Avatar"
    className="w-full h-full object-cover"
    onError={(e) => {
      // Hide broken image, show emoji fallback
      e.currentTarget.style.display = 'none';
    }}
  />
) : (
  <span>{emoji}</span>
)}
```

**Impact:** Fixes TVPairingScreen, TVRevealScreen, TVQuestionScreen, TVScoreboardPanel automatically.

### Phase 2: Fix Trivia Lobby Avatars

**File: `src/pages/TriviaLobby.tsx`**

Replace raw `Avatar`/`AvatarImage` with `SafeAvatar`:

- Line 167-172: Creator avatar in header
- Line 276-281: Leaderboard entry avatars

```tsx
// Import SafeAvatar
import { SafeAvatar } from '@/components/shared/SafeAvatar';

// Replace creator avatar (line 167-172)
<SafeAvatar
  avatarUrl={creator.avatar_url}
  fallback={creator.nickname || 'U'}
  className="w-9 h-9 border-2 border-white/40 shadow-lg"
/>

// Replace leaderboard avatars (line 276-281)
<SafeAvatar
  avatarUrl={entry.avatar_url}
  fallback={entry.nickname || 'U'}
  className="w-9 h-9 border border-border"
/>
```

### Phase 3: Fix Admin Panel Avatars

**File: `src/components/admin/LastActiveUsersPanel.tsx`**

Replace raw `img` tag with `SafeAvatarImage`:

```tsx
import { SafeAvatarImage } from '@/components/shared/SafeAvatar';

// Line 170-175: Replace img with SafeAvatarImage
<SafeAvatarImage
  avatarUrl={user.avatar_url}
  fallback={user.nickname || '?'}
  className="w-10 h-10 rounded-full object-cover"
  containerClassName="w-10 h-10 rounded-full"
/>
```

**File: `src/pages/admin/PushNotifications.tsx`**

Replace raw Avatar with SafeAvatar:

```tsx
import { SafeAvatar } from '@/components/shared/SafeAvatar';

// Line 317-322
<SafeAvatar
  avatarUrl={user.avatar_url}
  fallback={user.nickname}
  className="h-8 w-8"
/>
```

### Phase 4: Fix Home Screen Avatars

**File: `src/components/home/AvatarCircle.tsx`**

Add URL resolution before rendering:

```tsx
import { resolveAvatarUrl } from '@/utils/avatarUtils';

// Inside component, resolve URL
const resolvedAvatarUrl = resolveAvatarUrl(avatarUrl);

// Line 210-223: Use resolved URL
<motion.img 
  src={resolvedAvatarUrl || ''} 
  // ... rest of props
/>
```

**File: `src/components/home/AvatarModal.tsx`**

Fix current avatar preview:

```tsx
import { resolveAvatarUrl } from '@/utils/avatarUtils';

// Line 485-489: Use resolved URL
<img 
  src={resolveAvatarUrl(profile.avatar_url) || profile.avatar_url} 
  alt="Current avatar" 
  className="w-full h-full object-cover"
  onError={(e) => e.currentTarget.style.display = 'none'}
/>
```

### Phase 5: Fix Android Room Creation

**File: `src/components/home/AvatarModal.tsx`**

Relax camera constraints for better Android compatibility:

```tsx
// Line 93-96: Use more flexible constraints
const stream = await navigator.mediaDevices.getUserMedia({
  video: { 
    facingMode: { ideal: "user" }, // Allow fallback to back camera
    width: { min: 320, ideal: 720, max: 1280 },
    height: { min: 320, ideal: 720, max: 1280 }
  },
  audio: false,
});
```

This change:
- Uses `ideal` instead of exact for `facingMode` (allows fallback)
- Adds `min`/`max` bounds for resolution flexibility
- Prevents `OverconstrainedError` on devices that don't support exact 720px

---

## Technical Notes

### Why the Legacy Avatar Fix is Critical

The `src/components/shared/Avatar.tsx` component is used extensively in TV mode screens. Fixing it at the source level means:
- No need to refactor all TV components individually
- Maintains backwards compatibility
- Single point of truth for avatar resolution

### Avatar URL Resolution Flow

```text
User avatar_url from DB
         ↓
  resolveAvatarUrl()
         ↓
  ┌──────────────────────────────────────┐
  │ Check format:                        │
  │ • http/https → return as-is          │
  │ • /src/assets/... → lookup in map    │
  │ • data: → return as-is               │
  │ • unknown → return as-is             │
  └──────────────────────────────────────┘
         ↓
  Resolved URL or undefined
         ↓
  Component renders with fallback if undefined
```

### Files to Modify (Summary)

1. `src/components/shared/Avatar.tsx` - Add resolveAvatarUrl import and usage
2. `src/pages/TriviaLobby.tsx` - Switch to SafeAvatar (2 locations)
3. `src/components/admin/LastActiveUsersPanel.tsx` - Switch to SafeAvatarImage
4. `src/pages/admin/PushNotifications.tsx` - Switch to SafeAvatar
5. `src/components/home/AvatarCircle.tsx` - Add URL resolution
6. `src/components/home/AvatarModal.tsx` - Add URL resolution + fix camera constraints

