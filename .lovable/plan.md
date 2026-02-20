

## Make Referral Links Reusable (Multi-Use)

### Problem
Currently, each referral link creates one `friend_invites` row. When the first friend uses it, `process_referral_reward` sets `status = 'accepted'`, so the next person who clicks the link finds no pending invite and gets nothing.

### Solution
Instead of tying the link to a single `friend_invites` row, treat the referral code as a **permanent invite code** for the inviter. Each new signup via that code creates a **new** `friend_invites` row on the fly.

---

### 1. Add a permanent `referral_code` column to `profiles`

**Migration:**
- Add `referral_code TEXT UNIQUE` to `profiles`
- This stores a permanent, reusable code per user

### 2. Change `createLinkInvite` to use the profile code

**File: `src/hooks/useFriendInvites.ts`**

Instead of inserting a `friend_invites` row when generating a link:
- Check if the user already has a `referral_code` in `profiles`
- If not, generate one and save it to `profiles.referral_code`
- Return that code (no `friend_invites` row created yet)

### 3. Update Auth.tsx signup flow

**File: `src/pages/Auth.tsx`** (lines 117-157)

When a new user signs up with `?ref=CODE`:
- Look up `profiles` where `referral_code = CODE` to find the **inviter** (instead of querying `friend_invites`)
- Create a **new** `friend_invites` row with `status = 'accepted'` for record-keeping
- Call `process_referral_reward` with the new invite row ID
- This way each signup creates its own invite record, and the code stays valid forever

### 4. Update `process_referral_reward` (minor)

**No change needed** -- the RPC already handles granting PRO to both users. It will work with each new invite row.

### 5. Update `InviteFriendsModal` and `ProInviteFriendsModal`

**Files: `src/components/home/InviteFriendsModal.tsx`, `src/components/profile/ProInviteFriendsModal.tsx`**

Update `generateLink` to use the new profile-based code instead of calling `createLinkInvite`.

---

### Technical Details

**Migration SQL:**
```text
ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;
```

**Auth.tsx signup referral flow (pseudocode):**
```text
1. Look up inviter: SELECT user_id, nickname FROM profiles WHERE referral_code = CODE
2. If found:
   a. Insert new friend_invites row (inviter_id, invited_user_id, status='pending')
   b. Call process_referral_reward(invite_id, new_user_id)
   c. Store inviter nickname in sessionStorage for the welcome modal
```

**useFriendInvites.ts createLinkInvite change:**
```text
1. Check profiles.referral_code for current user
2. If null, generate code, UPDATE profiles SET referral_code = code
3. Return the code (no friend_invites row)
```

This makes the referral link permanent and reusable -- every person who clicks it gets processed independently.

