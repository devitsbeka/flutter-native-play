

## Fix: Only Show Invite Modal for Non-PRO Users + Update Shared Text

### Problem
1. The invite/gift modal sometimes appears for users who already have PRO, likely due to a timing issue where VIP status hasn't fully loaded yet.
2. The confirmation text after copying/sharing needs to be updated to the plural form.

### Changes

**File: `src/components/home/InviteFriendsModal.tsx`**

1. **Add VIP guard inside the modal itself**: Import `useVipStatus` and add a check so the modal auto-closes or refuses to render if the user is VIP. This acts as a safety net regardless of how the modal was triggered.
   - Import `useVipStatus` from `@/hooks/useVipStatus`
   - Inside the component, get `isVip` and `loading`
   - In the early return, change `if (!open) return null` to `if (!open || (isVip && !loading)) return null` -- if the user is confirmed VIP, don't render the modal at all.

2. **Update the shared confirmation text** (line 223): Change from:
   > როცა მოწვეული მეგობარი შემოგვიერთდება, შენ და შენი მეგობარი მიიღებთ 10 დღიან PRO-ს!

   To the plural version the user requested:
   > როცა მოწვეული მეგობრები შემოგვიერთდებიან, შენ და შენი მეგობრები მიიღებთ 10 დღიან PRO-ს!

3. **Also update `useInviteModalVisibility` hook**: Add a reactive effect that dismisses the modal if `isVip` becomes `true` after it was already shown (handles the case where VIP status loads after the modal opened):
   ```
   useEffect(() => {
     if (visible && isVip && !vipLoading) {
       setVisible(false);
     }
   }, [visible, isVip, vipLoading]);
   ```

### Summary of Safety Layers
- `useInviteModalVisibility` won't auto-show for VIP users (existing)
- `useInviteModalVisibility` will auto-close if VIP loads after modal opened (new)
- The modal component itself won't render for confirmed VIP users (new)
- All manual trigger points in Index.tsx and MatchResultScreen already check `!isVip` (existing)

