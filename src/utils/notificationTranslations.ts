// Helper to translate notification content based on type and language
import { translations, DEFAULT_LANGUAGE, CONTENT_LANGUAGE } from '@/locales';
import { missionTitle } from '@/utils/missionText';
import { readAppLanguage } from '@/utils/appLanguage';

interface NotificationData {
  sender_nickname?: string;
  category_name?: string;
  [key: string]: unknown;
}

function getCurrentLanguage(): string {
  return readAppLanguage(DEFAULT_LANGUAGE);
}

// The stored Georgian text of a key, for recognizing rows the database wrote
// verbatim (e.g. the migration-written welcome notification) — kept out of
// this file's source so the no-mixed-language sweep stays clean.
function kaText(key: string): string {
  const keys = key.split('.');
  let result: unknown = translations[CONTENT_LANGUAGE];
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return '';
    }
  }
  return typeof result === 'string' ? result : '';
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
    'friend_request_sent': 'notifications.friendRequestSent',
    'friend_accepted': 'notifications.friendAccepted',
    'challenge': 'notifications.challengeReceived',
    'game_result': 'notifications.gameResult',
    'trivia_played': 'extra.playedYourTrivia',
    'trivia_liked': 'extra.likedYourTrivia',
    'trivia_saved': 'extra.savedYourTrivia',
    'room_ping': 'extra.pingHostNotifTitle',
    // The stored title is the room's name-or-code (a bare "N3UAUD" for a
    // Battle room, which has no name) — say what happened instead; the
    // card's room chip carries which room.
    'room_join_approved': 'extra.joinApprovedTitle',
    'room_join_declined': 'extra.joinDeclinedTitle',
  };

  // A completed mission's row carries the title in the language the app was
  // in when it was written. mission_id does not change, so the name is looked
  // up from that and only falls back to the stored words for a mission this
  // build does not know.
  // A seat moving is three different events under one icon, told apart by
  // the kind the RPC wrote — the same shape as a mission read out of
  // data.mission_id below.
  if (type === 'subscription' && typeof data?.kind === 'string') {
    const seatTitles: Record<string, string> = {
      pro_seat_granted: 'extra.proSeatGotTitle',
      pro_seat_sent: 'extra.proSeatSentTitle',
      pro_seat_revoked: 'extra.proSeatEndedTitle',
    };
    const key = seatTitles[data.kind];
    if (key) return getTranslation(key);
  }

  if (type === 'reward' && data?.mission_id) {
    const name = missionTitle(data.mission_id as string, '');
    if (name) return getTranslation('missions.completedTitle').replace('{mission}', name);
  }

  // The welcome row is written by a migration in Georgian for EVERY account,
  // under the shared 'system' type — match its known text rather than the
  // type, so other system rows keep their stored words.
  if (type === 'system' && originalTitle === kaText('extra.welcomeNotifTitle')) {
    return getTranslation('extra.welcomeNotifTitle');
  }

  /**
   * A room ping is three different messages under one type.
   *
   * A guest asking the host to start, a teammate calling the player on the
   * spot while the clock runs, and a lobby calling somebody who wandered off
   * back to their seat — all of them `room_ping`, and all of them titled
   * "{name}: Let's play!", which is only true of the first. The kind the
   * sender wrote in `data` says which.
   */
  if (type === 'room_ping' && typeof data?.kind === 'string') {
    const pingTitles: Record<string, string> = {
      team_poke: 'teamBattle.pokeNotifTitle',
      room_callback: 'teamBattle.callBackTitle',
    };
    const key = pingTitles[data.kind];
    if (key) {
      return getTranslation(key).replace(
        '{name}',
        (data.sender_nickname as string) || getTranslation('extra.someoneLabel'),
      );
    }
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

  if (type === 'subscription' && typeof data?.kind === 'string') {
    const seatMessages: Record<string, string> = {
      pro_seat_granted: 'extra.proSeatGotBody',
      pro_seat_sent: 'extra.proSeatSentBody',
      pro_seat_revoked: 'extra.proSeatEndedBody',
    };
    const key = seatMessages[data.kind];
    if (key) {
      return getTranslation(key).replace(
        '{name}',
        (data.sender_nickname as string) || getTranslation('extra.proSeatsUnknown'),
      );
    }
  }

  // Map notification types to translation keys with dynamic content
  const messageMap: Record<string, string> = {
    'game_started': 'notifications.gameStartedBy',
    'room_invite': 'notifications.invitedYouToPlay',
    'friend_request': 'notifications.friendRequestFrom',
    'friend_request_sent': 'notifications.friendRequestSentTo',
    'friend_accepted': 'notifications.friendAcceptedBy',
  };

  // See the matching title branch: the migration-written welcome row is
  // Georgian for every account and shares the 'system' type.
  if (type === 'system' && originalMessage === kaText('extra.welcomeNotifMsg')) {
    return getTranslation('extra.welcomeNotifMsg');
  }

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

  /**
   * And the body is never the stored words.
   *
   * What got stored was whatever the sender happened to have to hand — a
   * category name, or a bare room code like "7EXAZJ", which is what the
   * card showed under "Let's play!". Say what the ping is for; the card's
   * own room chip carries which room.
   */
  if (type === 'room_ping') {
    const kind = typeof data?.kind === 'string' ? data.kind : '';
    const pingBodies: Record<string, string> = {
      team_poke: 'teamBattle.pokeNotifBody',
      room_callback: 'teamBattle.callBackBody',
    };
    return getTranslation(pingBodies[kind] ?? 'extra.pingHostNotifBody');
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
