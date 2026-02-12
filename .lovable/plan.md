

# Update Share Link Image, Remove Code from Text, and Streamline Guest Join

## Overview
Three changes to make room sharing cleaner and joining frictionless:

## 1. Replace OG Share Image
- Copy the uploaded `fb-ph.png` to `public/og-image.png` (replacing the existing one)
- This updates the preview image shown when room links are shared on Facebook, iMessage, etc.

## 2. Remove Room Code from Share Text
Currently the share text says: "შემომიერთდი ტრივიას თამაშში! კოდი: 8A7TH5"

Change to just: "შემომიერთდი ტრივიას თამაშში!"

Files to update:
- **`src/components/team/RoomLobbyV2.tsx`** (line 229): Remove code from `text` field
- **`src/components/team/RoomLobby.tsx`** (line 118): Remove code from `text` field

## 3. One-Click Join for Guests (No Nickname Modal)
Currently, guests clicking a room invite link see a `GuestJoinModal` asking for a nickname before joining. This adds friction.

**New flow**: When a guest opens a room link, automatically sign them in anonymously with the default nickname ("Trivia King") and join the room immediately -- no modal, no interruption.

### Changes in `src/pages/TeamV2.tsx`:
- In the `useEffect` handling `?join=` (lines 295-314): Instead of showing `GuestJoinModal`, directly perform anonymous sign-in with default nickname and let the existing re-trigger logic join the room
- The `GuestJoinModal` import and rendering can stay for other use cases, but won't be triggered for invite links

This means:
- **Signed-in users**: Click link -> instantly in the room (already works)
- **Guests**: Click link -> auto anonymous sign-in -> instantly in the room (no modal)

## Technical Details

### File: `public/og-image.png`
- Replace with uploaded `fb-ph.png`

### File: `src/components/team/RoomLobbyV2.tsx`
```typescript
// Line 229: change from
text: `შემომიერთდი ტრივიას თამაშში! კოდი: ${currentRoom.room_code}`,
// to
text: `შემომიერთდი ტრივიას თამაშში!`,
```

### File: `src/components/team/RoomLobby.tsx`
```typescript
// Line 118: change from  
text: `შემოგვიერთდი ტრივია ბრძოლაში! კოდი: ${room.room_code}`,
// to
text: `შემოგვიერთდი ტრივია ბრძოლაში!`,
```

### File: `src/pages/TeamV2.tsx`
In the join code `useEffect` (line 308), replace the guest branch that shows `GuestJoinModal` with auto-join logic:
```typescript
} else if (!pendingGuestJoinCode) {
  // Guest: auto-join with anonymous sign-in (no modal)
  setPendingGuestJoinCode(joinCode);
  (async () => {
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError || !anonData.user) {
      toast.error("შესვლა ვერ მოხერხდა");
      setPendingGuestJoinCode(null);
      return;
    }
    // Wait for profile trigger, then set default nickname
    await new Promise(resolve => setTimeout(resolve, 800));
    await supabase.from("profiles")
      .update({ nickname: "Trivia King" })
      .eq("user_id", anonData.user.id);
    // The useEffect will re-trigger with the new user and auto-join
  })();
}
```

