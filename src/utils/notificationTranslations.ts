// Helper to translate notification content based on type and language
import { translations, DEFAULT_LANGUAGE } from '@/locales';
import { missionTitle } from '@/utils/missionText';

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

  // A completed mission's row carries the title in the language the app was
  // in when it was written. mission_id does not change, so the name is looked
  // up from that and only falls back to the stored words for a mission this
  // build does not know.
  if (type === 'reward' && data?.mission_id) {
    const name = missionTitle(data.mission_id as string, '');
    if (name) return getTranslation('missions.completedTitle').replace('{mission}', name);
  }

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

  // "Reward: 350 coins · 6 gems · 180 XP" — rebuilt from the numbers stored
  // alongside the notification rather than read back as a Georgian sentence.
  if (type === 'reward') {
    const bits = [
      Number(data?.coins) > 0 ? `${data!.coins} ${getTranslation('common.coins')}` : null,
      Number(data?.gems) > 0 ? `${data!.gems} ${getTranslation('common.gems')}` : null,
      Number(data?.xp) > 0 ? `${data!.xp} XP` : null,
    ].filter(Boolean).join(' · ');
    if (bits) return `${getTranslation('missions.rewardLabel')}: ${bits}`;
  }

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
