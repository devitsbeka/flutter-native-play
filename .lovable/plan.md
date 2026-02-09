
## Fix Return Gift Logic and Add Floating Gift Icon

### Problem
The current BetaGiftModal has two issues:
1. **One-time only**: The gift is tracked with `returnee_gift_claimed` in localStorage, so it only works once ever. You want it to trigger every time a user returns after 30+ minutes of absence (as long as they're not already VIP).
2. **No fallback when dismissed**: When user clicks "მოგვიანებით", the gift opportunity is lost for that session with no way to reclaim it.

### Solution

#### 1. Make the gift repeatable (BetaGiftModal.tsx)
- Remove the `returnee_gift_claimed` one-time check. Instead, only check:
  - User is not currently VIP
  - User has been away 30+ minutes (using `last_visit_ts`)
  - User has played at least 1 game
- Keep updating `last_visit_ts` on every visit so the 30-minute window resets correctly.

#### 2. Add floating gift icon when dismissed
- When user clicks "მოგვიანებით" or clicks outside the modal, instead of just closing, store a "pending gift" state.
- Show a floating gift icon (using the uploaded `gift-box.png`) on the main page -- a bouncing/pulsing button in the bottom-right area.
- Clicking the floating icon re-opens the modal with the same offer.
- After claiming, the floating icon disappears.

#### 3. Use uploaded assets
- Copy `gift-box.png` to `src/assets/icons/gift-box.png` for the floating icon (closed gift).
- Copy `unboxing-gift-2.png` to `src/assets/icons/unboxing-gift-2.png` for the opened gift in the claim button.

### Files to Change

| File | Change |
|------|--------|
| `src/assets/icons/gift-box.png` | New -- copy uploaded gift-box image |
| `src/assets/icons/unboxing-gift-2.png` | New -- copy uploaded unboxing gift image |
| `src/components/shared/BetaGiftModal.tsx` | Remove one-time claim check; add `onDismiss` callback prop; make repeatable |
| `src/components/shared/FloatingGiftButton.tsx` | New -- floating pulsing gift icon component |
| `src/contexts/PlayerProfileContext.tsx` | Add state for pending gift; render FloatingGiftButton when gift was dismissed; wire modal open/close |

### Technical Details

**BetaGiftModal changes:**
- Remove `GIFT_STORAGE_KEY` and the `claimed` localStorage check
- Keep `isVip` check (don't offer to active VIP users)
- Add `onDismiss` prop so parent knows when user chose "მოგვიანებით"
- Add `onClaimed` prop so parent knows when gift was claimed

**FloatingGiftButton:**
- Positioned fixed bottom-right (above any bottom nav)
- Uses `gift-box.png` with a bounce + glow animation
- Small badge/shimmer effect to draw attention
- Clicking it calls `onOpen` to reshow the modal

**PlayerProfileContext orchestration:**
- Track `pendingGift` boolean state
- When BetaGiftModal triggers and user dismisses, set `pendingGift = true`
- Show FloatingGiftButton when `pendingGift` is true
- When FloatingGiftButton clicked, reopen BetaGiftModal
- When gift claimed, set `pendingGift = false`
