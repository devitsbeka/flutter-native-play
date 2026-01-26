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
import botAvatar10 from '@/assets/avatars/bot-avatar-10.png';

// Known local asset avatar patterns that need special handling
const LOCAL_ASSET_PATTERN = /^\/src\/assets\//;
const RELATIVE_ASSET_PATTERN = /^src\/assets\//;

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
