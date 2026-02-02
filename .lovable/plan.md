
# Plan: Remove Avatar from Login Page & Add Avatar Reminder on Main Page

## Overview

The user wants to:
1. **Remove** the mascot avatar from the login/sign-in page (GuestWelcomePanel)
2. **Add** an avatar reminder prompt on the main page for logged-in users who haven't set their animated avatar yet

---

## Changes

### File 1: `src/components/home/GuestWelcomePanel.tsx`

**Remove the clickable avatar section** (lines 155-253)

The current login page shows a mascot video with a camera badge for photo upload. This will be completely removed to simplify the login experience.

**Before:**
- Title "გამარჯობა!"
- Mascot video avatar with camera badge
- Login form

**After:**
- Title "გამარჯობა!"
- Login form (immediately below title)

---

### File 2: `src/components/home/AvatarCircle.tsx`

**Add a "Set Avatar" prompt badge** when the user has no custom avatar set.

Add a new prop `showAvatarPrompt` and display a sparkle/camera badge that pulses to remind users they can create their animated avatar.

**Changes:**
- Add new prop: `showAvatarPrompt?: boolean`
- When `showAvatarPrompt` is true and no animated avatar exists, show a pulsing badge with sparkles icon
- The badge will be positioned on the avatar circle (similar to the animated avatar sparkle)

```typescript
// New badge component for avatar prompt
{showAvatarPrompt && !animatedAvatarUrl && (
  <motion.div
    className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-2 shadow-lg z-20"
    animate={{ scale: [1, 1.15, 1] }}
    transition={{ duration: 2, repeat: Infinity }}
  >
    <Sparkles className="w-4 h-4 text-white" />
  </motion.div>
)}
```

---

### File 3: `src/pages/Index.tsx`

**Pass the avatar prompt prop** to AvatarCircle for logged-in users without animated avatars.

```typescript
<AvatarCircle 
  avatarUrl={profile?.avatar_url} 
  animatedAvatarUrl={profile?.animated_avatar_url}
  // ... other props
  showAvatarPrompt={user && !profile?.animated_avatar_url}
/>
```

This applies to all three breakpoint layouts (mobile, tablet/md-xl, xl+).

---

## Visual Result

### Login Page (Before → After)
```
BEFORE:                          AFTER:
┌─────────────────────┐         ┌─────────────────────┐
│    გამარჯობა!       │         │    გამარჯობა!       │
│   [Mascot Avatar]   │         │                     │
│      📷 badge       │         │ [Username field]    │
│ [Username field]    │   →     │ [Password field]    │
│ [Password field]    │         │ [Login Button]      │
│ [Login Button]      │         │ ──── ან ────        │
│ ──── ან ────        │         │ [Google] [Apple]    │
│ [Google] [Apple]    │         └─────────────────────┘
└─────────────────────┘
```

### Main Page - Logged In User Without Animated Avatar
```
┌─────────────────────────┐
│                         │
│   ┌─────────────────┐   │
│   │                 │ ✨│  ← Sparkle badge prompting 
│   │    Avatar       │   │    user to create animated
│   │    Circle       │   │    avatar
│   │                 │   │
│   └─────────────────┘   │
│        დონე 63          │
│     3,313 / 4,920 XP    │
│                         │
└─────────────────────────┘
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/home/GuestWelcomePanel.tsx` | Remove avatar/camera section (lines 155-253) |
| `src/components/home/AvatarCircle.tsx` | Add `showAvatarPrompt` prop with sparkle badge |
| `src/pages/Index.tsx` | Pass `showAvatarPrompt` prop to all AvatarCircle instances |

---

## Technical Details

### GuestWelcomePanel Changes:
- Remove the entire "Clickable Avatar" motion.div block
- Keep all form validation and OAuth logic unchanged
- Adjust spacing: reduce `marginTop` since avatar is removed

### AvatarCircle Changes:
- Import `Sparkles` from lucide-react
- Add optional `showAvatarPrompt` prop
- Render badge conditionally when user needs to set animated avatar

### Index.tsx Changes:
- Calculate condition: `user && !profile?.animated_avatar_url`
- Apply to all 3 AvatarCircle instances (mobile, md-xl, xl+)
