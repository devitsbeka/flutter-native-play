

## Invite Friends for PRO Gift System

### Overview
When a logged-in user enters the app, show a modal asking them to invite friends via a shareable link. When at least one friend registers through that link, both the inviter and the invited friend automatically receive 10 days of PRO.

### How It Works

```text
+------------------+       shares link        +------------------+
|   Inviter        | -----------------------> |   Friend         |
|   (logged in)    |  flutter-native-play     |   (new user)     |
|                  |  .lovable.app/auth       |                  |
|                  |  ?ref=XXXX&mode=signup   |                  |
+------------------+                          +------------------+
        |                                             |
        |  When friend registers:                     |
        |  1. friend_invites.status = 'accepted'      |
        |  2. Friend gets 10-day PRO (auto)           |
        |  3. Inviter gets 10-day PRO (auto)          |
        |  4. Inviter sees "friend joined" modal      |
        +---------------------------------------------+
```

### Changes

**1. New Component: `src/components/home/InviteFriendsModal.tsx`**
- Shows on app entry for logged-in users who haven't dismissed it this session
- Text: "მოიწვიე მეგობრები ამ ლინკით და მიიღეთ 10 დღიანი PRO, სასიამოვნო გართობას გისურვებთ!"
- Generates a referral link using the existing `useFriendInvites.createLinkInvite()` hook
- Displays the link with copy and native share buttons
- Uses the same chunky card style as BetaGiftModal (warm gradient, spring animations)
- Dismissible with "მოგვიანებით" -- stores dismissal per session in sessionStorage
- Only shown to non-VIP users (no need to invite if already PRO)

**2. New Component: `src/components/home/FriendJoinedModal.tsx`**
- Congratulations info modal shown when the inviter's referral is accepted
- Text: "თქვენი მეგობარი შემოუერთდა MyTrivia LIVE-ს თქვენი ლინკით! თქვენ და თქვენმა მეგობარმა მიიღეთ 10 დღიანი PRO. გილოცავთ!"
- Confetti animation on open
- Crown icon + PRO badge visual
- Single "გასაგებია" close button

**3. Modify `src/pages/Auth.tsx` (referral acceptance)**
- After updating `friend_invites.status` to 'accepted', add VIP activation for the **new user** (the friend): call `activateVip("10days")` equivalent by inserting/updating `vip_subscriptions`
- Also activate VIP for the **inviter**: update/insert into `vip_subscriptions` for the inviter's user ID
- The INSERT policy on `friend_invites` currently requires PRO (`PRO users can create invites`). This needs to be changed so **any logged-in user** can create invites -- the whole point is non-PRO users invite friends to earn PRO.

**4. Database Migration**
- Update the RLS INSERT policy on `friend_invites` from PRO-only to any authenticated user: `auth.uid() = inviter_id` (remove PRO check)
- Add an RLS SELECT policy allowing anyone to read an invite by `referral_code` (needed during signup to look up the invite): `SELECT WHERE referral_code IS NOT NULL` for anon users, or handle via service role

**5. Modify `src/pages/Index.tsx`**
- Import and render `InviteFriendsModal`
- Add logic to check for newly accepted invites (poll `friend_invites` where `inviter_id = user.id AND status = 'accepted' AND accepted_at > last_check`) and show `FriendJoinedModal`

**6. VIP Activation for Inviter (in Auth.tsx)**
- After the new user registers via referral, directly insert/update `vip_subscriptions` for the inviter using the existing Supabase client
- This requires an RLS policy allowing the new user to update the inviter's VIP subscription -- alternatively, use a database function (RPC) that runs as SECURITY DEFINER to grant VIP to both parties safely

### Technical Details

**New DB function (migration):**
```sql
CREATE OR REPLACE FUNCTION public.process_referral_reward(
  p_invite_id UUID,
  p_new_user_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_inviter_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get inviter
  SELECT inviter_id INTO v_inviter_id
  FROM friend_invites WHERE id = p_invite_id;
  
  IF v_inviter_id IS NULL THEN RETURN; END IF;
  
  v_expires_at := now() + interval '10 days';
  
  -- Grant PRO to new user
  INSERT INTO vip_subscriptions (user_id, vip_tier, expires_at)
  VALUES (p_new_user_id, 'standard', v_expires_at)
  ON CONFLICT (user_id) DO UPDATE
  SET expires_at = GREATEST(vip_subscriptions.expires_at, v_expires_at);
  
  -- Grant PRO to inviter
  INSERT INTO vip_subscriptions (user_id, vip_tier, expires_at)
  VALUES (v_inviter_id, 'standard', v_expires_at)
  ON CONFLICT (user_id) DO UPDATE
  SET expires_at = GREATEST(vip_subscriptions.expires_at, v_expires_at);
END;
$$;
```

This function handles granting VIP to both parties atomically and securely (SECURITY DEFINER), avoiding RLS complications.

**RLS policy update:**
- Drop the existing INSERT policy "PRO users can create invites" 
- Create new INSERT policy: any authenticated user can insert where `auth.uid() = inviter_id`

**Invite link format:**
`https://flutter-native-play.lovable.app/auth?ref=XXXXXXXX&mode=signup`

**Session-based dismissal:**
- `sessionStorage.setItem('invite_modal_dismissed', 'true')` -- resets each app visit so users see it once per session
