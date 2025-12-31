import * as React from "react";
import { motion } from "framer-motion";
import { getCachedCategoryIcon, preloadCategoryIcons } from "@/hooks/useCategoryIconResolver";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

interface DynamicIconProps {
  categoryId?: string; // ASCII category_id from database - fallback lookup
  slug?: string; // Direct icon slug (highest priority) - from icon_slug column
  size?: number;
  className?: string;
}

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';

// Track failed icons to avoid retrying
const failedIconUrls = new Set<string>();

export function DynamicIcon({ 
  categoryId,
  slug,
  size = 64,
  className 
}: DynamicIconProps) {
  const [iconUrl, setIconUrl] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function resolveIcon() {
      setIsLoading(true);
      setImageError(false);

      // Priority 1: Direct slug (from database icon_slug column)
      if (slug) {
        const directUrl = `${ICON_STORAGE_URL}/${slug}.png`;
        if (!failedIconUrls.has(directUrl)) {
          if (!cancelled) {
            setIconUrl(directUrl);
            setIsLoading(false);
          }
          return;
        }
      }

      // Priority 2: Try cached category icon (from keyword resolver)
      if (categoryId) {
        const cachedUrl = getCachedCategoryIcon(categoryId);
        if (cachedUrl && !failedIconUrls.has(cachedUrl)) {
          if (!cancelled) {
            setIconUrl(cachedUrl);
            setIsLoading(false);
          }
          return;
        }

        // If not cached, try to preload just this category
        const resolved = await preloadCategoryIcons([categoryId]);
        if (resolved[categoryId] && !failedIconUrls.has(resolved[categoryId])) {
          if (!cancelled) {
            setIconUrl(resolved[categoryId]);
            setIsLoading(false);
          }
          return;
        }
      }

      // No icon found
      if (!cancelled) {
        setIconUrl(null);
        setIsLoading(false);
      }
    }

    resolveIcon();

    return () => {
      cancelled = true;
    };
  }, [categoryId, slug]);

  const handleImageError = React.useCallback(() => {
    if (iconUrl) {
      failedIconUrls.add(iconUrl);
    }
    setImageError(true);
  }, [iconUrl]);

  // Show placeholder if loading, no icon, or error
  if (isLoading || !iconUrl || imageError) {
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
      key={iconUrl}
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
