

# Enhanced Notification Cards with Rich Content

## Problem Analysis

Based on the screenshot and database investigation, I found **two main issues**:

### 1. Duplicate Notifications
When inviting a friend to a game, **two notifications are created**:
- `room_invite` (from database trigger when adding to `room_participants`)
- `challenge` (manually created in `useGameInvitations.ts` via `createNotification()`)

### 2. Notifications Look Generic and Repetitive
Current cards show:
- Same purple icon for everything
- Generic title like "ოთახის მოწვევა" 
- No sender avatar or room name visible
- No category/room context

---

## Solution Overview

### Part 1: Fix Duplicate Notifications

Remove the manual `createNotification()` call in `useGameInvitations.ts` since the database trigger already creates `room_invite` notifications.

**File: `src/hooks/useGameInvitations.ts`** (lines 135-151)

Remove the block that calls `createNotification()` - the trigger handles this already.

---

### Part 2: Normalize Data Fields

Update `notify_room_invite` trigger to use consistent field name `sender_avatar` instead of `sender_avatar_url`.

**SQL Migration:**
```sql
-- Update to use consistent sender_avatar field
'sender_avatar', sender_profile.avatar_url
```

---

### Part 3: Redesign Notification Card

Transform `CompactNotificationCard.tsx` into a richer, more engaging layout:

**New Layout Structure:**
```text
┌─────────────────────────────────────────────────────┐
│  [Avatar]   ოთახის მოწვევა              ახლა •     │
│             beka გიწვევს თამაშში                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  🏠 აღმომჩენთა გილია                        │   │
│  │  📂 კატეგორია: ჰარი პოტერი                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [ შესვლა ]    [ უარყოფა ]                        │
└─────────────────────────────────────────────────────┘
```

**Key Visual Changes:**
1. **Sender Avatar** - Show the actual sender's avatar (not just type icon)
2. **Room Info Card** - Add a subtle card showing room name and category
3. **Category Badge** - Display the trivia category when available
4. **Visual Hierarchy** - Differentiate title, subtitle, and context
5. **Action Buttons** - Keep accept/decline buttons prominent

---

### Part 4: Extract and Display Metadata

**File: `src/components/notifications/CompactNotificationCard.tsx`**

Add proper metadata extraction:

```typescript
// Extract rich metadata
const avatarUrl = notification.data?.sender_avatar || 
                  notification.data?.sender_avatar_url;
const senderName = notification.data?.sender_nickname;
const roomName = notification.data?.room_name;
const categoryName = notification.data?.category_name;
```

**Add Room Info Section (for room_invite, game_started, challenge):**

```tsx
{(roomName || categoryName) && (
  <div className="mt-2 p-2.5 rounded-xl bg-muted/50 space-y-1">
    {roomName && (
      <div className="flex items-center gap-2 text-xs">
        <Home className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">{roomName}</span>
      </div>
    )}
    {categoryName && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Tag className="w-3.5 h-3.5" />
        <span>{categoryName}</span>
      </div>
    )}
  </div>
)}
```

---

### Part 5: Friend Request Enhancement

For `friend_request` type, show the sender prominently:

```tsx
{isFriendRequest && senderName && (
  <div className="flex items-center gap-2 mt-1">
    <Avatar className="w-6 h-6">
      <AvatarImage src={avatarUrl} />
      <AvatarFallback>{senderName[0]}</AvatarFallback>
    </Avatar>
    <span className="text-sm font-medium">{senderName}</span>
    <span className="text-xs text-muted-foreground">გთხოვს მეგობრობას</span>
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useGameInvitations.ts` | Remove duplicate `createNotification()` call |
| `src/components/notifications/CompactNotificationCard.tsx` | Add room info section, show sender avatar, extract all metadata |
| **SQL Migration** | Fix `notify_room_invite` to use `sender_avatar` consistently |

---

## Expected Results

| Before | After |
|--------|-------|
| Two identical "ოთახის მოწვევა" notifications | Single rich notification |
| Generic purple icon | Sender's actual avatar |
| No room/category info visible | Room name + category displayed |
| All notifications look the same | Type-specific layouts with context |

**Visual Example After Fix:**

```text
┌─────────────────────────────────────────────────────┐
│  [beka's    ოთახის მოწვევა              ახლა       │
│   avatar]   beka გიწვევს თამაშში                   │
│                                                     │
│  ┌ 🏠 აღმომჩენთა გილია ─────────────────────────┐ │
│  │ 📂 ბიზნესის სამყარო                          │ │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [🟢 ითამაშე]    [უარყოფა]                        │
└─────────────────────────────────────────────────────┘
```

