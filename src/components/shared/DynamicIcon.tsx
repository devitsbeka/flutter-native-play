import * as React from "react";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import { useIconLibrary } from "@/hooks/useIconLibrary";

interface DynamicIconProps {
  categoryId?: string; // ASCII category_id from database - fallback lookup
  slug?: string; // Direct icon slug (highest priority) - from icon_slug column
  questionId?: string; // Question ID for unique fallback icons per question
  seedText?: string; // Deterministic seed text (e.g., question text) - ensures same icon across all clients
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
  questionId,
  seedText,
  size = 128,
  className,
  hideIfEmpty = false,
  fallbackEmoji
}: DynamicIconProps) {
  const [imageError, setImageError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [asyncIconUrl, setAsyncIconUrl] = React.useState<string | null>(null);
  const [isResolvingIcon, setIsResolvingIcon] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const maxRetries = 2;

  // The direct path: a slug names its file.
  //
  // Every one of the 9,002 icons in the shipped index is stored as
  // `<slug>.png`, so a card that arrives with a slug does not need the
  // 1.3 MB catalogue to know where its icon is — and it used to wait for
  // exactly that. Discover mounts sixty cards at once; each drew a blank
  // until the whole catalogue had downloaded and been parsed, then sixty
  // icons were requested in one burst (owner: "why do category icons need
  // that much time, empty cards while scrolling"). Now the icon is asked
  // for the moment the card mounts. The catalogue is consulted only if
  // storage refuses the direct name — a slug the library does not carry,
  // or one uploaded under another file name — and the lookup below then
  // proceeds exactly as before.
  const directSlug = React.useMemo(() => {
    const first = slug ? (slug.includes(',') ? slug.split(',')[0].trim() : slug.trim()) : '';
    return /^[a-z0-9][a-z0-9_-]*$/i.test(first) ? first : null;
  }, [slug]);
  const [directFailed, setDirectFailed] = React.useState(false);
  // Its own loaded flag, not the shared one below: that one is reset when
  // the catalogue arrives (isLoaded flips), and an image that had already
  // loaded would fade out and never fade back — onLoad does not fire twice.
  const [directLoaded, setDirectLoaded] = React.useState(false);
  const directUrl =
    directSlug && !directFailed ? `${ICON_STORAGE_URL}/${directSlug}.png` : null;
  
  const { findIcon, getIconBySlug, fetchIconBySlug, getIconForCategory, getRandomIconForCategory, isLoaded } = useIconLibrary();

  // Use stable seed based on seedText (question text - same across all clients), then questionId, slug, categoryId
  // This ensures each question gets a DIFFERENT fallback icon and it's CONSISTENT across all players
  const stableSeed = React.useMemo(() => {
    const seedSource = seedText || questionId || slug || categoryId || '';
    return seedSource ? hashString(seedSource) : 0;
  }, [seedText, questionId, slug, categoryId]);

  // Resolve icon URL using the icon library - but DON'T use random fallback if we have a slug
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
      
      // If we have a slug but no match yet, DON'T use random fallback - wait for async lookup
      return null;
    } else if (categoryId) {
      // No slug provided - try findIcon with empty keywords to trigger category fallback
      const match = findIcon([], categoryId);
      if (match && shouldRetryUrl(match.iconUrl)) {
        return match.iconUrl;
      }
    }

    // Priority 2: Try category-based lookup (only when no slug provided)
    if (categoryId && !slug) {
      const categoryUrl = getIconForCategory(categoryId);
      if (categoryUrl && shouldRetryUrl(categoryUrl)) {
        return categoryUrl;
      }
    }
    
    // Priority 3: Random icon from category as final fallback
    // ONLY use random fallback when:
    // 1. No explicit slug was provided
    // 2. hideIfEmpty is false (caller wants some icon to show)
    // 3. A categoryId is available (otherwise random general icons are irrelevant)
    if (!slug && !hideIfEmpty && categoryId) {
      const fallbackUrl = getRandomIconForCategory(categoryId, stableSeed);
      if (fallbackUrl && shouldRetryUrl(fallbackUrl)) {
        return fallbackUrl;
      }
    }

    return null;
  }, [slug, categoryId, isLoaded, stableSeed, hideIfEmpty, findIcon, getIconBySlug, getIconForCategory, getRandomIconForCategory]);

  // A new slug gets its own direct attempt.
  React.useEffect(() => {
    setDirectFailed(false);
    setDirectLoaded(false);
  }, [directSlug]);

  // Reset error when URL changes or slug changes
  React.useEffect(() => {
    setImageError(false);
    setRetryCount(0);
    setAsyncIconUrl(null);
    setImageLoaded(false);
    // If we have a slug but no immediate match, we're resolving
    if (slug && isLoaded && !iconUrl) {
      setIsResolvingIcon(true);
    } else {
      setIsResolvingIcon(false);
    }
  }, [iconUrl, slug, isLoaded]);

  // Async fallback: if iconUrl doesn't match the requested slug, try direct DB lookup
  React.useEffect(() => {
    // Not while the direct name is still standing: the database is the
    // last resort, after storage has refused the slug's own file.
    if (directUrl) return;
    if (slug && isLoaded) {
      const slugs = slug.includes(',') ? slug.split(',').map(s => s.trim()) : [slug];
      const firstSlug = slugs[0];
      
      // Check if current iconUrl is a fallback (doesn't contain the requested slug)
      const isUsingFallback = iconUrl && !iconUrl.includes(firstSlug);
      
      if (!iconUrl || isUsingFallback) {
        setIsResolvingIcon(true);
        fetchIconBySlug(firstSlug).then(url => {
          if (url) {
            console.log(`[DynamicIcon] Found icon via async DB lookup: ${firstSlug}`);
            setAsyncIconUrl(url);
          }
          setIsResolvingIcon(false);
        }).catch(() => {
          setIsResolvingIcon(false);
        });
      }
    }
  }, [iconUrl, slug, isLoaded, fetchIconBySlug, directUrl]);

  // The direct name, before any of the gates below: no catalogue, no
  // skeleton, the image element the moment there is a slug to name it.
  if (directUrl) {
    return (
      <img
        src={directUrl}
        alt="Category icon"
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        onLoad={() => setDirectLoaded(true)}
        onError={() => {
          setDirectLoaded(false);
          setDirectFailed(true);
        }}
        className={cn(
          "object-contain transition-opacity duration-200",
          directLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        style={{
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
        }}
      />
    );
  }

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

  // Show skeleton while loading icons library or resolving specific icon
  if (!isLoaded || (isResolvingIcon && !asyncIconUrl)) {
    if (hideIfEmpty) {
      return null;
    }
    return (
      <div 
        className={cn("animate-pulse rounded-xl bg-white/20", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // Use async URL if available, otherwise use the resolved iconUrl
  const finalIconUrl = asyncIconUrl || iconUrl;

  // Show fallback icon if no URL or image error
  if (!finalIconUrl || imageError) {
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
    <img
      src={finalIconUrl}
      alt="Category icon"
      width={size}
      height={size}
      loading="eager"
      onLoad={() => setImageLoaded(true)}
      onError={handleImageError}
      className={cn(
        "object-contain transition-opacity duration-200",
        imageLoaded ? "opacity-100" : "opacity-0",
        className
      )}
      style={{ 
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
      }}
    />
  );
}
