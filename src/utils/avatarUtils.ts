/**
 * Avatar URL utilities
 * Handles various avatar URL formats and provides fallbacks for broken images
 */

import botAvatar1 from '@/assets/avatars/bot-avatar-1.png';
import botAvatar2 from '@/assets/avatars/bot-avatar-2.png';
import botAvatar3 from '@/assets/avatars/bot-avatar-3.png';
import botAvatar4 from '@/assets/avatars/bot-avatar-4.png';
import botAvatar5 from '@/assets/avatars/bot-avatar-5.png';
import botAvatar6 from '@/assets/avatars/bot-avatar-6.png';
import botAvatar7 from '@/assets/avatars/bot-avatar-7.png';
import botAvatar8 from '@/assets/avatars/bot-avatar-8.png';
import botAvatar9 from '@/assets/avatars/bot-avatar-9.png';
import friendGloria from "@/assets/figma-home/friend-gloria.png";
import friendTiko from "@/assets/figma-home/friend-tiko.png";
import friendGiga from "@/assets/figma-home/friend-giga.png";
import friendGiorgi from "@/assets/figma-home/friend-giorgi.png";
import friendTrivia from "@/assets/figma-home/friend-trivia.png";
import botAvatar10 from '@/assets/avatars/bot-avatar-10.png';
import mascotAvatar1 from '@/assets/avatars/mascot-avatar-1.png';
import mascotAvatar2 from '@/assets/avatars/mascot-avatar-2.png';
import mascotAvatar3 from '@/assets/avatars/mascot-avatar-3.png';
import mascotAvatar4 from '@/assets/avatars/mascot-avatar-4.png';
import mascotAvatar5 from '@/assets/avatars/mascot-avatar-5.png';
import mascotAvatar6 from '@/assets/avatars/mascot-avatar-6.png';
import mascotAvatar7 from '@/assets/avatars/mascot-avatar-7.png';
import mascotAvatar8 from '@/assets/avatars/mascot-avatar-8.png';

// Known local asset avatar patterns that need special handling
const LOCAL_ASSET_PATTERN = /^\/src\/assets\//;
const RELATIVE_ASSET_PATTERN = /^src\/assets\//;

// Detect Vite build-time hashed asset paths (e.g., /assets/bot-avatar-4-uiIFWm1y.png)
// These paths are only valid during the build that created them
const VITE_HASHED_ASSET_PATTERN = /^\/assets\/.*-[a-zA-Z0-9]{8}\.(png|jpg|jpeg|webp|gif|svg)$/;

const FRIEND_AVATAR_MAP: Record<string, string> = {
  gloria: friendGloria,
  tiko: friendTiko,
  giga: friendGiga,
  giorgi: friendGiorgi,
  trivia: friendTrivia,
};

/**
 * Attempts to recover a broken Vite-hashed avatar URL by extracting the avatar number
 * and mapping it to the correct imported asset
 */
function recoverViteHashedAvatar(avatarUrl: string): string | undefined {
  // Try bot-avatar pattern
  const botMatch = avatarUrl.match(/bot-avatar-(\d+)/);
  if (botMatch && botMatch[1]) {
    const filename = `bot-avatar-${botMatch[1]}.png`;
    if (BOT_AVATAR_MAP[filename]) {
      console.info('Recovered broken Vite-hashed avatar:', avatarUrl, '→', filename);
      return BOT_AVATAR_MAP[filename];
    }
  }
  // Try mascot-avatar pattern
  const mascotMatch = avatarUrl.match(/mascot-avatar-(\d+)/);
  if (mascotMatch && mascotMatch[1]) {
    const filename = `mascot-avatar-${mascotMatch[1]}.png`;
    if (BOT_AVATAR_MAP[filename]) {
      console.info('Recovered broken Vite-hashed avatar:', avatarUrl, '→', filename);
      return BOT_AVATAR_MAP[filename];
    }
  }
  // Named friend portraits. These are stored the same way and were the only
  // ones never in the map, so they were what logged "Unrecoverable" — about
  // twenty times a session on the home screen, once per row that showed one.
  const friendMatch = avatarUrl.match(/friend-([a-z]+)/i);
  if (friendMatch && friendMatch[1]) {
    const recovered = FRIEND_AVATAR_MAP[friendMatch[1].toLowerCase()];
    if (recovered) {
      console.info('Recovered broken Vite-hashed avatar:', avatarUrl, '→', friendMatch[0]);
      return recovered;
    }
  }
  return undefined;
}

