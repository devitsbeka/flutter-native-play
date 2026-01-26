
# Require Authentication Before Joining TV Games

## Overview

Replace the guest join flow with mandatory authentication. When users scan a QR code to join a TV game, they must log in or sign up first, then automatically join the game as authenticated users.

## Current Problem

1. Guests (unauthenticated users) have `user_id = NULL` in `tv_players`
2. RLS policies fail because `auth.uid()` returns NULL for guests
3. Guest players experience white screens, can't vote in polls, or submit answers
4. Complex workarounds in the code to handle guest edge cases

## New Flow

```
User scans QR code
      ↓
/join/session/[UUID] route
      ↓
Check: Is user authenticated?
      ↓
┌─────────────────────────────────────────┐
│ NO - Show Auth Screen                   │
│ - Login/Signup options                  │
│ - Google OAuth                          │
│ - Store sessionId for after auth        │
│ - After auth → auto-join game           │
└─────────────────────────────────────────┘
      ↓ YES
Auto-join with profile data
      ↓
Show game lobby/controller
```

---

## Implementation Details

### 1. Create New Component: `TVAuthGate.tsx`

A new component that gates TV game access behind authentication:

**Location:** `src/components/controller/TVAuthGate.tsx`

**Purpose:** 
- Display when unauthenticated user tries to join TV game
- Show login/signup options with session code preserved
- Auto-join after successful authentication

**UI Elements:**
- Header: "შემოგვიერთდი!" (Join us!)
- Google Sign In button (primary)
- Email login/signup form
- Game code display for reference
- Benefits of having an account

### 2. Modify `ControllerCodeEntry.tsx`

**Current behavior (lines 32-36):**
```typescript
if (isUuid(trimmed) && !user) {
  setShowGuestModal(true);  // Shows guest name entry
  return;
}
```

**New behavior:**
```typescript
if (!user) {
  // Redirect to auth with return URL
  navigate(`/auth?returnTo=${encodeURIComponent(`/join/session/${trimmed}`)}`);
  return;
}
```

### 3. Modify `Auth.tsx` to Handle `returnTo`

**Add returnTo parameter extraction:**
```typescript
const returnTo = searchParams.get('returnTo');
```

**Replace hardcoded `navigate("/")` with:**
```typescript
navigate(returnTo || "/");
```

**Update in 3 places:**
- After successful email signup (line 115)
- After successful email login (line 136)
- After successful Apple login (line 156)

**Note:** Google OAuth uses external redirect, so we need to handle this differently using localStorage.

### 4. Handle Google OAuth Return

Since Google OAuth redirects to the production site, we need to store the intended destination:

**Before Google OAuth:**
```typescript
// Store returnTo in localStorage before OAuth redirect
if (returnTo) {
  localStorage.setItem('authReturnTo', returnTo);
}
```

**After OAuth return (in Auth.tsx useEffect or AuthContext):**
```typescript
useEffect(() => {
  if (user) {
    const savedReturnTo = localStorage.getItem('authReturnTo');
    if (savedReturnTo) {
      localStorage.removeItem('authReturnTo');
      navigate(savedReturnTo);
    } else {
      navigate("/");
    }
  }
}, [user, navigate]);
```

### 5. Remove Guest Join Functionality

**Files to modify:**
- `ControllerCodeEntry.tsx` - Remove `GuestJoinModal` import and usage
- Keep `GuestJoinModal.tsx` for now (used in admin showcase)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/controller/ControllerCodeEntry.tsx` | Replace guest modal with auth redirect |
| `src/pages/Auth.tsx` | Add `returnTo` parameter handling, store for OAuth |
| `src/pages/TVJoin.tsx` | No changes needed (already checks auth state) |

---

## Detailed Code Changes

### `src/components/controller/ControllerCodeEntry.tsx`

**Remove:**
- Line 8: `import { GuestJoinModal } from './GuestJoinModal';`
- Line 19: `const [showGuestModal, setShowGuestModal] = useState(false);`
- Lines 87-92: `handleGuestJoin` function
- Lines 102-104: `setShowGuestModal(true)` logic
- Lines 178-184: `GuestJoinModal` component

**Add:**
- `import { useNavigate } from 'react-router-dom';`
- `const navigate = useNavigate();`

**Change line 32-36:**
```typescript
// OLD: if (isUuid(trimmed) && !user) { setShowGuestModal(true); }
// NEW:
if (!user) {
  const returnUrl = isUuid(trimmed) 
    ? `/join/session/${trimmed}` 
    : `/join?code=${trimmed}`;
  navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
  return;
}
```

**Change lines 100-104:**
```typescript
// OLD: else { setShowGuestModal(true); }
// NEW:
} else {
  const returnUrl = isUuid(code) 
    ? `/join/session/${code}` 
    : `/join?code=${code}`;
  navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
}
```

### `src/pages/Auth.tsx`

**Add to line 17:**
```typescript
const returnTo = searchParams.get('returnTo');
```

**Modify useEffect (lines 42-46):**
```typescript
useEffect(() => {
  if (user) {
    const savedReturnTo = localStorage.getItem('authReturnTo');
    if (savedReturnTo) {
      localStorage.removeItem('authReturnTo');
      navigate(savedReturnTo);
    } else if (returnTo) {
      navigate(decodeURIComponent(returnTo));
    } else {
      navigate("/");
    }
  }
}, [user, navigate, returnTo]);
```

**Add before Google OAuth call (around line 167):**
```typescript
// Store returnTo for OAuth redirect
if (returnTo) {
  localStorage.setItem('authReturnTo', returnTo);
}
```

**Modify Apple sign-in success (line 156):**
```typescript
navigate(returnTo ? decodeURIComponent(returnTo) : "/");
```

**Modify email signup success (line 115):**
```typescript
navigate(returnTo ? decodeURIComponent(returnTo) : "/");
```

**Modify email signin success (line 136):**
```typescript
navigate(returnTo ? decodeURIComponent(returnTo) : "/");
```

---

## Benefits

1. **Reliable RLS** - All players have valid `auth.uid()`, RLS policies work correctly
2. **Simplified Code** - Remove guest-handling edge cases
3. **Better UX** - Users get persistent profiles, progress tracking, avatars
4. **Poll Voting** - Authenticated users can vote without RLS errors
5. **Multi-Round Play** - Seamless experience across rounds and sessions

---

## Technical Notes

### Route Specificity (Already Fixed)
The route order fix from previous implementation ensures `/join/session/:sessionId` is matched correctly.

### OAuth Redirect Handling
Google OAuth redirects to `https://mytrivia.io/`, so we use localStorage to persist the intended return destination across the OAuth flow.

### Auto-Join After Auth
When users return from auth with `/join/session/[UUID]`:
1. `TVJoin` renders `ControllerCodeEntry` with `initialCode = UUID`
2. `useEffect` in `ControllerCodeEntry` detects `user && profile` are now set
3. Auto-joins with `joinSession(UUID, profile.nickname, profile.avatar_url)`
4. Calls `onJoined()` → shows game screen

---

## Expected Outcome

1. User scans QR code → sees login/signup screen
2. User logs in or signs up (Google, Apple, or email)
3. User is automatically redirected back to `/join/session/[UUID]`
4. User auto-joins game with their profile data
5. User can vote in polls, answer questions, play multiple rounds without issues
