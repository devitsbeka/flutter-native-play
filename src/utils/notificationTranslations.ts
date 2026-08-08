// Helper to translate notification content based on type and language
import { translations, DEFAULT_LANGUAGE } from '@/locales';

interface NotificationData {
  sender_nickname?: string;
  category_name?: string;
  [key: string]: unknown;
}

function getCurrentLanguage(): string {
  try {
    return localStorage.getItem('preferredLanguage') || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function getTranslation(key: string): string {
  const lang = getCurrentLanguage();
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
    'trivia_played': 'extra.playedYourTrivia',
    'trivia_liked': 'extra.likedYourTrivia',
    'trivia_saved': 'extra.savedYourTrivia',
    'room_ping': 'extra.pingHostNotifTitle',
  };

  const translationKey = titleMap[type];
  if (translationKey) {
    let translation = getTranslation(translationKey);
    // Replace {name} with sender nickname if available
    if (data?.sender_nickname) {
      translation = translation.replace('{name}', data.sender_nickname as string);
    } else {
      // Use "someone" fallback for trivia types
      if (type === 'trivia_played') return getTranslation('extra.someonePlayed');
      if (type === 'trivia_liked') return getTranslation('extra.someoneLiked');
      if (type === 'trivia_saved') return getTranslation('extra.someoneSaved');
    }
    return translation;
  }

  return originalTitle;
}

export function translateNotificationMessage(
  type: string,
  originalMessage: string | null,
  data?: NotificationData
): string | null {
  if (!originalMessage) return null;

  // Map notification types to translation keys with dynamic content
  const messageMap: Record<string, string> = {
    'game_started': 'notifications.gameStartedBy',
    'room_invite': 'notifications.invitedYouToPlay',
    'friend_request': 'notifications.friendRequestFrom',
    'friend_accepted': 'notifications.friendAcceptedBy',
  };

  const translationKey = messageMap[type];
  if (translationKey) {
    let translation = getTranslation(translationKey);
    
    // Replace placeholders with actual data
    if (data?.sender_nickname) {
      translation = translation.replace('{name}', data.sender_nickname);
    } else {
      translation = translation.replace('{name} ', '').replace('{name}', '');
    }
    
    // Replace room name if present
    if (data?.room_name) {
      translation = translation.replace('{room}', data.room_name as string);
    } else {
      translation = translation.replace(': {room}', '').replace('{room}', '');
    }
    
    return translation;
  }

  return originalMessage;
}
