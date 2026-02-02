
# Plan: Fix Mobile Zoom Issue on Login

## Problem

When users enter username/password on mobile, the page appears zoomed in after navigating to the main page. This is a common iOS/Android browser behavior caused by:

1. **Input fields with font-size < 16px** - Mobile browsers automatically zoom in when focusing on inputs smaller than 16px to make text readable
2. **Missing viewport zoom prevention** - The viewport meta tag doesn't prevent user scaling, so the zoom persists after login

## Solution

Two-pronged fix:

### 1. Update Viewport Meta Tag (index.html)

Add `maximum-scale=1` and `user-scalable=no` to prevent iOS/Android from auto-zooming on input focus:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

### 2. Increase Input Font Size to 16px Minimum

Update all input fields to use at least 16px font size. This is the magic threshold that prevents mobile browser auto-zoom.

**Files to update:**

| File | Current | Change |
|------|---------|--------|
| `GuestWelcomePanel.tsx` | `text-sm` (14px) | `text-base` (16px) |
| `SignupOnboardingModal.tsx` | `text-lg` (18px) | Already good |
| `DesktopGuestSplitLayout.tsx` | `text-sm` (14px) | `text-base` (16px) |

## Technical Details

### File: `index.html`
- Line 5: Update viewport meta tag

### File: `src/components/home/GuestWelcomePanel.tsx`
- Lines 253-256, 279-282, 304-307: Change `text-sm` to `text-base` on input fields

### File: `src/components/home/DesktopGuestSplitLayout.tsx`
- Similar input field font size updates

## Result

After these changes:
- Mobile browsers won't auto-zoom when focusing on login inputs
- The page will stay at normal scale throughout the login flow
- User experience remains consistent without needing to manually zoom out
