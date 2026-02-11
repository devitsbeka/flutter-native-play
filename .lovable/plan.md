

## Admin Controls for Fake Account Management on Player Profile

### Overview
When an admin views a fake/mascot account's profile modal, they will see additional management controls to:
1. **Change the account's avatar** (open AvatarModal targeting that user)
2. **Add a trivia** to that account (open CreateQuizModal with `user_id` override)
3. **Edit nickname, country, stats** (inline edits)

### How It Works

The `PlayerProfileModal` will detect:
- Current user is admin (via `useAdminRole`)
- The viewed profile belongs to a fake account (via `MASCOT_USER_IDS`)

When both conditions are true, an **admin toolbar** appears below the profile header with action buttons.

### Changes

#### 1. `src/components/profile/PlayerProfileModal.tsx`
- Import `useAdminRole` and `MASCOT_USER_IDS`
- Import `CreateQuizModal` (lazy)
- Add state for `showCreateTrivia`, `showEditNickname`, `showAvatarUpload`
- When `isAdmin && MASCOT_USER_IDS.has(userId)`, render an admin toolbar with:
  - **"ავატარის შეცვლა"** (Change Avatar) button -- opens a file picker, uploads to storage, updates `profiles.avatar_url` for that user
  - **"ტრივიის დამატება"** (Add Trivia) button -- opens `CreateQuizModal` but with an `overrideUserId` prop so the trivia is created under the fake account
  - **"რედაქტირება"** (Edit) button -- opens an inline edit dialog for nickname, country code, and stats
- After any change, call `refetch()` to refresh the modal

#### 2. `src/components/social/CreateQuizModal.tsx`
- Add optional `overrideUserId?: string` prop
- Use `overrideUserId ?? user?.id` when inserting the trivia into `user_quiz_posts`
- This allows admins to create trivias attributed to fake accounts

#### 3. New: `src/components/profile/AdminProfileEditor.tsx`
- A small dialog/sheet for editing fake account fields:
  - Nickname (text input)
  - Country code (text input or picker)
  - Avatar upload (file input -> storage upload -> update profile)
  - Animated avatar URL (text input)
- Saves changes directly to `profiles` table via admin RLS policies

### Technical Details

**Admin toolbar UI** (shown only for admins viewing fake accounts):
```text
+------------------------------------------+
|  [Camera icon] ავატარი  |  [+] ტრივია  |  [Pen] რედაქტირება  |
+------------------------------------------+
```

**Avatar change flow**:
- File picker opens
- Image uploaded to Supabase storage bucket (e.g., `avatars/{userId}/avatar.png`)
- `profiles.avatar_url` updated with the public URL
- Modal refreshes

**Trivia creation flow**:
- `CreateQuizModal` opens with `overrideUserId` set to the fake account's `user_id`
- All AI generation and saving works normally, but the `user_id` field points to the fake account
- On completion, the profile modal's trivia list updates

**RLS consideration**:
- The existing admin RLS policies on `profiles` and `user_quiz_posts` already allow admin updates (confirmed from memory about edit-access)
- No new RLS policies needed

### Files Changed
| File | Change |
|------|--------|
| `src/components/profile/PlayerProfileModal.tsx` | Add admin toolbar with avatar, trivia, and edit buttons |
| `src/components/social/CreateQuizModal.tsx` | Add `overrideUserId` prop |
| `src/components/profile/AdminProfileEditor.tsx` | New component for editing fake account fields |

