
# Fix Notification Type Indicator Badges

## Problem
The small type indicator badges on notification cards have two issues:
1. **Using wrong icons**: Currently using Lucide icons (Heart, Bookmark, Play) instead of the 3D emoji icons used elsewhere
2. **No background container**: The indicators use transparent backgrounds, making them invisible on certain avatars

## Solution
Update the `CompactNotificationCard` to:
1. Use 3D emoji icons for trivia notifications (trivia_liked, trivia_saved, trivia_played)
2. Add a solid white/card background container for all type indicator badges

---

## Files to Modify

### `src/components/notifications/CompactNotificationCard.tsx`

**Change 1**: Add 3D icon imports
```typescript
import purpleHeart3d from "@/assets/icons/purple-heart-3d.png";
import bookmark3d from "@/assets/icons/bookmark-3d-orange.png";
import pushButton3d from "@/assets/icons/push-button-3d.png";
```

**Change 2**: Create icon mapping for trivia notification types
```typescript
const TRIVIA_TYPE_ICONS: Record<string, string> = {
  trivia_liked: purpleHeart3d,
  trivia_saved: bookmark3d,
  trivia_played: pushButton3d,
};
```

**Change 3**: Update the type indicator badge (lines 230-236)

Current code:
```tsx
<div className={cn(
  "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background",
  config.bgColor.replace('/20', '')
)}>
  <Icon className="w-2.5 h-2.5 text-white" />
</div>
```

New code:
```tsx
<div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-card border-2 border-border shadow-sm">
  {TRIVIA_TYPE_ICONS[notification.type] ? (
    <img 
      src={TRIVIA_TYPE_ICONS[notification.type]} 
      alt=""
      className="w-3.5 h-3.5 object-contain"
    />
  ) : (
    <Icon className={cn("w-2.5 h-2.5", config.color)} />
  )}
</div>
```

---

## Visual Changes

| Before | After |
|--------|-------|
| Transparent badge with white Lucide icon | Solid card background with shadow |
| Heart icon (Lucide) | Purple heart 3D emoji |
| Bookmark icon (Lucide) | Orange bookmark 3D emoji |
| Play icon (Lucide) | Push button 3D emoji |
| Hard to see on light avatars | Clear visibility on all backgrounds |

---

## Technical Details

| Change | Details |
|--------|---------|
| Background | `bg-card` instead of dynamic color |
| Border | `border-border` instead of `border-background` |
| Shadow | Added `shadow-sm` for depth |
| Icons | 3D emoji images for trivia types, Lucide for others |
| Fallback | Non-trivia types keep using Lucide icons with colored styling |
