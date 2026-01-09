// Helper to translate notification content based on type and language
import { translations, DEFAULT_LANGUAGE } from '@/locales';

interface NotificationData {
  sender_nickname?: string;
  category_name?: string;
  [key: string]: unknown;
}

function getTranslation(key: string): string {
  const lang = typeof window !== 'undefined' 
    ? localStorage.getItem('preferredLanguage') || DEFAULT_LANGUAGE
    : DEFAULT_LANGUAGE;
  
  const keys = key.split('.');
  let result: unknown = translations[lang] || translations[DEFAULT_LANGUAGE];
  
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  
  return typeof result === 'string' ? result : key;
}

export function translateNotificationTitle(
  type: string,
  originalTitle: string,
  data?: NotificationData
): string {
  // Map notification types to translation keys
  const titleMap: Record<string, string> = {
    'game_started': 'notifications.gameStarted',
    'room_invite': 'notifications.gameRoomInvitation',
    'friend_request': 'notifications.friendRequest',
    'friend_accepted': 'notifications.friendAccepted',
    'challenge': 'notifications.challengeReceived',
    'game_result': 'notifications.gameResult',
  };

  const translationKey = titleMap[type];
  if (translationKey) {
    return getTranslation(translationKey);
  }

  return originalTitle;
}

export function translateNotificationMessage(
  type: string,
  originalMessage: string | null,
  data?: NotificationData
): string | null {
  if (!originalMessage) return null;

  // Map notification types to translation keys
  const messageMap: Record<string, string> = {
    'game_started': 'notifications.gameInRoom',
    'room_invite': 'notifications.invitedYouToPlay',
  };

  const translationKey = messageMap[type];
  if (translationKey) {
    const translation = getTranslation(translationKey);
    // Replace {name} placeholder with actual sender name
    if (data?.sender_nickname) {
      return translation.replace('{name}', data.sender_nickname);
    }
    return translation;
  }

  return originalMessage;
}
