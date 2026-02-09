

## PRO Play Button Badge: Limitless Only + 24h Countdown

### What Changes

**1. Remove crown icon from the badge above the play button**
Currently the badge above the play button shows a crown icon + infinity symbol. Since the crown is already displayed inside the play button itself, the badge will show only the `∞` symbol -- cleaner and less redundant.

**2. Add countdown timer for short-duration PRO users**
Users who received a 24-hour PRO reward (e.g., via beta gift) will see a countdown timer above the play button showing how much time remains (e.g., `02:45:30`). This helps them know when their PRO access expires. The countdown will only appear when the PRO subscription expires within 24 hours.

### Technical Details

**File: `src/components/layout/UniversalBottomNav.tsx`**

| Section | Current | New |
|---------|---------|-----|
| VIP badge (line 393-404) | Crown icon + `∞` text | Only `∞` text, slightly larger |
| Props | `isVip`, `canPlay`, etc. | Add `vipExpiresAt?: string` prop |
| Countdown | Not present | Show `HH:MM` countdown when VIP expires within 24h |

The `Hex3DPlayButton` component will receive the VIP expiry timestamp. When the subscription expires within 24 hours, instead of (or alongside) the `∞` badge, a small countdown timer will be shown above the play button.

**File: `src/pages/Index.tsx`**

Pass `subscription?.expires_at` to the bottom nav so the play button can show the countdown.

**File: `src/components/layout/MainLayout.tsx`**

Thread the `vipExpiresAt` prop through to `UniversalBottomNav`.

### Implementation

1. In `UniversalBottomNav.tsx` / `Hex3DPlayButton`:
   - Remove `<Crown>` icon from the VIP badge, keep only `∞`
   - Add a `vipExpiresAt` prop
   - When `isVip` and expiry is within 24 hours: show a compact countdown (`HH:MM:SS`) in the badge position instead of `∞`
   - Use a `useState` + `setInterval` (1s) to tick the countdown
   - When expiry is more than 24h away (or no expiry): show the `∞` badge as before (without crown)

2. In `Index.tsx`: import `subscription` from `useVipStatus()` and pass `subscription?.expires_at` down through the layout

3. In `MainLayout.tsx`: add `vipExpiresAt` to the props interface and forward it to `UniversalBottomNav`
