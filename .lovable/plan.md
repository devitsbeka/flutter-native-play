

## Fix Missing "გაზიარება" (Share) Button in InviteFriendsModal

### Problem
The share button is hidden because the condition `{"share" in navigator}` returns `false` in some environments. This means users only see the copy button.

### Solution

**File: `src/components/home/InviteFriendsModal.tsx`**

- Remove the `{"share" in navigator && (...)}` conditional wrapper around the share button (line 203).
- Always render both buttons side by side: "კოპირება" and "გაზიარება".
- The `handleShare` function already has a fallback — if `navigator.share` is unavailable, it calls `handleCopy()` instead. So it's safe to always show the button.

This is a one-line change: remove the conditional on line 203 and its closing on line 214, keeping the `ChunkyButton` itself intact.

