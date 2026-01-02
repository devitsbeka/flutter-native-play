import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import { useIconLibrary } from "@/hooks/useIconLibrary";

interface DynamicIconProps {
  categoryId?: string; // ASCII category_id from database - fallback lookup
  slug?: string; // Direct icon slug (highest priority) - from icon_slug column
  size?: number;
  className?: string;
  hideIfEmpty?: boolean; // Don't render anything if no icon found
  fallbackEmoji?: string; // Emoji to show when icon fails to load
}

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';

// Track failed icons with timestamps to allow retry after 30 seconds
const failedIconUrls = new Map<string, number>();
const RETRY_DELAY_MS = 30000;

// Stable hash function for consistent random seeds
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Check if URL should be retried (failed but retry delay passed)
function shouldRetryUrl(url: string): boolean {
  const failedAt = failedIconUrls.get(url);
  if (!failedAt) return true;
  return Date.now() - failedAt > RETRY_DELAY_MS;
}

export function DynamicIcon({ 
  categoryId,
  slug,
  size = 128,
  className,
  hideIfEmpty = false,
  fallbackEmoji
}: DynamicIconProps) {
  const [imageError, setImageError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const maxRetries = 2;
  
  const { findIcon, getIconBySlug, getIconForCategory, getRandomIconForCategory, isLoaded } = useIconLibrary();

  // Use stable seed based on categoryId for consistent fallback icons
  const stableSeed = React.useMemo(() => {
    return categoryId ? hashString(categoryId) : 0;
  }, [categoryId]);

  // Resolve icon URL using the icon library
  const iconUrl = React.useMemo(() => {
    if (!isLoaded) return null;

    // Priority 1: Search by slug keyword in icon library
    if (slug) {
      // Parse slug - could be a single slug or comma-separated AI slugs
      const slugs = slug.includes(',') ? slug.split(',').map(s => s.trim()) : [slug];
      
      // Try each slug in order of priority
      for (const s of slugs) {
        // Try exact slug match first
        const exactUrl = getIconBySlug(s);
        if (exactUrl && shouldRetryUrl(exactUrl)) {
          return exactUrl;
        }
      }
      
      // Try searching by slugs as keywords, passing categoryId for fallback
      const match = findIcon(slugs, categoryId);
      if (match && shouldRetryUrl(match.iconUrl)) {
        return match.iconUrl;
      }
    } else if (categoryId) {
      // No slug provided - try findIcon with empty keywords to trigger category fallback
      const match = findIcon([], categoryId);
      if (match && shouldRetryUrl(match.iconUrl)) {
        return match.iconUrl;
      }
    }

    // Priority 2: Try category-based lookup
    if (categoryId) {
      const categoryUrl = getIconForCategory(categoryId);
      if (categoryUrl && shouldRetryUrl(categoryUrl)) {
        return categoryUrl;
      }
    }
    
    // Priority 3: Random icon from category as final fallback (with stable seed)
    const fallbackUrl = getRandomIconForCategory(categoryId || 'general', stableSeed);
    if (fallbackUrl && shouldRetryUrl(fallbackUrl)) {
      return fallbackUrl;
    }

    return null;
  }, [slug, categoryId, isLoaded, stableSeed, findIcon, getIconBySlug, getIconForCategory, getRandomIconForCategory]);

  // Reset error when URL changes
  React.useEffect(() => {
    setImageError(false);
    setRetryCount(0);
  }, [iconUrl]);

  const handleImageError = React.useCallback(() => {
    if (retryCount < maxRetries) {
      // Retry by incrementing count (triggers re-render with same URL)
      setRetryCount(prev => prev + 1);
    } else {
      // After max retries, mark as failed with timestamp
      if (iconUrl) {
        failedIconUrls.set(iconUrl, Date.now());
      }
      setImageError(true);
    }
  }, [iconUrl, retryCount]);

  // Show skeleton while loading
  if (!isLoaded) {
    return (
      <div 
        className={cn("animate-pulse rounded-xl bg-white/20", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // Show fallback icon if no URL or image error
  if (!iconUrl || imageError) {
    if (hideIfEmpty) {
      return null;
    }
    // Use emoji fallback if provided, otherwise show question mark icon
    if (fallbackEmoji) {
      return (
        <div 
          className={cn("flex items-center justify-center", className)}
          style={{ width: size, height: size }}
        >
          <span style={{ fontSize: size * 0.6 }}>{fallbackEmoji}</span>
        </div>
      );
    }
    return (
      <div 
        className={cn("flex items-center justify-center rounded-xl bg-white/20", className)}
        style={{ width: size, height: size }}
      >
        <HelpCircle 
          className="text-white/60"
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
      </div>
    );
  }

  return (
    <motion.img
      key={`${iconUrl}-${retryCount}`} // Force new img element on retry
      src={iconUrl}
      alt="Category icon"
      width={size}
      height={size}
      loading="eager"
      onError={handleImageError}
      className={cn("object-contain", className)}
      style={{ 
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    />
  );
}
