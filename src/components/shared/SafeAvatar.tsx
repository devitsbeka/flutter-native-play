import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/utils/avatarUtils';
import { cn } from '@/lib/utils';

interface SafeAvatarProps {
  avatarUrl?: string | null;
  fallback: string;
  className?: string;
  fallbackClassName?: string;
}

/**
 * SafeAvatar - A robust avatar component that handles:
 * - Local asset paths (e.g., /src/assets/avatars/...)
 * - Broken/expired URLs
 * - Null/undefined values
 * 
 * Always shows a fallback when image fails to load.
 */
export const SafeAvatar: React.FC<SafeAvatarProps> = ({
  avatarUrl,
  fallback,
  className,
  fallbackClassName,
}) => {
  const [hasError, setHasError] = useState(false);
  
  // Resolve the avatar URL (handles local asset paths)
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  
  // If URL resolution failed or there was a load error, show fallback immediately
  const showFallback = !resolvedUrl || hasError;

  return (
    <Avatar className={className}>
      {!showFallback && (
        <AvatarImage
          src={resolvedUrl}
          onError={() => setHasError(true)}
        />
      )}
      <AvatarFallback className={cn("bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold", fallbackClassName)}>
        {fallback.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

/**
 * Simple inline avatar with proper error handling
 * For use in raw img tag situations
 */
interface SafeAvatarImageProps {
  avatarUrl?: string | null;
  fallback: string;
  className?: string;
  containerClassName?: string;
}

export const SafeAvatarImage: React.FC<SafeAvatarImageProps> = ({
  avatarUrl,
  fallback,
  className = "w-full h-full object-cover",
  containerClassName,
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  
  if (!resolvedUrl || hasError) {
    return (
      <div className={cn("bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center", containerClassName)}>
        <span className="text-white font-bold">
          {fallback.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt=""
      className={className}
      onError={() => setHasError(true)}
    />
  );
};
