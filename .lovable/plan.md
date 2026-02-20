

## Show Congratulations Modal for Both Inviter and Invited User

### Overview
Both the **inviter** and the **invited friend** should see a celebratory modal confirming they received 10 days of PRO. Each side gets a tailored message.

---

### 1. Update `FriendJoinedModal` to support two variants

**File: `src/components/home/FriendJoinedModal.tsx`**

Add a `variant` prop: `"inviter"` or `"invited"`, plus an optional `inviterName` prop.

- **Inviter variant** (existing behavior, refined text):
  - Title: "გილოცავთ!"
  - Body: "შენი მეგობარი შემოუერთდა MyTrivia LIVE-ს შენი ლინკით! მიიღე **10 დღიანი PRO**."

- **Invited variant** (new):
  - Title: "გილოცავთ!"
  - Body: "მოგიწვია **[inviterName]**-მ და მიიღე **10 დღიანი PRO** საჩუქრად!"
  - Falls back to generic text if inviter name is unknown.

Both variants keep confetti, crown icon, and PRO badge.

---

### 2. Show modal to the invited user after signup

**File: `src/pages/Auth.tsx`**

After `process_referral_reward` succeeds (line 129-132), store a flag in `sessionStorage`:
```
sessionStorage.setItem("referral_welcome", inviterNickname || "true")
```

We'll fetch the inviter's nickname from the invite row's `inviter_id` -> `profiles.nickname` before storing.

---

### 3. Detect the flag on home page and show the invited variant

**File: `src/pages/Index.tsx`**

On mount, check `sessionStorage.getItem("referral_welcome")`. If present:
- Set state to show `FriendJoinedModal` with `variant="invited"` and `inviterName` from the stored value
- Remove the flag so it only shows once

---

### 4. Improve inviter detection with realtime

**File: `src/pages/Index.tsx`**

Replace the 30-second polling interval (lines 215-241) with a Supabase realtime subscription on `friend_invites` filtered by `inviter_id=eq.${user.id}`. When an `UPDATE` event arrives (status changed to "accepted"), immediately show the `FriendJoinedModal` with `variant="inviter"`.

This makes the inviter notification instant instead of delayed up to 30 seconds.

---

### Summary of changes

| File | Change |
|------|--------|
| `FriendJoinedModal.tsx` | Add `variant` and `inviterName` props, render different text per variant |
| `Auth.tsx` | After referral processing, fetch inviter nickname and store in sessionStorage |
| `Index.tsx` | Check sessionStorage for invited user modal; replace polling with realtime for inviter modal |

