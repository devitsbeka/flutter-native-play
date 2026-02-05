

# Plan: Fix Instant Notification Delivery

## Problem Analysis

Notifications are delayed because the current architecture has a fundamental design issue:

| Problem | Current Behavior | Impact |
|---------|-----------------|--------|
| **Multiple independent instances** | `useNotifications()` hook is called in 5+ places, each with its own state | Notifications don't sync between instances |
| **No subscription status check** | `.subscribe()` is called without waiting for `SUBSCRIBED` status | Subscription may not be active when events occur |
| **State isolation** | Each hook instance maintains its own `notifications` state | User must navigate/refresh to sync state |
| **No connection monitoring** | If realtime disconnects, no automatic refetch | Missed notifications during disconnection |

**Current architecture:**
```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  HeaderActions  │     │  NotifPanel     │     │  Index Page     │
│  useNotifications│    │  useNotifications│    │  useNotifications│
│  ├─ state []    │     │  ├─ state []    │     │  ├─ state []    │
│  └─ channel A   │     │  └─ channel B   │     │  └─ channel C   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ↓
                    ┌─────────────────────┐
                    │   Supabase Realtime │
                    │   notifications tbl │
                    └─────────────────────┘
```

Each component has its own subscription and state - when a new notification arrives:
- Only the **currently active** subscription receives it
- Other components still have old state
- Badge counts get out of sync

## Solution: Create a NotificationsContext

Move the realtime subscription to a **single global context** that all components share.

**New architecture:**
```text
┌────────────────────────────────────────────────────┐
│              NotificationsProvider                  │
│   ├─ single shared state: notifications[]          │
│   ├─ single realtime channel                       │
│   └─ subscription status monitoring                │
└────────────────────────┬───────────────────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    ↓                    ↓                    ↓
┌──────────┐      ┌───────────┐       ┌───────────┐
│HeaderActions│   │NotifPanel │       │Index Page │
│useNotif()  │    │useNotif() │       │useNotif() │
│  ↓ reads   │    │  ↓ reads  │       │  ↓ reads  │
│  context   │    │  context  │       │  context  │
└────────────┘    └───────────┘       └───────────┘
```

## Technical Changes

### 1. Create NotificationsContext

**New file: `src/contexts/NotificationsContext.tsx`**

This context will:
- Maintain a **single realtime subscription** for the logged-in user
- Share **one notifications state** across all components
- Add **subscription status callback** to verify connection
- **Refetch on reconnect** to catch any missed notifications
- Expose the same API as the current hook

```tsx
// Key improvements:

// 1. Status callback to verify subscription is active
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('[Notifications] Realtime connected');
    // Refetch to catch any missed notifications
    fetchNotifications();
  }
  if (status === 'CHANNEL_ERROR') {
    console.error('[Notifications] Channel error, will retry...');
  }
});

// 2. Single channel for the entire app
const CHANNEL_ID = `notifications-global-${user.id}`;

// 3. Connection health monitoring
const [isConnected, setIsConnected] = useState(false);
```

### 2. Update useNotifications Hook

Convert the existing hook to consume the context:

```tsx
// src/hooks/useNotifications.ts

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
```

### 3. Add Provider to App

Wrap the app with the new provider (at the same level as AuthProvider):

```tsx
// src/App.tsx
<AuthProvider>
  <NotificationsProvider>  {/* Add here */}
    ...
  </NotificationsProvider>
</AuthProvider>
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/contexts/NotificationsContext.tsx` | **Create** | New context with single realtime subscription |
| `src/hooks/useNotifications.ts` | **Modify** | Convert to context consumer |
| `src/App.tsx` | **Modify** | Add NotificationsProvider |

## Implementation Details

### NotificationsContext.tsx (New File)

```tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSound } from '@/contexts/SoundContext';

// ... types stay the same ...

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  isConnected: boolean;  // NEW: connection status
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { playSound } = useSound();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // ... fetchNotifications, markAsRead, etc. stay the same ...

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      setIsConnected(false);
      return;
    }

    fetchNotifications();

    // SINGLE global channel
    const channel = supabase
      .channel(`notifications-global-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications((prev) => [newNotification, ...prev]);
        playSound('notification');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as Notification;
        setNotifications((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n))
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
      })
      .subscribe((status) => {
        // KEY FIX: Monitor subscription status
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Refetch to catch any events that occurred during connection
          fetchNotifications();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user, fetchNotifications, playSound]);

  // ... rest of the implementation ...
}
```

### useNotifications.ts (Modified)

```tsx
import { useContext } from 'react';
import { NotificationsContext } from '@/contexts/NotificationsContext';
import { supabase } from '@/integrations/supabase/client';

// Export types
export type { Notification, NotificationType } from '@/contexts/NotificationsContext';

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}

// Keep the helper function for creating notifications
export async function createNotification(...) {
  // ... stays the same ...
}
```

### App.tsx (Modified)

```tsx
import { NotificationsProvider } from '@/contexts/NotificationsContext';

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <NotificationsProvider>  {/* ADD HERE - after AuthProvider */}
        <OnboardingProvider>
          <SoundProvider>
            ...
          </SoundProvider>
        </OnboardingProvider>
      </NotificationsProvider>
    </AuthProvider>
  </LanguageProvider>
);
```

## Summary

| Change | Benefit |
|--------|---------|
| Single global context | All components share the same notification state |
| Subscription status callback | Ensures realtime is actually connected before relying on it |
| Refetch on reconnect | Catches any notifications missed during connection gaps |
| Connection status exposed | Components can show offline indicator if needed |
| Existing API preserved | No changes needed in consuming components |

## Result

When a notification is created:
1. The **single** realtime subscription receives the INSERT event instantly
2. The shared state updates **once**
3. **All components** reading from the context immediately see the new notification
4. Badge counts update across the entire app simultaneously

