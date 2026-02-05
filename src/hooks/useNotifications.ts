import { useContext } from 'react';
import { NotificationsContext } from '@/contexts/NotificationsContext';
import { supabase } from '@/integrations/supabase/client';

// Re-export types for backward compatibility
export type { Notification, NotificationType } from '@/contexts/NotificationsContext';

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}

// Helper function to create a notification (can be used by other hooks)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message?: string,
  data?: Record<string, unknown>
) {
  try {
    const { error } = await supabase.from('notifications').insert([{
      user_id: userId,
      type,
      title,
      message: message || null,
      data: (data || {}) as unknown as Record<string, never>,
    }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
