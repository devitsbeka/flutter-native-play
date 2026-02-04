
# Plan: Guest Gating System - Auth Required for Most Features

## Overview

This plan implements a comprehensive guest restriction system where unauthenticated users:
1. **See the main page** with auth form (login/signup) matching the reference design
2. **Can play 5 VS games daily** for free as guest
3. **Cannot access** Rating page, Online Game page, Categories play, or Shop purchases

## Current State Analysis

The codebase already has partial guest gating:
- `UniversalBottomNav.tsx` already has `isLocked` prop and `handleLockedNavClick()` that shows a toast
- `GuestWelcomePanel.tsx` and `DesktopGuestSplitLayout.tsx` exist for guest auth forms
- `useGuestPlays.ts` tracks 5 daily guest plays
- `Index.tsx` shows different UI for guests vs logged-in users

**What's missing:**
- Rating page (`/leaderboards`) not gated
- Online game page (`/team`) not gated
- Category play buttons not gated
- Shop purchases not gated (should show auth modal)
- Desktop navigation not showing locks for guests

---

## Implementation Strategy

### 1. Create Reusable Auth Required Modal Component

Create a modal that prompts users to sign in/register when they try to access locked features.

**New File: `src/components/shared/AuthRequiredModal.tsx`**

```text
┌─────────────────────────────────────┐
│           🔒 გამარჯობა!              │
│                                     │
│   შექმენი ანგარიში და ჩაერთე        │
│   თამაშში უფასოდ                    │
│                                     │
│        [Mascot Avatar]              │
│                                     │
│   [email/username input]            │
│   [password input]                  │
│                                     │
│   [  🔒 შესვლა  ]                   │
│                                     │
│   არ გაქვს ანგარიში? "შექმენი"      │
│                                     │
│           ── ან ──                  │
│                                     │
│     [Google]    [Apple]             │
└─────────────────────────────────────┘
```

### 2. Update Desktop Navigation for Guests

**File: `src/components/layout/UnifiedDesktopNav.tsx`**

- Add lock icons to nav items for guests (similar to mobile bottom nav)
- Show toast or modal when clicking locked items
- Keep Profile button clickable (navigates to auth)

### 3. Gate Page Routes

**File: `src/pages/Leaderboards.tsx`**
- Check if user is not authenticated
- If guest, show auth modal or redirect instead of leaderboard content
- Show lock icon visual indicator

**File: `src/pages/TeamV2.tsx`**
- Check if user is not authenticated
- If guest, show auth modal instead of team/online game content

### 4. Gate Category Play Buttons

**File: `src/pages/CategoryPage.tsx`**
- When guest clicks play button, show auth modal instead of navigating to play
- Update `handleLevelClick()` to require auth
- Update `handlePlayFromLeaderboard()` to require auth

### 5. Gate Shop Purchases

**File: `src/pages/PowerUps.tsx`** (Shop page)
- When guest clicks any purchase button, show auth modal
- Allow browsing but not purchasing

### 6. Update Index Page for Guests

The current `Index.tsx` already shows `GuestWelcomePanel` for guests. The design matches the reference screenshots. We need to ensure the play button shows `5/5` badge.

---

## Technical Details

### AuthRequiredModal Component

```tsx
interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnToPath?: string;
  message?: string;
}
```

Features:
- Reuses auth logic from `GuestWelcomePanel.tsx`
- Shows mascot avatar
- Email/username + password inputs
- Sign in / Create account toggle
- Google + Apple OAuth buttons
- "ან" (or) dividers as shown in reference

### Route Protection Pattern

```tsx
// In protected pages
const { user } = useAuth();
const [showAuthModal, setShowAuthModal] = useState(false);

// Check on mount or action
if (!user) {
  setShowAuthModal(true);
  return;
}

// Render auth modal
<AuthRequiredModal 
  isOpen={showAuthModal} 
  onClose={() => setShowAuthModal(false)}
  returnToPath={location.pathname}
/>
```

### Desktop Nav Lock Icons

```tsx
// In UnifiedDesktopNav.tsx
const isGuest = !profile && !user;

// For each nav item (except home)
<NavButton
  icon={item.icon}
  label={item.label}
  onClick={() => {
    if (isGuest && item.id !== 'home') {
      setShowAuthModal(true);
    } else {
      navigate(item.path);
    }
  }}
  isLocked={isGuest && item.id !== 'home'}
/>
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/shared/AuthRequiredModal.tsx` | Reusable auth prompt modal |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/UnifiedDesktopNav.tsx` | Add guest detection, lock icons, auth modal trigger |
| `src/pages/Leaderboards.tsx` | Add auth gate - show modal when guest tries to view |
| `src/pages/TeamV2.tsx` | Add auth gate - show modal when guest tries to view |
| `src/pages/CategoryPage.tsx` | Gate play buttons - require auth before playing |
| `src/pages/PowerUps.tsx` | Gate purchase buttons - require auth before buying |
| `src/components/home/DesktopPlayButtonLarge.tsx` | Already shows 5/5 badge for guests (verified working) |

---

## User Flow Summary

```text
Guest User Journey:
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  1. Lands on Index page                                      │
│     → Sees auth form (login/signup) with mascot             │
│     → Can click "ითამაშე" button (5/5 plays)                │
│                                                              │
│  2. Clicks nav items (Rating, Team, Shop, Categories)       │
│     → Sees 🔒 lock icons on nav                             │
│     → Modal appears: "გამარჯობა! შექმენი ანგარიში..."       │
│                                                              │
│  3. Clicks Play button in Category                          │
│     → Same auth modal appears                                │
│                                                              │
│  4. Clicks any Shop purchase                                 │
│     → Same auth modal appears                                │
│                                                              │
│  5. Plays as Guest (uses 1 of 5 daily plays)               │
│     → VS game works normally                                 │
│     → After game, prompted to register to save progress     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Localization

The modal and messages will use Georgian text matching the reference:
- `გამარჯობა!` - Hello!
- `შექმენი ანგარიში და ჩაერთე თამაშში უფასოდ` - Create account and join the game for free
- `ელფოსტა ან სახელი` - Email or username
- `პაროლი` - Password
- `შესვლა` - Sign in
- `არ გაქვს ანგარიში? შექმენი` - Don't have an account? Create one
- `ან` - or

---

## Edge Cases Handled

1. **Guest plays VS game** → Works, uses guest play quota
2. **Guest exhausts 5 plays** → Existing `GuestMaxPlaysModal` prompts registration
3. **Guest tries to navigate via URL** → Auth check runs on page mount
4. **Guest clicks shop item** → Auth modal before any purchase logic
5. **OAuth redirect** → Uses existing `returnTo` pattern to redirect after auth