// Map local paths to imported assets
const BOT_AVATAR_MAP: Record<string, string> = {
  'bot-avatar-1.png': botAvatar1,
  'bot-avatar-2.png': botAvatar2,
  'bot-avatar-3.png': botAvatar3,
  'bot-avatar-4.png': botAvatar4,
  'bot-avatar-5.png': botAvatar5,
  'bot-avatar-6.png': botAvatar6,
  'bot-avatar-7.png': botAvatar7,
  'bot-avatar-8.png': botAvatar8,
  'bot-avatar-9.png': botAvatar9,
  'bot-avatar-10.png': botAvatar10,
  'mascot-avatar-1.png': mascotAvatar1,
  'mascot-avatar-2.png': mascotAvatar2,
  'mascot-avatar-3.png': mascotAvatar3,
  'mascot-avatar-4.png': mascotAvatar4,
  'mascot-avatar-5.png': mascotAvatar5,
  'mascot-avatar-6.png': mascotAvatar6,
  'mascot-avatar-7.png': mascotAvatar7,
  'mascot-avatar-8.png': mascotAvatar8,
};

/**
 * Resolves an avatar URL to a valid, loadable URL
 * Handles:
 * - Local asset paths (/src/assets/...) that need to be converted to imported module URLs
 * - Null/undefined values
 * - Already-valid URLs (http/https)
 */
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | undefined {
  if (!avatarUrl) return undefined;
  
  // Try to recover Vite-hashed asset paths by extracting avatar number
  if (VITE_HASHED_ASSET_PATTERN.test(avatarUrl)) {
    const recovered = recoverViteHashedAvatar(avatarUrl);
    if (recovered) {
      return recovered;
    }
    console.warn('Unrecoverable Vite-hashed avatar path:', avatarUrl);
    return undefined;
  }
  
  // Already a valid URL
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // Handle local asset paths
  if (LOCAL_ASSET_PATTERN.test(avatarUrl) || RELATIVE_ASSET_PATTERN.test(avatarUrl)) {
    // Extract the filename
    const filename = avatarUrl.split('/').pop();
    if (filename && BOT_AVATAR_MAP[filename]) {
      return BOT_AVATAR_MAP[filename];
    }
    // If not in our map, return undefined to trigger fallback
    console.warn('Unknown local avatar path:', avatarUrl);
    return undefined;
  }
  
  // Data URLs are valid
  if (avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  
  // Unknown format, return as-is and let the browser handle it
  return avatarUrl;
}

const MASCOT_AVATARS: string[] = [
  mascotAvatar1, mascotAvatar2, mascotAvatar3, mascotAvatar4,
  mascotAvatar5, mascotAvatar6, mascotAvatar7, mascotAvatar8,
];

const BOT_AVATARS: string[] = [
  botAvatar1, botAvatar2, botAvatar3, botAvatar4, botAvatar5,
  botAvatar6, botAvatar7, botAvatar8, botAvatar9, botAvatar10,
];

/**
 * A preset face for an AI player, picked from its id so the same bot keeps
 * the same face everywhere it appears — lobby seat, captain pill, match.
 */
export function botAvatarFor(seed: string | null | undefined): string {
  const key = seed || '';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return BOT_AVATARS[Math.abs(hash) % BOT_AVATARS.length];
}

/**
 * The avatar to show for someone who has not set one.
 *
 * This used to be api.dicebear.com, seeded by user id — a third-party
 * request, on every render, for a flat cartoon face that looks nothing like
 * anything else in the app. 84 of 656 accounts have no avatar_url, so it was
 * not a rare edge: it was one player in eight wearing a stranger's art style.
 *
 * One of the eight mascots instead, picked from the id so the same person
 * keeps the same face everywhere — the property that made the seeded URL
 * worth using in the first place. Bundled, so it also works offline and
 * costs no network round trip.
 */
export function fallbackAvatarFor(seed: string | null | undefined): string {
  const key = seed || '';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return MASCOT_AVATARS[Math.abs(hash) % MASCOT_AVATARS.length];
}

/**
 * Checks if an avatar URL is likely valid
 */
export function isValidAvatarUrl(avatarUrl: string | null | undefined): boolean {
  if (!avatarUrl) return false;
  return (
    avatarUrl.startsWith('http://') ||
    avatarUrl.startsWith('https://') ||
    avatarUrl.startsWith('data:')
  );
}
