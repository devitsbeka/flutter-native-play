
# 10-Day PRO Gift Banner + Yellow Play Button

## Overview
Add a promotional PRO gift banner on the home page (above the avatar) and change the main play button to yellow with sparkle animation for the next 10 days. This is a time-limited engagement feature for the app's launch period.

## What Changes

### 1. PRO Gift Banner (above avatar on home page)
A single-line banner displayed above the avatar area on both mobile and desktop:
- **Layout**: Confetti gun icon (from uploaded asset) + "გილოცავთ, PRO გაქვს 10 დღის განმავლობაში!" + yellow "მიიღე" (Get it) CTA button
- **Design**: Rounded pill with a warm gradient background (amber/gold), slight glow, placed above the avatar section
- **Behavior**:
  - If user is **signed in**: Tapping "მიიღე" activates 10-day PRO via the existing `activateVip` flow (using a custom 10-day duration), then hides the banner (stored in localStorage with key `beta_pro_gift_claimed_{userId}`)
  - If user is **not signed in (guest)**: Tapping "მიიღე" shows a toast or small modal saying "შედი ანგარიშზე საჩუქრის მისაღებად" (Sign in to accept the gift) and navigates to `/auth`
- **Visibility**: Banner is hidden once claimed, or after the 10-day promotion period ends (hardcoded end date: `2026-02-22`)

### 2. Yellow Play Button with Sparkle Animation
- Change the bottom nav play button variant from `"mint"` (green) to `"gold"` (yellow) as the default for this promotional period
- On page load, the play button gets a 2-second sparkle + glow animation:
  - A brief golden glow pulse around the button (box-shadow animation)
  - Extra sparkle particles for 2 seconds then settles to normal

## Technical Details

### New Asset
- Copy `user-uploads://confetti-gun-2.png` to `src/assets/confetti-gun-2.png`

### File: `src/pages/Index.tsx`
- Import the confetti gun asset
- Add a `ProGiftBanner` component inline (or as a small separate component) that:
  - Checks `localStorage` for `beta_pro_gift_claimed_{userId}` (or `beta_pro_gift_dismissed_guest` for guests)
  - Checks if current date is before `2026-02-22`
  - Renders the single-line banner above the avatar in both mobile and desktop sections
  - On CTA click: if user exists, calls `activateVip("day")` 10 times or uses a direct Supabase update to set `expires_at` to 10 days from now, then sets localStorage flag
  - On CTA click: if guest, shows toast "შედი ანგარიშზე საჩუქრის მისაღებად" and navigates to `/auth`

### File: `src/components/layout/UniversalBottomNav.tsx`
- During the promo period (before `2026-02-22`), change the default play button variant from `"mint"` to `"gold"` for non-VIP users who can play
- Add a one-time 2-second sparkle/glow animation on the `Hex3DPlayButton`:
  - Use framer-motion `animate` with a golden `boxShadow` pulse that fades after 2 seconds
  - Add extra sparkle particles that animate for 2 seconds then disappear

### File: `src/contexts/VipContext.tsx`
- Add a helper method or allow the `activateVip` to accept a custom number of days (e.g., a `"10days"` option) so the banner can grant exactly 10 days of PRO

### Component: `ProGiftBanner` (inline in Index.tsx or new small file)
```
[confetti-gun icon 28px] გილოცავთ, PRO გაქვს 10 დღის განმავლობაში!  [მიიღე button]
```
- Single horizontal row, centered, with `bg-gradient-to-r from-amber-50 to-yellow-100` background
- Border: `border border-amber-200`
- Rounded: `rounded-2xl`
- Padding: `px-4 py-2.5`
- CTA button: small yellow/gold rounded button with "მიიღე" text
- Subtle entrance animation (fade-in + slight scale)

### Placement
- **Mobile (logged in)**: Above the curved action buttons, inside the `md:hidden` user section (around line 938)
- **Mobile (guest)**: Above the guest avatar section (around line 582)
- **Desktop**: Above the avatar in the centered layout sections
