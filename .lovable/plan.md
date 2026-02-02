
# Enhance Unread Notification Visual Distinction

## Overview
Update the notification card background to use an explicit purple color with 10% opacity for unread notifications, making them more visually distinct from read notifications.

## Current State
The `CompactNotificationCard` component already applies a background color for unread notifications:
```tsx
isUnread ? "bg-primary/10" : "bg-card/80"
```

The `--primary` color is set to HSL `263 60% 59%` which is purple, so technically unread notifications already have a purple tint. However, using Tailwind's explicit `purple` color may provide a more consistent and vibrant visual distinction.

## Proposed Change

Update the background class in `CompactNotificationCard.tsx` to use Tailwind's explicit purple color:

```tsx
// Line 274 - Change from:
isUnread ? "bg-primary/10" : "bg-card/80"

// To:
isUnread ? "bg-purple-500/10" : "bg-card/80"
```

This will apply Tailwind's purple-500 color at 10% opacity, providing a consistent purple tint regardless of theme configuration.

## Technical Details

| File | Change |
|------|--------|
| `src/components/notifications/CompactNotificationCard.tsx` | Update line 274 to use `bg-purple-500/10` instead of `bg-primary/10` |

The change ensures:
- Unread notifications have a distinct purple background (10% opacity)
- Read notifications maintain the neutral `bg-card/80` background
- Visual consistency across light and dark modes

## Files to Modify
- `src/components/notifications/CompactNotificationCard.tsx`
